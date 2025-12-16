//! Application error types

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Application error types
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Authentication required")]
    Unauthorized,

    #[error("Invalid token: {0}")]
    InvalidToken(String),

    #[error("Moodle API error: {0}")]
    MoodleApi(String),

    #[error("Content not found: {0}")]
    NotFound(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Request error: {0}")]
    Request(#[from] reqwest::Error),

    #[error("Cache error: {0}")]
    Cache(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::InvalidToken(_) => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::MoodleApi(_) => (StatusCode::BAD_GATEWAY, self.to_string()),
            AppError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            AppError::Request(_) => (StatusCode::BAD_GATEWAY, self.to_string()),
            AppError::Cache(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        tracing::error!("API Error: {}", message);

        let body = Json(json!({
            "error": true,
            "message": message
        }));

        (status, body).into_response()
    }
}

/// Convenience type alias for Results
pub type Result<T> = std::result::Result<T, AppError>;
