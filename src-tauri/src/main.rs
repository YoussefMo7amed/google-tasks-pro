// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod libs;

#[cfg(debug_assertions)]
use specta::collect_types;
use tauri_plugin_log::LogTarget;
#[cfg(debug_assertions)]
use tauri_specta::ts;

use libs::filehelper::ENV_FILE;
use libs::notifications::{
    cancel_notification, get_notification_count, schedule_notification, NotificationScheduler,
};
use libs::tauri_actions::{
    bring_to_front, greet, load_access_token, load_code, save_access_token, save_code,
};
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

fn run_specta() {
    println!("Running specta to generate typescript bindings");

    #[cfg(debug_assertions)]
    ts::export(
        collect_types![
            save_access_token,
            load_access_token,
            greet,
            save_code,
            load_code,
            bring_to_front,
        ],
        "../src/helpers/commands.ts",
    )
    .expect("Failed to export typescript bindings");
}

fn main() {
    dotenv::from_filename(ENV_FILE).ok();
    dotenv::from_filename("../.env").ok();
    dotenv::dotenv().ok();
    run_specta();

    // Create notification scheduler
    let notification_scheduler = NotificationScheduler::default();

    // Create system tray with menu
    let show_item = CustomMenuItem::new("show".to_string(), "Open Google Tasks");
    let hide_item = CustomMenuItem::new("hide".to_string(), "Minimize to Background");
    let quit_item = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show_item)
        .add_item(hide_item)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit_item);
    let system_tray = SystemTray::new().with_menu(tray_menu);

    let app = tauri::Builder::default()
        .manage(notification_scheduler)
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                if let Some(window) = app.get_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "hide" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.hide();
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // Prevent quitting, keep app running in background for notifications & system tray
                let _ = event.window().hide();
                api.prevent_close();
            }
            _ => {}
        })
        .setup(|app| {
            let app_handle = app.handle();
            let app_handle_for_oauth = app.handle();

            app.listen_global("oauth://url", move |_event| {
                if let Some(w) = app_handle_for_oauth.get_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                    #[cfg(target_os = "macos")]
                    {
                        #[allow(deprecated)]
                        unsafe {
                            use cocoa::appkit::NSApplication;
                            let app = cocoa::appkit::NSApp();
                            app.activateIgnoringOtherApps_(cocoa::base::YES);
                        }
                    }
                }
            });

            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    let scheduler = app_handle.state::<NotificationScheduler>();
                    scheduler.check_and_notify(&app_handle);
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!(
                "from single instance {}, {argv:?}, {cwd}",
                app.package_info().name
            );
            if let Some(w) = app.get_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_context_menu::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_oauth::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([LogTarget::LogDir, LogTarget::Stdout, LogTarget::Webview])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            save_access_token,
            load_access_token,
            greet,
            save_code,
            load_code,
            bring_to_front,
            // Notification commands
            schedule_notification,
            cancel_notification,
            get_notification_count,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            // Keep running in background for notifications & system tray
            api.prevent_exit();
        }
        _ => {}
    });
}
