// super mod imports;
use super::auth::{AccessToken, Auth};
use super::filehelper::AppPaths;
use super::response::{GreetResponse, SaveAccessTokenResponse, SaveTokenResponse};

#[tauri::command]
pub fn greet(name: String) -> GreetResponse {
    GreetResponse {
        message: format!("Hello, {}! You've been greeted from Rust!", name),
    }
}

// remember to call `.manage(MyState::default())`
#[tauri::command]
pub fn save_access_token(
    paths: tauri::State<'_, AppPaths>,
    token: String,
) -> SaveAccessTokenResponse {
    Auth::save_access_token(&paths.access_token_file, token)
}

// a command to load the access token from the file
#[tauri::command]
pub fn load_access_token(paths: tauri::State<'_, AppPaths>) -> AccessToken {
    Auth::load_access_token(&paths.access_token_file)
}

#[tauri::command]
pub fn save_code(paths: tauri::State<'_, AppPaths>, code: String) -> SaveTokenResponse {
    Auth::save_auth_code(&paths.auth_code_file, code)
}

#[tauri::command]
pub fn load_code(paths: tauri::State<'_, AppPaths>) -> String {
    Auth::load_auth_code(&paths.auth_code_file)
}

#[tauri::command]
pub fn bring_to_front(window: tauri::WebviewWindow) {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

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

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = window;
    }
}

#[tauri::command]
pub fn open_external_browser(app: tauri::AppHandle, url: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let chooser_result = (|| -> Result<(), Box<dyn std::error::Error>> {
            let ctx = ndk_context::android_context();
            let vm = unsafe { jni::JavaVM::from_raw(ctx.vm().cast()) }?;
            let mut env = vm.attach_current_thread()?;
            let main_class = env.find_class("com/youssefmohamed/googletaskspro/MainActivity")?;
            let j_url = env.new_string(&url)?;
            env.call_static_method(
                main_class,
                "openChooser",
                "(Ljava/lang/String;)V",
                &[jni::objects::JValue::Object(&j_url)],
            )?;
            Ok(())
        })();

        if chooser_result.is_err() {
            use tauri_plugin_shell::ShellExt;
            #[allow(deprecated)]
            return app.shell().open(&url, None).map_err(|e| e.to_string());
        }

        Ok(())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = &app;
        open::that_detached(&url).map_err(|e| e.to_string())
    }
}
