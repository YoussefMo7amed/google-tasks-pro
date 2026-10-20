/**
 * Notification Service
 * 
 * Schedules OS notifications for tasks with due dates.
 * Uses Tauri commands to communicate with Rust backend.
 * 
 * NOTE: Google Tasks API only supports due DATES, not times.
 * Notifications are triggered at the user-configured hour on the due date.
 */

import { invoke } from '@tauri-apps/api/tauri';
import { isPermissionGranted, requestPermission } from '@tauri-apps/api/notification';
import { AppTask } from '../types/app';
import { getNotificationHour } from './settings.service';

/**
 * Track scheduled task IDs to prevent duplicates
 */
const scheduledTaskIds = new Set<string>();

/**
 * Ensure OS notification permission is granted
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
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
 * Schedule a notification for a task
 * Schedules for the configured hour on the due date
 */
export async function scheduleTaskNotification(task: AppTask): Promise<boolean> {
  // Skip if no due date or already completed
  if (!task.due || task.status === 'completed') {
    return false;
  }

  // Ensure OS notification permission is requested
  await ensureNotificationPermission();

  // Cancel existing first (handles updates)
  if (scheduledTaskIds.has(task.id)) {
    await cancelTaskNotification(task.id);
  }

  // Get user's preferred notification hour
  const notifyHour = await getNotificationHour();

  // Extract calendar date (YYYY-MM-DD) cleanly to avoid UTC timezone day-shifting
  const dueStr = typeof task.due === "string" ? task.due : (task.due as Date).toISOString();
  const dateMatch = dueStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const notifyAt = new Date();
  if (dateMatch) {
    const y = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    const d = parseInt(dateMatch[3], 10);
    notifyAt.setFullYear(y, m - 1, d);
  } else {
    const parsed = new Date(task.due);
    notifyAt.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

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

  // Don't schedule if already past notification time
  if (notifyAt <= new Date()) {
    console.debug(`Skipping notification for ${task.id}: already past due (${notifyAt.toISOString()})`);
    return false;
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
  const eligibleTasks = tasks.filter(t => 
    t.due && 
    t.status !== 'completed' &&
    new Date(t.due) >= new Date()
  );

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
