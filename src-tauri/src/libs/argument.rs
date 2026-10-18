use specta::Type;
use serde::Deserialize;

#[allow(dead_code)]
#[derive(Deserialize, Type)]
pub struct MyCustomArgumentType {
    pub foo: String,
    pub bar: i32,
}