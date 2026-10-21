// Task Due Time Notification Scheduler
//
// This module handles scheduling and displaying OS notifications
// for tasks with due dates.

use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::AppHandle;

/// A scheduled notification waiting to be shown
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ScheduledNotification {
    pub task_id: String,
    pub title: String,
    pub body: String,
    pub notify_at: DateTime<Utc>,
    pub shown: bool,
}

/// Manages all scheduled notifications
pub struct NotificationScheduler {
    scheduled: Mutex<HashMap<String, ScheduledNotification>>,
}

impl Default for NotificationScheduler {
    fn default() -> Self {
        Self {
            scheduled: Mutex::new(HashMap::new()),
        }
    }
}

impl NotificationScheduler {
    /// Schedule a notification for a task
    pub fn schedule(&self, task_id: String, title: String, body: String, notify_at: DateTime<Utc>) {
        let notification = ScheduledNotification {
            task_id: task_id.clone(),
            title,
            body,
            notify_at,
            shown: false,
        };

        let mut scheduled = self.scheduled.lock().unwrap();
        scheduled.insert(task_id, notification);
    }

    /// Cancel a scheduled notification
    pub fn cancel(&self, task_id: &str) {
        let mut scheduled = self.scheduled.lock().unwrap();
        scheduled.remove(task_id);
    }

    /// Check for due notifications and show them
    #[allow(dead_code)]
    pub fn check_and_notify(&self, app: &AppHandle) {
        let now = Utc::now();
        
        // 1. Collect due notifications and release mutex lock immediately
        let due_notifications: Vec<ScheduledNotification> = {
            let mut scheduled = self.scheduled.lock().unwrap();
            let mut due = Vec::new();
            for n in scheduled.values_mut() {
                if !n.shown && n.notify_at <= now {
                    n.shown = true;
                    due.push(n.clone());
                }
            }
            scheduled.retain(|_, n| !n.shown);
            due
        };

        // 2. Dispatch notifications outside the lock
        for notification in due_notifications {
            println!(
                "[NotificationScheduler] 🔔 Firing notification for '{}': {}",
                notification.title, notification.body
            );

            // Primary OS notification via Tauri
            let mut shown_via_tauri = false;
            if let Ok(()) = tauri::api::notification::Notification::new(
                &app.config().tauri.bundle.identifier,
            )
            .title(&notification.title)
            .body(&notification.body)
            .show()
            {
                shown_via_tauri = true;
            }

            // On macOS, fallback to osascript only if unbundled (e.g. in `tauri dev`), and play alert sound
            #[cfg(target_os = "macos")]
            {
                if !shown_via_tauri {
                    let clean_title = notification
                        .title
                        .replace('\\', "\\\\")
                        .replace('"', "\\\"")
                        .replace('\n', " ")
                        .replace('\r', " ");
                    let clean_body = notification
                        .body
                        .replace('\\', "\\\\")
                        .replace('"', "\\\"")
                        .replace('\n', " ")
                        .replace('\r', " ");
                    let script = format!(
                        "display notification \"{}\" with title \"{}\"",
                        clean_body, clean_title
                    );
                    let _ = std::process::Command::new("osascript")
                        .arg("-e")
                        .arg(script)
                        .spawn();
                }

                // Play macOS system chime sound directly so it's always audible
                let _ = std::process::Command::new("afplay")
                    .arg("/System/Library/Sounds/Glass.aiff")
                    .spawn();
            }
        }
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Schedule a notification for a task
#[tauri::command]
pub fn schedule_notification(
    scheduler: tauri::State<'_, NotificationScheduler>,
    task_id: String,
    title: String,
    body: String,
    notify_at_iso: String,
) -> Result<String, String> {
    let notify_at = DateTime::parse_from_rfc3339(&notify_at_iso)
        .map_err(|e| format!("Invalid date: {}", e))?
        .with_timezone(&Utc);

    println!(
        "[NotificationScheduler] ⏰ Scheduled task '{}' ({}) at UTC {}",
        title, task_id, notify_at
    );

    scheduler.schedule(task_id.clone(), title, body, notify_at);
    Ok(task_id)
}

/// Cancel a scheduled notification
#[tauri::command]
pub fn cancel_notification(
    scheduler: tauri::State<'_, NotificationScheduler>,
    task_id: String,
) -> Result<(), String> {
    scheduler.cancel(&task_id);
    Ok(())
}

/// Get count of scheduled notifications (for debugging)
#[tauri::command]
pub fn get_notification_count(scheduler: tauri::State<'_, NotificationScheduler>) -> usize {
    scheduler.scheduled.lock().unwrap().len()
}
