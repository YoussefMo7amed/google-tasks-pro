use tauri;

// super mod imports;
use super::auth::{AccessToken, Auth};
use super::filehelper::ENV_FILE;
use super::response::{SaveAccessTokenResponse, SaveTokenResponse, GreetResponse};



#[tauri::command]
#[specta::specta]
pub fn greet(name: String) -> GreetResponse {
    return GreetResponse {
        message: format!("Hello, {}! You've been greeted from Rust!", name),
    };
}

// remember to call `.manage(MyState::default())`
#[tauri::command]
#[specta::specta]
pub fn save_access_token(token: String) -> SaveAccessTokenResponse {
    dotenv::from_filename(ENV_FILE).ok();
    return Auth::save_access_token(token);
}

// a command to load the access token from the file
#[tauri::command]
#[specta::specta]
pub fn load_access_token() -> AccessToken {
    dotenv::from_filename(ENV_FILE).ok();
    return Auth::load_access_token();
}


#[tauri::command]
#[specta::specta]
pub fn save_code(code: String) -> SaveTokenResponse {
    dotenv::from_filename(ENV_FILE).ok();
    return Auth::save_auth_code(code);
}

#[tauri::command]
#[specta::specta]
pub fn load_code() -> String {
    dotenv::from_filename(ENV_FILE).ok();
    return Auth::load_auth_code();
}

#[tauri::command]
#[specta::specta]
pub fn bring_to_front(window: tauri::Window) {
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