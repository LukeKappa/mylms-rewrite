//! Course routes

use axum::{
    extract::{Path, State},
    http::header::AUTHORIZATION,
    routing::get,
    Json, Router,
};
use axum::http::HeaderMap;
use serde::Serialize;

use crate::config::Config;
use crate::error::{AppError, Result};
use crate::moodle::{MoodleClient, Course, CourseSection, Activity};

#[derive(Debug, Serialize)]
pub struct CoursesResponse {
    courses: Vec<Course>,
    userid: i64,
    fullname: String,
}

#[derive(Debug, Serialize)]
pub struct CourseContentsResponse {
    sections: Vec<SectionWithActivities>,
}

#[derive(Debug, Serialize)]
pub struct SectionWithActivities {
    #[serde(flatten)]
    section: CourseSection,
    activities: Vec<Activity>,
}

/// Build course routes
pub fn routes() -> Router<Config> {
    Router::new()
        .route("/", get(get_courses))
        .route("/{id}", get(get_course_contents))
}

/// Extract token from Authorization header
fn extract_token(headers: &HeaderMap) -> Result<String> {
    let auth_header = headers.get(AUTHORIZATION);
    
    tracing::debug!("Authorization header present: {}", auth_header.is_some());
    
    let token = auth_header
        .and_then(|v| v.to_str().ok())
        .map(|v| v.trim_start_matches("Bearer ").to_string())
        .ok_or(AppError::Unauthorized)?;
    
    tracing::debug!("Token extracted, length: {}", token.len());
    
    Ok(token)
}

/// Get user's enrolled courses
/// 
/// GET /api/courses
/// Header: Authorization: Bearer <token>
async fn get_courses(
    State(config): State<Config>,
    headers: HeaderMap,
) -> Result<Json<CoursesResponse>> {
    tracing::info!("GET /api/courses");
    
    let token = match extract_token(&headers) {
        Ok(t) => t,
        Err(e) => {
            tracing::warn!("Token extraction failed: {}", e);
            return Err(e);
        }
    };
    
    let client = MoodleClient::new(&config);
    
    // Get site info for user ID
    tracing::debug!("Fetching site info...");
    let site_info = match client.get_site_info(&token).await {
        Ok(info) => {
            tracing::info!("Site info retrieved for user: {}", info.fullname);
            info
        }
        Err(e) => {
            tracing::error!("Failed to get site info: {}", e);
            return Err(e);
        }
    };
    
    // Get courses
    tracing::debug!("Fetching courses for user {}...", site_info.userid);
    let courses = match client.get_user_courses(&token, site_info.userid).await {
        Ok(c) => {
            tracing::info!("Fetched {} courses", c.len());
            c
        }
        Err(e) => {
            tracing::error!("Failed to fetch courses: {}", e);
            return Err(e);
        }
    };
    
    Ok(Json(CoursesResponse {
        courses,
        userid: site_info.userid,
        fullname: site_info.fullname,
    }))
}

/// Get course contents (sections and activities)
/// 
/// GET /api/courses/:id
/// Header: Authorization: Bearer <token>
async fn get_course_contents(
    State(config): State<Config>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<Json<CourseContentsResponse>> {
    tracing::info!("GET /api/courses/{}", id);
    
    let token = extract_token(&headers)?;
    let client = MoodleClient::new(&config);
    
    let sections = client.get_course_contents(&token, id).await?;
    
    // Transform sections to include activities
    let sections_with_activities: Vec<SectionWithActivities> = sections
        .into_iter()
        .map(|section| {
            let activities: Vec<Activity> = section.modules.iter()
                .filter(|m| m.uservisible.unwrap_or(true))
                .map(|m| Activity {
                    id: m.id.to_string(),
                    name: m.name.clone(),
                    activity_type: m.modname.clone(),
                    url: m.url.clone().unwrap_or_default(),
                    modname: m.modname.clone(),
                    completed: None, // Could check completion state
                })
                .collect();
            
            SectionWithActivities {
                section,
                activities,
            }
        })
        .collect();
    
    tracing::info!("Fetched {} sections for course {}", sections_with_activities.len(), id);
    
    Ok(Json(CourseContentsResponse {
        sections: sections_with_activities,
    }))
}
