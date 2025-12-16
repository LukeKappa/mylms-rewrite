//! Authentication routes

use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::moodle::MoodleClient;

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    token: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    success: bool,
    user: Option<UserInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    userid: i64,
    username: String,
    fullname: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    userpictureurl: Option<String>,
}

/// Build auth routes
pub fn routes() -> Router<Config> {
    Router::new()
        .route("/login", post(login))
        .route("/validate", post(validate_token))
}

/// Login with Moodle token
/// 
/// POST /api/auth/login
/// Body: { "token": "..." }
async fn login(
    State(config): State<Config>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>> {
    tracing::info!("Login attempt with token");
    
    let client = MoodleClient::new(&config);
    
    match client.get_site_info(&body.token).await {
        Ok(site_info) => {
            tracing::info!("Login successful for user: {}", site_info.fullname);
            
            Ok(Json(LoginResponse {
                success: true,
                user: Some(UserInfo {
                    userid: site_info.userid,
                    username: site_info.username,
                    fullname: site_info.fullname,
                    userpictureurl: site_info.userpictureurl,
                }),
                error: None,
            }))
        }
        Err(e) => {
            tracing::warn!("Login failed: {}", e);
            Ok(Json(LoginResponse {
                success: false,
                user: None,
                error: Some(e.to_string()),
            }))
        }
    }
}

/// Validate a token without full login
/// 
/// POST /api/auth/validate
/// Body: { "token": "..." }
async fn validate_token(
    State(config): State<Config>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<serde_json::Value>> {
    let client = MoodleClient::new(&config);
    
    match client.get_site_info(&body.token).await {
        Ok(_) => Ok(Json(serde_json::json!({ "valid": true }))),
        Err(_) => Ok(Json(serde_json::json!({ "valid": false }))),
    }
}
