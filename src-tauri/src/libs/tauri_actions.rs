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
