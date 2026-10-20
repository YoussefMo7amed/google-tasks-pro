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
        let mut scheduled = self.scheduled.lock().unwrap();

        for notification in scheduled.values_mut() {
            if !notification.shown && notification.notify_at <= now {
                println!(
                    "[NotificationScheduler] 🔔 Firing notification for '{}': {}",
                    notification.title, notification.body
                );

                // Show OS notification via Tauri
                let _ = tauri::api::notification::Notification::new(
                    &app.config().tauri.bundle.identifier,
                )
                .title(&notification.title)
                .body(&notification.body)
                .show();

                // On macOS, osascript guarantees banner and chime sound even in `tauri dev`
                #[cfg(target_os = "macos")]
                {
                    let script = format!(
                        "display notification \"{}\" with title \"{}\" sound name \"default\"",
                        notification.body.replace('\\', "\\\\").replace('"', "\\\""),
                        notification.title.replace('\\', "\\\\").replace('"', "\\\"")
                    );
                    let _ = std::process::Command::new("osascript")
                        .arg("-e")
                        .arg(script)
                        .spawn();
                }

                notification.shown = true;
            }
        }

        // Remove shown notifications
        scheduled.retain(|_, n| !n.shown);
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
