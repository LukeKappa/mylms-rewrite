//! Book-related API routes for searching and downloading books via LibGen

use axum::{
    extract::Query,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::libgen::{LibGenClient, SearchResult, PrescribedBook};

/// Query params for book search
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    q: String,
}

/// Response for book search
#[derive(Debug, Serialize)]
pub struct SearchResponse {
    success: bool,
    results: Option<SearchResult>,
    error: Option<String>,
}

/// Response for download URL
#[derive(Debug, Serialize)]
pub struct DownloadResponse {
    success: bool,
    download_url: Option<String>,
    error: Option<String>,
}

/// Request to detect books from HTML content
#[derive(Debug, Deserialize)]
pub struct DetectRequest {
    html: String,
}

/// Response for book detection
#[derive(Debug, Serialize)]
pub struct DetectResponse {
    success: bool,
    books: Vec<PrescribedBook>,
}

/// Create books routes
pub fn books_routes() -> Router<Config> {
    Router::new()
        .route("/search", get(search_books))
        .route("/download/{md5}", get(get_download_url))
        .route("/detect", post(detect_books))
}

/// Search for books by title/author
async fn search_books(
    Query(params): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, (StatusCode, Json<SearchResponse>)> {
    tracing::info!("Book search request: {}", params.q);
    
    let client = LibGenClient::new();
    
    match client.search(&params.q).await {
        Ok(results) => Ok(Json(SearchResponse {
            success: true,
            results: Some(results),
            error: None,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(SearchResponse {
                success: false,
                results: None,
                error: Some(e.to_string()),
            }),
        )),
    }
}

/// Get download URL for a book by MD5
async fn get_download_url(
    axum::extract::Path(md5): axum::extract::Path<String>,
) -> Result<Json<DownloadResponse>, (StatusCode, Json<DownloadResponse>)> {
    tracing::info!("Download URL request for MD5: {}", md5);
    
    let client = LibGenClient::new();
    
    match client.get_download_url(&md5).await {
        Ok(url) => Ok(Json(DownloadResponse {
            success: true,
            download_url: Some(url),
            error: None,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(DownloadResponse {
                success: false,
                download_url: None,
                error: Some(e.to_string()),
            }),
        )),
    }
}

/// Detect prescribed books from HTML content
async fn detect_books(
    Json(payload): Json<DetectRequest>,
) -> Result<Json<DetectResponse>, (StatusCode, String)> {
    tracing::info!("Book detection request, HTML length: {}", payload.html.len());
    
    // TODO: Implement book detection from HTML
    // For now, return empty array
    let books = detect_prescribed_books(&payload.html);
    
    Ok(Json(DetectResponse {
        success: true,
        books,
    }))
}

/// Extract prescribed book references from HTML content
fn detect_prescribed_books(_html: &str) -> Vec<PrescribedBook> {
    let books = Vec::new();
    
    // Look for common patterns in prescribed reading sections
    // Pattern 1: "Author, Title, Edition, Year"
    // Pattern 2: "Chapter X of Title by Author"
    // Pattern 3: Book titles in specific divs
    
    // Simple regex-based detection for now
    // Look for patterns like "Chapter 1" or "pp. 10-20"
    let _chapter_pattern = regex::Regex::new(r"(?i)chapter\s+(\d+|[ivxlc]+)").ok();
    let _page_pattern = regex::Regex::new(r"(?i)pp?\.\s*(\d+)").ok();
    
    // TODO: Implement more sophisticated book detection
    // This will need to parse the HTML and find prescribed reading sections
    // Then extract book titles, authors, chapters, and pages
    
    books
}
