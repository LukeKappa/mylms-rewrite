//! Moodle data types - ported from TypeScript

use serde::{Deserialize, Serialize};

/// Moodle site information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteInfo {
    pub username: String,
    pub firstname: String,
    pub lastname: String,
    pub fullname: String,
    pub userid: i64,
    pub siteurl: String,
    #[serde(default)]
    pub userpictureurl: Option<String>,
    #[serde(default)]
    pub release: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
}

/// Moodle course
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Course {
    pub id: i64,
    pub shortname: String,
    pub fullname: String,
    #[serde(default)]
    pub displayname: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub startdate: Option<i64>,
    #[serde(default)]
    pub enddate: Option<i64>,
    /// Visibility as integer (0 or 1) - Moodle returns int, not bool
    #[serde(default)]
    pub visible: Option<i32>,
    #[serde(default)]
    pub progress: Option<f64>,
    #[serde(default)]
    pub completed: Option<bool>,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub category: Option<i64>,
}

/// Course section containing modules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseSection {
    pub id: i64,
    pub name: String,
    /// Visibility as integer (0 or 1)
    #[serde(default)]
    pub visible: Option<i32>,
    #[serde(default)]
    pub summary: Option<String>,
    pub section: i64,
    #[serde(default)]
    pub uservisible: Option<bool>,
    #[serde(default)]
    pub modules: Vec<CourseModule>,
}

/// Course module (activity)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseModule {
    pub id: i64,
    #[serde(default)]
    pub url: Option<String>,
    pub name: String,
    #[serde(default)]
    pub instance: Option<i64>,
    #[serde(default)]
    pub contextid: Option<i64>,
    /// Visibility as integer (0 or 1)
    #[serde(default)]
    pub visible: Option<i32>,
    #[serde(default)]
    pub uservisible: Option<bool>,
    #[serde(default)]
    pub modicon: Option<String>,
    pub modname: String,
    #[serde(default)]
    pub modplural: Option<String>,
    #[serde(default)]
    pub indent: Option<i32>,
    #[serde(default)]
    pub completion: Option<i32>,
    #[serde(default)]
    pub contents: Option<Vec<ModuleContent>>,
}

/// Module content (file, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub filename: String,
    #[serde(default)]
    pub filepath: Option<String>,
    #[serde(default)]
    pub filesize: Option<i64>,
    #[serde(default)]
    pub fileurl: Option<String>,
    #[serde(default)]
    pub timecreated: Option<i64>,
    #[serde(default)]
    pub timemodified: Option<i64>,
    #[serde(default)]
    pub mimetype: Option<String>,
}

/// Activity representation for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub activity_type: String,
    pub url: String,
    pub modname: String,
    #[serde(default)]
    pub completed: Option<bool>,
}

/// Moodle API error response
#[derive(Debug, Clone, Deserialize)]
pub struct MoodleError {
    pub exception: Option<String>,
    pub errorcode: Option<String>,
    pub message: Option<String>,
}

impl MoodleError {
    pub fn is_error(&self) -> bool {
        self.exception.is_some() || self.errorcode.is_some()
    }
}
