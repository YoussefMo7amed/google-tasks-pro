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

impl AccessToken {
    pub fn empty() -> Self {
        Self {
            access_token: "".to_string(),
            expires_in: 0,
            refresh_token: "".to_string(),
            scope: "".to_string(),
            token_type: "".to_string(),
            id_token: "".to_string(),
        }
    }
}

fn get_db_password() -> String {
    env::var("DB_PASSWORD").unwrap_or_else(|_| "default_google_tasks_desktop_secret_key".to_string())
}

impl AccessToken {
    pub fn save(&self, file_path: &Path) -> SaveAccessTokenResponse {
        let encoded = match to_vec(self) {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("Error serializing access token: {}", e);
                return SaveAccessTokenResponse {
                    message: format!("Failed to serialize token: {}", e),
                    success: false,
                    token: self.clone(),
                };
            }
        };

        let password: String = get_db_password();
        let mut cocoon = Cocoon::new(password.as_bytes());
        println!("About to open db file");
        let mut file = match std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(file_path)
        {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Error opening db file: {}", e);
                return SaveAccessTokenResponse {
                    message: format!("Failed to open db file: {}", e),
                    success: false,
                    token: self.clone(),
                };
            }
        };

        if let Err(e) = cocoon.dump(encoded, &mut file) {
            eprintln!("Error dumping encrypted token: {:?}", e);
            return SaveAccessTokenResponse {
                message: format!("Failed to encrypt and save token: {:?}", e),
                success: false,
                token: self.clone(),
            };
        }

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
                return AccessToken::empty();
            }
        };
        let binding = get_db_password();
        let cacoon = Cocoon::new(binding.as_bytes());
        match cacoon.parse(&mut file) {
            Ok(data) => match AccessToken::try_from_slice(&data) {
                Ok(token) => token,
                Err(e) => {
                    eprintln!("Error deserializing token data: {}", e);
                    AccessToken::empty()
                }
            },
            Err(_) => {
                println!("Error reading file");
                AccessToken::empty()
            }
        }
    }
}

pub struct Auth;

impl Auth {
    pub fn save_auth_code(file_path: &Path, code: String) -> SaveTokenResponse {
        let encoded = match to_vec(&code) {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("Error serializing auth code: {}", e);
                return SaveTokenResponse {
                    message: format!("Failed to serialize code: {}", e),
                    success: false,
                    token: code,
                };
            }
        };

        let password: String = get_db_password();
        let mut cocoon = Cocoon::new(password.as_bytes());
        println!("About to open db file");
        let mut file = match std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(file_path)
        {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Error opening db file: {}", e);
                return SaveTokenResponse {
                    message: format!("Failed to open db file: {}", e),
                    success: false,
                    token: code,
                };
            }
        };

        if let Err(e) = cocoon.dump(encoded, &mut file) {
            eprintln!("Error dumping encrypted auth code: {:?}", e);
            return SaveTokenResponse {
                message: format!("Failed to encrypt and save code: {:?}", e),
                success: false,
                token: code,
            };
        }

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
            Ok(data) => match String::try_from_slice(&data) {
                Ok(code) => code,
                Err(e) => {
                    eprintln!("Error deserializing auth code data: {}", e);
                    "".to_string()
                }
            },
            Err(_) => {
                println!("Error reading file");
                "".to_string()
            }
        }
    }

    pub fn save_access_token(file_path: &Path, token: String) -> SaveAccessTokenResponse {
        match serde_json::from_str::<AccessToken>(&token) {
            Ok(content) => content.save(file_path),
            Err(e) => {
                eprintln!("Error parsing access token JSON: {}", e);
                SaveAccessTokenResponse {
                    message: format!("Failed to parse token JSON: {}", e),
                    success: false,
                    token: AccessToken::empty(),
                }
            }
        }
    }

    pub fn load_access_token(file_path: &Path) -> AccessToken {
        AccessToken::load(file_path)
    }
}
