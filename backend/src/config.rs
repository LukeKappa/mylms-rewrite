//! Application configuration loaded from environment variables

use std::env;

/// Application configuration
#[derive(Clone, Debug)]
pub struct Config {
    /// Server host
    pub host: String,
    /// Server port
    pub port: u16,
    /// Moodle base URL
    pub moodle_url: String,
    /// Redis URL for caching (optional)
    pub redis_url: Option<String>,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3001),
            moodle_url: env::var("MOODLE_URL")
                .unwrap_or_else(|_| "https://mylms.vossie.net".to_string()),
            redis_url: env::var("REDIS_URL").ok(),
        }
    }

    /// Get the Moodle webservice endpoint URL
    pub fn webservice_url(&self) -> String {
        format!("{}/webservice/rest/server.php", self.moodle_url)
    }
}
