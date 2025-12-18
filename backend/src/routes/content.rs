//! Content routes for fetching and cleaning activity content

use axum::{
    extract::{Query, State},
    http::header::AUTHORIZATION,
    routing::{get, delete, post},
    Json, Router,
};
use axum::http::HeaderMap;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use futures::future::join_all;

use crate::cache::{MemoryCache, CACHE};
use crate::config::Config;
use crate::content::clean_html_with_token;
use crate::error::{AppError, Result};
use crate::moodle::MoodleClient;

#[derive(Debug, Deserialize)]
pub struct ContentQuery {
    url: String,
}

#[derive(Debug, Serialize)]
pub struct ContentResponse {
    success: bool,
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cached: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchPrefetchRequest {
    urls: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchPrefetchItem {
    url: String,
    success: bool,
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchPrefetchResponse {
    success: bool,
    total: usize,
    loaded: usize,
    items: Vec<BatchPrefetchItem>,
}

#[derive(Debug, Serialize)]
pub struct CacheStatusResponse {
    success: bool,
    message: String,
}

/// Build content routes
pub fn routes() -> Router<Config> {
    Router::new()
        .route("/activity", get(get_activity_content))
        .route("/batch", post(batch_prefetch))
        .route("/cache", delete(clear_cache))
}

/// Extract token from Authorization header
fn extract_token(headers: &HeaderMap) -> Result<String> {
    headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.trim_start_matches("Bearer ").to_string())
        .ok_or(AppError::Unauthorized)
}

/// Extract module ID (cmid) from Moodle URL
fn extract_module_id(url: &str) -> Option<i64> {
    // Pattern: ?id=12345 or &id=12345
    let re = regex::Regex::new(r"[?&]id=(\d+)").ok()?;
    re.captures(url)
        .and_then(|caps| caps.get(1))
        .and_then(|m| m.as_str().parse().ok())
}

/// Get cleaned activity content
/// 
/// This uses the Moodle API to:
/// 1. Get the module info for the cmid
/// 2. Get course contents to find HTML files
/// 3. Download and combine the HTML files
/// 4. Clean and return the content
async fn get_activity_content(
    State(config): State<Config>,
    headers: HeaderMap,
    Query(query): Query<ContentQuery>,
) -> Result<Json<ContentResponse>> {
    let token = extract_token(&headers)?;
    
    // Check cache first
    let cache_key = format!("activity:{}", MemoryCache::url_hash(&query.url));
    
    if let Some(cached_content) = CACHE.get(&cache_key) {
        tracing::debug!("Cache hit for {}", &query.url);
        return Ok(Json(ContentResponse {
            success: true,
            content: Some(cached_content),
            cached: Some(true),
            error: None,
        }));
    }
    
    tracing::info!("Fetching content for: {}", &query.url);
    
    // Extract module ID from URL
    let cmid = match extract_module_id(&query.url) {
        Some(id) => id,
        None => {
            tracing::error!("Could not extract module ID from URL: {}", &query.url);
            return Ok(Json(ContentResponse {
                success: false,
                content: None,
                cached: None,
                error: Some("Invalid URL format - could not extract module ID".to_string()),
            }));
        }
    };
    
    tracing::debug!("Extracted module ID: {}", cmid);
    
    let client = MoodleClient::new(&config);
    
    // Step 1: Get module info to find the course ID
    let mod_info = match client.get_course_module(&token, cmid).await {
        Ok(info) => info,
        Err(e) => {
            tracing::error!("Failed to get module info: {}", e);
            return Ok(Json(ContentResponse {
                success: false,
                content: None,
                cached: None,
                error: Some(format!("Failed to get module info: {}", e)),
            }));
        }
    };
    
    // Extract course ID from module info
    let course_id = mod_info
        .get("cm")
        .and_then(|cm| cm.get("course"))
        .and_then(|c| c.as_i64())
        .ok_or_else(|| {
            tracing::error!("Could not extract course ID from module info");
            AppError::Internal("Could not extract course ID".to_string())
        })?;
    
    tracing::debug!("Course ID: {}", course_id);
    
    // Step 2: Get course contents to find HTML files
    let sections = client.get_course_contents(&token, course_id).await?;
    
    // Find HTML files for this module
    let mut html_files: Vec<(String, String)> = Vec::new(); // (fileurl, filename)
    
    for section in &sections {
        for module in &section.modules {
            if module.id == cmid {
                if let Some(contents) = &module.contents {
                    for content in contents {
                        let filename = content.filename.to_lowercase();
                        if filename.ends_with(".html") || filename.ends_with(".htm") {
                            if let Some(fileurl) = &content.fileurl {
                                html_files.push((fileurl.clone(), content.filename.clone()));
                            }
                        }
                    }
                }
                break;
            }
        }
        if !html_files.is_empty() {
            break;
        }
    }
    
    if html_files.is_empty() {
        tracing::info!("No HTML files found for module {}, trying direct fetch", cmid);
        
        // Fallback: Try to download the URL directly (works for some resource types)
        match client.download_file(&token, &query.url).await {
            Ok(html) => {
                let cleaned = clean_html_with_token(&html, Some(&token));
                CACHE.set(&cache_key, &cleaned, Some(Duration::from_secs(3600)));
                
                return Ok(Json(ContentResponse {
                    success: true,
                    content: Some(cleaned),
                    cached: Some(false),
                    error: None,
                }));
            }
            Err(_) => {
                return Ok(Json(ContentResponse {
                    success: false,
                    content: None,
                    cached: None,
                    error: Some("No HTML content available for this activity".to_string()),
                }));
            }
        }
    }
    
    tracing::info!("Found {} HTML file(s)", html_files.len());
    
    // Step 3: Download and combine HTML files
    let mut combined_html = String::new();
    
    for (fileurl, filename) in &html_files {
        match client.download_file(&token, fileurl).await {
            Ok(html) => {
                tracing::debug!("Downloaded: {}", filename);
                combined_html.push_str(&html);
                combined_html.push_str("\n\n");
            }
            Err(e) => {
                tracing::warn!("Failed to download {}: {}", filename, e);
            }
        }
    }
    
    if combined_html.is_empty() {
        return Ok(Json(ContentResponse {
            success: false,
            content: None,
            cached: None,
            error: Some("Failed to download any content".to_string()),
        }));
    }
    
    // Step 4: Clean the HTML
    let cleaned = clean_html_with_token(&combined_html, Some(&token));
    
    // Cache for 1 hour
    CACHE.set(&cache_key, &cleaned, Some(Duration::from_secs(3600)));
    
    Ok(Json(ContentResponse {
        success: true,
        content: Some(cleaned),
        cached: Some(false),
        error: None,
    }))
}

/// Clear all cached content
async fn clear_cache() -> Result<Json<CacheStatusResponse>> {
    if CACHE.clear() {
        tracing::info!("Cache cleared");
        Ok(Json(CacheStatusResponse {
            success: true,
            message: "Cache cleared successfully".to_string(),
        }))
    } else {
        Ok(Json(CacheStatusResponse {
            success: false,
            message: "Failed to clear cache".to_string(),
        }))
    }
}

/// Batch prefetch multiple activities at once
async fn batch_prefetch(
    State(config): State<Config>,
    headers: HeaderMap,
    Json(request): Json<BatchPrefetchRequest>,
) -> Result<Json<BatchPrefetchResponse>> {
    let token = extract_token(&headers)?;
    
    tracing::info!("Batch prefetch request for {} URLs", request.urls.len());
    
    let client = MoodleClient::new(&config);
    
    // Process URLs concurrently with a semaphore to limit parallelism
    use tokio::sync::Semaphore;
    use std::sync::Arc;
    
    let semaphore = Arc::new(Semaphore::new(10)); // Max 10 concurrent requests
    
    let futures: Vec<_> = request.urls.iter().map(|url| {
        let url = url.clone();
        let token = token.clone();
        let config = config.clone();
        let semaphore = semaphore.clone();
        
        async move {
            let _permit = semaphore.acquire().await;
            
            // Check cache first
            let cache_key = format!("activity:{}", MemoryCache::url_hash(&url));
            if let Some(cached_content) = CACHE.get(&cache_key) {
                return BatchPrefetchItem {
                    url,
                    success: true,
                    content: Some(cached_content),
                    error: None,
                };
            }
            
            // Fetch and clean content
            let client = MoodleClient::new(&config);
            match fetch_activity_content(&client, &token, &url).await {
                Ok(content) => {
                    let cleaned = clean_html_with_token(&content, Some(&token));
                    CACHE.set(&cache_key, &cleaned, Some(Duration::from_secs(3600)));
                    
                    BatchPrefetchItem {
                        url,
                        success: true,
                        content: Some(cleaned),
                        error: None,
                    }
                }
                Err(e) => {
                    BatchPrefetchItem {
                        url,
                        success: false,
                        content: None,
                        error: Some(e.to_string()),
                    }
                }
            }
        }
    }).collect();
    
    let items: Vec<BatchPrefetchItem> = join_all(futures).await;
    let loaded = items.iter().filter(|i| i.success).count();
    
    tracing::info!("Batch prefetch complete: {}/{} loaded", loaded, items.len());
    
    Ok(Json(BatchPrefetchResponse {
        success: true,
        total: items.len(),
        loaded,
        items,
    }))
}

/// Helper to fetch activity content (extracted from get_activity_content)
async fn fetch_activity_content(client: &MoodleClient, token: &str, url: &str) -> std::result::Result<String, String> {
    // Extract module ID from URL
    let cmid = extract_module_id(url)
        .ok_or_else(|| "Invalid URL format".to_string())?;
    
    // Get module info
    let mod_info = client.get_course_module(token, cmid).await
        .map_err(|e| format!("Failed to get module info: {}", e))?;
    
    let course_id = mod_info
        .get("cm")
        .and_then(|cm| cm.get("course"))
        .and_then(|c| c.as_i64())
        .ok_or_else(|| "Could not extract course ID".to_string())?;
    
    // Get course contents
    let sections = client.get_course_contents(token, course_id).await
        .map_err(|e| format!("Failed to get course contents: {}", e))?;
    
    // Find HTML files for this module
    let mut html_files: Vec<(String, String)> = Vec::new();
    
    for section in &sections {
        for module in &section.modules {
            if module.id == cmid {
                if let Some(contents) = &module.contents {
                    for content in contents {
                        let filename = content.filename.to_lowercase();
                        if filename.ends_with(".html") || filename.ends_with(".htm") {
                            if let Some(fileurl) = &content.fileurl {
                                html_files.push((fileurl.clone(), content.filename.clone()));
                            }
                        }
                    }
                }
                break;
            }
        }
        if !html_files.is_empty() {
            break;
        }
    }
    
    if html_files.is_empty() {
        // Fallback: Try direct download
        return client.download_file(token, url).await
            .map_err(|e| format!("No HTML content: {}", e));
    }
    
    // Download and combine HTML files
    let mut combined_html = String::new();
    for (fileurl, _) in &html_files {
        if let Ok(html) = client.download_file(token, fileurl).await {
            combined_html.push_str(&html);
            combined_html.push_str("\n\n");
        }
    }
    
    if combined_html.is_empty() {
        return Err("Failed to download content".to_string());
    }
    
    Ok(combined_html)
}
