//! LibGen types and data structures

use serde::{Deserialize, Serialize};

/// Book information from LibGen
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: String,
    pub year: Option<String>,
    pub extension: String,  // pdf, epub, etc.
    pub size: String,
    pub md5: String,
    pub pages: Option<String>,
    pub language: Option<String>,
    pub publisher: Option<String>,
    pub download_url: Option<String>,
}

/// Search result wrapper
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub query: String,
    pub books: Vec<Book>,
    pub total: usize,
}

/// Prescribed book extracted from course content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrescribedBook {
    pub title: String,
    pub author: Option<String>,
    pub chapter: Option<String>,
    pub page: Option<u32>,
    pub edition: Option<String>,
}
