//! MyLMS Backend - Rust API server for Moodle integration
//!
//! This backend provides:
//! - Moodle API integration (courses, activities, content)
//! - HTML content cleaning and sanitization
//! - Caching layer (Redis + in-memory)
//! - REST API for the Next.js frontend

mod config;
mod error;
mod moodle;
mod content;
mod libgen;
mod cache;
mod routes;

use axum::{
    Router,
    http::{Method, HeaderName, HeaderValue},
};
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "mylms_backend=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Load configuration
    let config = config::Config::from_env();
    
    tracing::info!("Starting MyLMS Backend on {}:{}", config.host, config.port);
    tracing::info!("Moodle URL: {}", config.moodle_url);

    // Build CORS layer - very permissive for development
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS, Method::PUT, Method::PATCH])
        .allow_headers(Any)
        .allow_origin(Any)
        .expose_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
        ])
        .max_age(std::time::Duration::from_secs(3600));

    // Build the router
    let app = Router::new()
        .nest("/api", routes::api_routes())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(config);

    // Start the server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("Failed to bind to port 3001");

    tracing::info!("Server listening on http://0.0.0.0:3001");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
