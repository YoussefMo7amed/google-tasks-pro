use serde::Deserialize;

#[allow(dead_code)]
#[derive(Deserialize)]
pub struct MyCustomArgumentType {
    pub foo: String,
    pub bar: i32,
}
