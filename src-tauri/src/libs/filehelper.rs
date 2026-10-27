use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub const ENV_FILE: &str = "../.env.local";

#[allow(dead_code)]
pub const USERS_FILES: [&str; 4] = ["access_token.db", "auth_code.db", "tasks.json", "user_profile.json"];

#[derive(Debug, Clone)]
pub struct AppPaths {
    pub local_data_dir: PathBuf,
    pub access_token_file: PathBuf,
    pub auth_code_file: PathBuf,
}

pub fn init_app_paths(app: &AppHandle) -> Result<AppPaths, Box<dyn std::error::Error>> {
    let local_data_dir = app.path().app_local_data_dir()?;
    if !local_data_dir.exists() {
        let _ = std::fs::create_dir_all(&local_data_dir);
    }

    for file_name in USERS_FILES.iter() {
        let path = local_data_dir.join(file_name);
        println!("path: {:?} \n file name: {} \n", path, file_name);
        // check if file exists
        if !path.exists() {
            println!("File does not exist, creating file {} for {:?}", file_name, path);
            if let Ok(mut file) = std::fs::File::create(&path) {
                if file_name.ends_with(".json") {
                    println!("writing empty json");
                    let _ = file.write_all(b"{}");
                }
            }
        }
    }

    let access_token_file = local_data_dir.join("access_token.db");
    let auth_code_file = local_data_dir.join("auth_code.db");

    println!("access token path: {:?}", access_token_file);
    println!("auth code path: {:?}", auth_code_file);

    Ok(AppPaths {
        local_data_dir,
        access_token_file,
        auth_code_file,
    })
}

#[allow(dead_code)]
pub fn initialize_user_files(app: &AppHandle) {
    if let Ok(paths) = init_app_paths(app) {
        for file in USERS_FILES.iter() {
            let file_path = paths.local_data_dir.join(file);
            println!("file path: {:?}", file_path);
        }
    }
}

#[allow(dead_code)]
pub fn get_app_local_data_dir(paths: &AppPaths, file_name: &str) -> PathBuf {
    paths.local_data_dir.join(file_name)
}
