pub mod libs;

use libs::filehelper::{init_app_paths, ENV_FILE};
use libs::notifications::{
    cancel_notification, get_notification_count, schedule_notification, NotificationScheduler,
};
use libs::tauri_actions::{
    bring_to_front, greet, load_access_token, load_code, open_external_browser, save_access_token,
    save_code,
};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::menu::{MenuBuilder, MenuItemBuilder};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::Listener;

use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::from_filename(ENV_FILE).ok();
    dotenvy::from_filename("../.env").ok();
    dotenvy::dotenv().ok();

    // Create notification scheduler
    let notification_scheduler = NotificationScheduler::default();

    let mut builder = tauri::Builder::default();

    // On desktop, register single-instance plugin first
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!(
                "from single instance {}, {argv:?}, {cwd}",
                app.package_info().name
            );
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }));
    }

    // Register official cross-platform plugins
    builder = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .level_for("jni", tauri_plugin_log::log::LevelFilter::Error)
                .targets([
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Stdout),
                ])
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_oauth::init());

    // Register desktop-only plugins
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
            .plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }

    // Manage application state
    builder = builder.manage(notification_scheduler);

    // Setup window event handling (desktop only: close -> hide)
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent quitting, keep app running in background for notifications & system tray
                let _ = window.hide();
                api.prevent_close();
            }
        });
    }

    let app = builder
        .setup(|app| {
            // Resolve app paths and initialize files
            let app_paths = init_app_paths(app.handle())
                .expect("Failed to initialize application paths");
            app.manage(app_paths);

            let app_handle = app.handle().clone();

            // Setup tray icon, menu, and oauth listener (desktop only)
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let show_item = MenuItemBuilder::with_id("show", "Open Google Tasks").build(app)?;
                let hide_item = MenuItemBuilder::with_id("hide", "Minimize to Background").build(app)?;
                let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

                let tray_menu = MenuBuilder::new(app)
                    .item(&show_item)
                    .item(&hide_item)
                    .separator()
                    .item(&quit_item)
                    .build()?;

                let mut tray_builder = TrayIconBuilder::new()
                    .menu(&tray_menu)
                    .icon_as_template(true)
                    .on_menu_event(|app_handle, event| match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    });

                if let Some(icon) = app.default_window_icon() {
                    tray_builder = tray_builder.icon(icon.clone());
                }

                tray_builder.build(app)?;

                // Listen for oauth url events (desktop only)
                let app_handle_for_oauth = app.handle().clone();
                app.listen("oauth://url", move |_event| {
                    if let Some(w) = app_handle_for_oauth.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                        #[cfg(target_os = "macos")]
                        {
                            #[allow(deprecated)]
                            unsafe {
                                use cocoa::appkit::NSApplication;
                                let cocoa_app = cocoa::appkit::NSApp();
                                cocoa_app.activateIgnoringOtherApps_(cocoa::base::YES);
                            }
                        }
                    }
                });
            }

            // Polling scheduler across all platforms while app process is alive
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    let scheduler = app_handle.state::<NotificationScheduler>();
                    if scheduler.has_pending() {
                        scheduler.check_and_notify(&app_handle);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_access_token,
            load_access_token,
            greet,
            save_code,
            load_code,
            bring_to_front,
            open_external_browser,
            // Notification commands
            schedule_notification,
            cancel_notification,
            get_notification_count,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| match event {
        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        tauri::RunEvent::ExitRequested { api, .. } => {
            // Keep running in background for notifications & system tray
            api.prevent_exit();
        }
        _ => {}
    });
}
