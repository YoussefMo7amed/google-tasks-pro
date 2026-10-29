/**
 * Notification Service
 * 
 * Schedules OS notifications for tasks with due dates.
 * Uses Tauri commands to communicate with Rust backend.
 * 
 * NOTE: Google Tasks API only supports due DATES, not times.
 * Notifications are triggered at the user-configured hour on the due date.
 */

import { invoke } from '@tauri-apps/api/core';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  Schedule,
  cancel as cancelPluginNotifications,
  cancelAll as cancelAllPluginNotifications,
  createChannel,
  Importance,
  Visibility,
} from '@tauri-apps/plugin-notification';
import { getPlatform, isMobile } from '../helpers/platform';
import { AppTask } from '../types/app';
import { getNotificationHour } from './settings.service';

/**
 * Track scheduled task IDs to prevent duplicates
 */
const scheduledTaskIds = new Set<string>();

const MOBILE_CHANNEL_ID = 'task-reminders';
let channelInitialized = false;

export function hashTaskIdToNotificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash * 31 + taskId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647 || 1;
}

async function ensureMobileNotificationChannel(): Promise<void> {
  if (channelInitialized || getPlatform() !== 'android') return;
  try {
    await createChannel({
      id: MOBILE_CHANNEL_ID,
      name: 'Task Reminders',
      description: 'Notifications for upcoming and due tasks',
      importance: Importance.High,
      visibility: Visibility.Public,
      vibration: true,
      lights: true,
    });
    channelInitialized = true;
  } catch (err) {
    // Android 7.0/7.1 (API 24-25) does not use notification channels; ignore gracefully
    console.debug('Notification channel creation skipped or unsupported on this Android API level:', err);
    channelInitialized = true;
  }
}

/**
 * Ensure OS notification permission is granted
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    await ensureMobileNotificationChannel();
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    return granted;
  } catch (err) {
    console.warn("Could not verify notification permission:", err);
    return false;
  }
}

/**
 * Parse calendar date (YYYY-MM-DD) from either ISO RFC3339 string or date string.
 * Returns local calendar parts: { year, month (0-11), day (1-31) }
 */
export function parseDueDateParts(due: string | Date): { year: number; month: number; day: number } | null {
  if (!due) return null;
  const dueStr = typeof due === "string" ? due : due.toISOString();
  // Extract YYYY-MM-DD prefix from string
  const match = dueStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1,
      day: parseInt(match[3], 10),
    };
  }
  const parsed = new Date(due);
  if (isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
  };
}

/**
 * Schedule a notification for a task
 * Schedules for the configured hour on the due date
 */
export async function scheduleTaskNotification(task: AppTask): Promise<boolean> {
  // Skip if no due date or already completed
  if (!task.due || task.status === 'completed') {
    return false;
  }

  const parts = parseDueDateParts(task.due);
  if (!parts) {
    return false;
  }

  // Ensure OS notification permission is requested
  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  // Cancel existing first (handles updates)
  if (scheduledTaskIds.has(task.id)) {
    await cancelTaskNotification(task.id);
  }

  // Get user's preferred notification hour
  const notifyHour = await getNotificationHour();

  // Parse calendar date accurately in local timezone
  const notifyAt = new Date();
  notifyAt.setFullYear(parts.year, parts.month, parts.day);

  // Set notification for configured hour or exact time on the due date
  if (task.exactTime) {
    const [h, m] = task.exactTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      notifyAt.setHours(h, m, 0, 0);
    } else {
      notifyAt.setHours(notifyHour, 0, 0, 0);
    }
  } else {
    notifyAt.setHours(notifyHour, 0, 0, 0);
  }

  // Only skip if more than 60 seconds in the past (to allow scheduling tasks for current minute)
  if (notifyAt.getTime() < Date.now() - 60000) {
    console.debug(`Skipping notification for ${task.id}: already past due (${notifyAt.toLocaleString()})`);
    return false;
  }

  if (isMobile()) {
    const notifId = hashTaskIdToNotificationId(task.id);
    const title = `📋 ${task.title}`;
    const body = task.exactTime ? `Due today at ${task.exactTime}` : 'Due today';

    if (notifyAt.getTime() <= Date.now() + 5000) {
      try {
        sendNotification({
          id: notifId,
          channelId: MOBILE_CHANNEL_ID,
          title,
          body,
        });
      } catch (err) {
        console.warn('Failed to send immediate mobile notification:', err);
      }
    } else {
      try {
        sendNotification({
          id: notifId,
          channelId: MOBILE_CHANNEL_ID,
          title,
          body,
          schedule: Schedule.at(notifyAt, false, true),
        });
      } catch {
        sendNotification({
          id: notifId,
          channelId: MOBILE_CHANNEL_ID,
          title,
          body,
          schedule: Schedule.at(notifyAt, false, false),
        });
      }
    }
  }

  try {
    await invoke('schedule_notification', {
      taskId: task.id,
      title: `📋 ${task.title}`,
      body: task.exactTime ? `Due today at ${task.exactTime}` : `Due today`,
      notifyAtIso: notifyAt.toISOString(),
    });
    
    scheduledTaskIds.add(task.id);
    console.debug(`Scheduled notification for "${task.title}" at ${notifyAt.toLocaleString()}`);
    return true;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return false;
  }
}

/**
 * Cancel a scheduled notification for a task
 */
export async function cancelTaskNotification(taskId: string): Promise<void> {
  if (isMobile()) {
    await cancelPluginNotifications([hashTaskIdToNotificationId(taskId)]).catch(() => {});
  }

  if (!scheduledTaskIds.has(taskId)) {
    return; // Not scheduled, nothing to cancel
  }

  try {
    await invoke('cancel_notification', { taskId });
    scheduledTaskIds.delete(taskId);
    console.debug(`Cancelled notification for task ${taskId}`);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

/**
 * Cancel ALL scheduled notifications (called on logout)
 */
export async function cancelAllNotifications(): Promise<void> {
  console.debug(`Cancelling ${scheduledTaskIds.size} notifications`);
  
  if (isMobile()) {
    await cancelAllPluginNotifications().catch(() => {});
  }

  for (const taskId of scheduledTaskIds) {
    try {
      await invoke('cancel_notification', { taskId });
    } catch (error) {
      console.error(`Failed to cancel notification for ${taskId}:`, error);
    }
  }
  
  scheduledTaskIds.clear();
}

/**
 * Schedule notifications for all tasks with due dates
 * Called on initial load / data refresh
 */
export async function scheduleAllTaskNotifications(tasks: AppTask[]): Promise<number> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Filter tasks whose calendar due date is today or in the future
  const eligibleTasks = tasks.filter(t => {
    if (!t.due || t.status === 'completed') return false;
    const parts = parseDueDateParts(t.due);
    if (!parts) return false;
    const taskDayTime = new Date(parts.year, parts.month, parts.day).getTime();
    return taskDayTime >= todayStart;
  });

  // Ensure notification permission once for the entire batch
  await ensureNotificationPermission();

  let scheduled = 0;
  for (const task of eligibleTasks) {
    // Only invoke Tauri IPC if not already scheduled
    if (!scheduledTaskIds.has(task.id)) {
      const success = await scheduleTaskNotification(task);
      if (success) scheduled++;
    }
  }

  console.debug(`Scheduled ${scheduled}/${eligibleTasks.length} task notifications`);
  return scheduled;
}

/**
 * Reschedule ALL notifications (called when notification hour changes)
 */
export async function rescheduleAllNotifications(tasks: AppTask[]): Promise<number> {
  await cancelAllNotifications();
  return scheduleAllTaskNotifications(tasks);
}

/**
 * Get count of currently scheduled notifications (for debugging)
 */
export function getScheduledCount(): number {
  return scheduledTaskIds.size;
}
