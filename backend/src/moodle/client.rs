//! Moodle API client - handles all communication with Moodle LMS

use reqwest::Client;
use serde_json::Value;

use crate::config::Config;
use crate::error::{AppError, Result};
use super::types::*;

/// Client for interacting with Moodle's Web Services API
#[derive(Clone)]
pub struct MoodleClient {
    http: Client,
    base_url: String,
}

impl MoodleClient {
    /// Create a new Moodle client
    pub fn new(config: &Config) -> Self {
        Self {
            http: Client::new(),
            base_url: config.webservice_url(),
        }
    }

    /// Make a Moodle API call
    async fn call<T: serde::de::DeserializeOwned>(
        &self,
        token: &str,
        wsfunction: &str,
        params: &[(&str, String)],
    ) -> Result<T> {
        let mut form_data = vec![
            ("wstoken", token.to_string()),
            ("wsfunction", wsfunction.to_string()),
            ("moodlewsrestformat", "json".to_string()),
        ];
        
        for (key, value) in params {
            form_data.push((key, value.clone()));
        }

        tracing::debug!("Moodle API call: {} with {} params", wsfunction, params.len());

        let response = self.http
            .post(&self.base_url)
            .form(&form_data)
            .send()
            .await?;

        let text = response.text().await?;
        
        // Check for Moodle error response
        if let Ok(error) = serde_json::from_str::<MoodleError>(&text) {
            if error.is_error() {
                let msg = error.message.unwrap_or_else(|| 
                    error.errorcode.unwrap_or_else(|| "Unknown error".to_string())
                );
                return Err(AppError::MoodleApi(msg));
            }
        }

        serde_json::from_str(&text).map_err(|e| {
            tracing::error!("Failed to parse Moodle response: {}", e);
            tracing::debug!("Response text: {}", &text[..text.len().min(500)]);
            AppError::Internal(format!("Failed to parse response: {}", e))
        })
    }

    /// Get site information (also validates the token)
    pub async fn get_site_info(&self, token: &str) -> Result<SiteInfo> {
        self.call(token, "core_webservice_get_site_info", &[]).await
    }

    /// Get user's enrolled courses
    pub async fn get_user_courses(&self, token: &str, userid: i64) -> Result<Vec<Course>> {
        self.call(token, "core_enrol_get_users_courses", &[
            ("userid", userid.to_string()),
        ]).await
    }

    /// Get course contents (sections and modules)
    pub async fn get_course_contents(&self, token: &str, courseid: i64) -> Result<Vec<CourseSection>> {
        self.call(token, "core_course_get_contents", &[
            ("courseid", courseid.to_string()),
        ]).await
    }

    /// Get a specific course module details
    pub async fn get_course_module(&self, token: &str, cmid: i64) -> Result<Value> {
        self.call(token, "core_course_get_course_module", &[
            ("cmid", cmid.to_string()),
        ]).await
    }

    /// Download a file from Moodle with token authentication
    pub async fn download_file(&self, token: &str, file_url: &str) -> Result<String> {
        let url = if file_url.contains("token=") || file_url.contains("wstoken=") {
            file_url.to_string()
        } else {
            let separator = if file_url.contains('?') { "&" } else { "?" };
            format!("{}{}token={}", file_url, separator, token)
        };

        tracing::debug!("Downloading file from Moodle...");

        let response = self.http.get(&url).send().await?;
        
        if !response.status().is_success() {
            return Err(AppError::NotFound(format!(
                "Failed to download file: HTTP {}",
                response.status()
            )));
        }

        let content = response.text().await?;


        // Check if it's an error response
        if content.trim().starts_with('{') && content.contains("\"error\"") {
            return Err(AppError::MoodleApi("File download returned error".to_string()));
        }

        Ok(content)
    }

    /// Get page module content
    pub async fn get_page_content(&self, token: &str, pageid: i64) -> Result<Value> {
        self.call(token, "mod_page_get_pages_by_courses", &[]).await
    }

    /// Batch fetch labels for courses
    pub async fn get_labels_by_courses(&self, token: &str, course_ids: &[i64]) -> Result<Value> {
        let mut params = Vec::new();
        for (i, id) in course_ids.iter().enumerate() {
            params.push((format!("courseids[{}]", i), id.to_string()));
        }
        let params_ref: Vec<(&str, String)> = params.iter()
            .map(|(k, v)| (k.as_str(), v.clone()))
            .collect();
        self.call(token, "mod_label_get_labels_by_courses", &params_ref).await
    }
}
