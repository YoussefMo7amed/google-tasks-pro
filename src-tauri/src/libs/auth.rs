use super::response::{SaveAccessTokenResponse, SaveTokenResponse};

use std::env;
use std::path::Path;

use borsh::{to_vec, BorshDeserialize};
use cocoon::Cocoon;

#[derive(
    borsh::BorshDeserialize,
    borsh::BorshSerialize,
    Debug,
    serde::Serialize,
    serde::Deserialize,
    Clone,
)]
pub struct AccessToken {
    pub access_token: String,
    pub expires_in: i32,
    pub refresh_token: String,
    pub scope: String,
    pub token_type: String,
    pub id_token: String,
}

fn get_db_password() -> String {
    env::var("DB_PASSWORD").unwrap_or_else(|_| "default_google_tasks_desktop_secret_key".to_string())
}

impl AccessToken {
    pub fn save(&self, file_path: &Path) -> SaveAccessTokenResponse {
        let encoded = to_vec(self).unwrap();
        let password: String = get_db_password();
        let mut cocoon = Cocoon::new(password.as_bytes());
        println!("About to open db file");
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(file_path)
            .unwrap();
        cocoon.dump(encoded, &mut file).unwrap();
        SaveAccessTokenResponse {
            message: "Token saved to file!".to_string(),
            success: true,
            token: self.clone(),
        }
    }

    pub fn load(file_path: &Path) -> AccessToken {
        let mut file = match std::fs::File::open(file_path) {
            Ok(f) => f,
            Err(_) => {
                println!("Error reading file");
                return AccessToken {
                    access_token: "".to_string(),
                    expires_in: 0,
                    refresh_token: "".to_string(),
                    scope: "".to_string(),
                    token_type: "".to_string(),
                    id_token: "".to_string(),
                };
            }
        };
        let binding = get_db_password();
        let cacoon = Cocoon::new(binding.as_bytes());
        match cacoon.parse(&mut file) {
            Ok(data) => AccessToken::try_from_slice(&data).unwrap(),
            Err(_) => {
                println!("Error reading file");
                AccessToken {
                    access_token: "".to_string(),
                    expires_in: 0,
                    refresh_token: "".to_string(),
                    scope: "".to_string(),
                    token_type: "".to_string(),
                    id_token: "".to_string(),
                }
            }
        }
    }
}

pub struct Auth;

impl Auth {
    pub fn save_auth_code(file_path: &Path, code: String) -> SaveTokenResponse {
        let encoded = to_vec(&code).unwrap();
        let password: String = get_db_password();
        let mut cocoon = Cocoon::new(password.as_bytes());
        println!("About to open db file");
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(file_path)
            .unwrap();
        cocoon.dump(encoded, &mut file).unwrap();
        SaveTokenResponse {
            message: "Code saved to file!".to_string(),
            success: true,
            token: code,
        }
    }

    pub fn load_auth_code(file_path: &Path) -> String {
        let mut file = match std::fs::File::open(file_path) {
            Ok(f) => f,
            Err(_) => {
                println!("Error opening file");
                return "".to_string();
            }
        };
        let binding = get_db_password();
        let cacoon = Cocoon::new(binding.as_bytes());
        match cacoon.parse(&mut file) {
            Ok(data) => String::try_from_slice(&data).unwrap(),
            Err(_) => {
                println!("Error reading file");
                "".to_string()
            }
        }
    }

    pub fn save_access_token(file_path: &Path, token: String) -> SaveAccessTokenResponse {
        let content: AccessToken = serde_json::from_str(&token).unwrap();
        content.save(file_path)
    }

    pub fn load_access_token(file_path: &Path) -> AccessToken {
        AccessToken::load(file_path)
    }
}
