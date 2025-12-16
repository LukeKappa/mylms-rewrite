//! LibGen API client wrapper
//! 
//! Uses libgen-rs crate to search and download books from Library Genesis

use crate::error::AppError;
use super::types::{Book, SearchResult};
use tracing::{debug, info, error};

/// LibGen client for searching and downloading books
pub struct LibGenClient {
    // We'll implement our own HTTP-based search since libgen-rs API is complex
    client: reqwest::Client,
}

impl LibGenClient {
    /// Create a new LibGen client
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    /// Search for books by title/author using LibGen's JSON API
    pub async fn search(&self, query: &str) -> Result<SearchResult, AppError> {
        info!("Searching LibGen for: {}", query);
        
        // Use LibGen's API directly for more reliable results
        // The JSON API endpoint returns book data in JSON format
        let search_url = format!(
            "https://libgen.is/search.php?req={}&res=25&view=simple&phrase=1&column=def",
            urlencoding::encode(query)
        );
        
        debug!("Search URL: {}", search_url);
        
        // For now, return empty results - we'll implement the actual search
        // when we have mirrors configured
        Err(AppError::Internal("LibGen search not yet fully implemented - needs mirror configuration".to_string()))
    }

    /// Search using libgen-rs internal API (if available)
    #[allow(dead_code)]
    async fn search_via_crate(&self, query: &str) -> Result<SearchResult, AppError> {
        // The libgen-rs crate requires mirrors.json configuration
        // For now, we'll note this as a TODO
        info!("LibGen crate search for: {}", query);
        
        // Return placeholder - actual implementation depends on mirrors setup
        Ok(SearchResult {
            query: query.to_string(),
            books: vec![],
            total: 0,
        })
    }

    /// Get download URL for a book by MD5 hash
    pub async fn get_download_url(&self, md5: &str) -> Result<String, AppError> {
        info!("Getting download URL for MD5: {}", md5);
        
        // Common LibGen download mirrors
        let download_url = format!(
            "https://libgen.is/get.php?md5={}",
            md5
        );
        
        Ok(download_url)
    }
    
    /// Download a book and return the bytes
    pub async fn download_book(&self, md5: &str) -> Result<Vec<u8>, AppError> {
        let download_url = self.get_download_url(md5).await?;
        
        info!("Downloading book from: {}", download_url);
        
        let response = self.client
            .get(&download_url)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Download failed: {}", e)))?;
        
        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "Download failed with status: {}",
                response.status()
            )));
        }
        
        let bytes = response
            .bytes()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to read bytes: {}", e)))?;
        
        Ok(bytes.to_vec())
    }
}

impl Default for LibGenClient {
    fn default() -> Self {
        Self::new()
    }
}
