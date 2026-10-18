use std::io::Write;
use lazy_static::lazy_static;
use tauri::api::path::local_data_dir;

pub const ENV_FILE: &str = "../.env.local";

#[allow(dead_code)]
pub const USERS_FILES: [&str; 4] = ["access_token.db", "auth_code.db", "tasks.json", "user_profile.json"];

#[allow(dead_code)]
pub fn initialize_user_files() {
    for file in USERS_FILES.iter() {
        let file_path = get_app_local_data_dir(file);
        println!("file path: {}", file_path);
    }
}

pub fn get_app_local_data_dir(file_name: &str) -> String {
    let base = local_data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let dir = base.join("codad5.google.task");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    let path = dir.join(file_name);
    let path_str = path.to_str().unwrap().to_string();
    println!("path: {} \n file name: {} \n", path_str, file_name);
    // check if file exists
    if !path.exists() {
        println!("File does not exist, creating file {} for {}", file_name, path_str);
        if let Ok(mut file) = std::fs::File::create(&path) {
            if file_name.ends_with(".json") {
                println!("writing empty json");
                let _ = file.write_all(b"{}");
            }
        }
    }
    path_str
}

pub fn resolve_access_token_file() -> String {
    let access_token_file: String = get_app_local_data_dir("access_token.db");
    println!("access token path: {}", access_token_file);
    access_token_file
}

pub fn resolve_auth_code_file() -> String {
    let auth_code_file: String = get_app_local_data_dir("auth_code.db");
    println!("auth code path: {}", auth_code_file);
    auth_code_file
}


lazy_static! {
    pub static ref ACCESS_TOKEN_FILE: String = resolve_access_token_file();
    pub static ref AUTH_CODE_FILE: String = resolve_auth_code_file();
}

