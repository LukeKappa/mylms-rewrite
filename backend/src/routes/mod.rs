//! API Routes

mod auth;
mod courses;
mod content;
mod books;
mod export;

use axum::Router;
use crate::config::Config;

/// Build all API routes
pub fn api_routes() -> Router<Config> {
    Router::new()
        .nest("/auth", auth::routes())
        .nest("/courses", courses::routes())
        .nest("/content", content::routes())
        .nest("/books", books::books_routes())
        .nest("/export", export::routes())
}

