//! Export routes for PDF generation

use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    routing::post,
    Json, Router,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tempfile::NamedTempFile;
use std::io::Write;

use crate::config::Config;
use crate::content::typst::{html_to_typst, generate_typst_document};

#[derive(Debug, Deserialize)]
pub struct ExportPdfRequest {
    pub title: String,
    pub sections: Vec<ExportSection>,
}

#[derive(Debug, Deserialize)]
pub struct ExportSection {
    pub name: String,
    /// HTML content (already fetched/cleaned by frontend)
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ExportErrorResponse {
    pub success: bool,
    pub error: String,
}

/// Build export routes
pub fn routes() -> Router<Config> {
    Router::new()
        .route("/pdf", post(export_pdf))
}

/// Export course content as PDF
/// Expects pre-fetched HTML content from frontend
async fn export_pdf(
    Json(request): Json<ExportPdfRequest>,
) -> std::result::Result<impl IntoResponse, (StatusCode, Json<ExportErrorResponse>)> {
    
    tracing::info!("PDF export request: {} sections, title: {}", request.sections.len(), request.title);
    
    // Convert each section's HTML to Typst
    let mut typst_sections: Vec<(String, String)> = Vec::new();
    
    for section in &request.sections {
        if !section.content.is_empty() {
            let typst_content = html_to_typst(&section.content);
            if !typst_content.trim().is_empty() {
                typst_sections.push((section.name.clone(), typst_content));
                tracing::debug!("Converted section '{}': {} chars", section.name, section.content.len());
            }
        }
    }
    
    if typst_sections.is_empty() {
        return Err((StatusCode::BAD_REQUEST, Json(ExportErrorResponse {
            success: false,
            error: "No content to export".to_string(),
        })));
    }
    
    tracing::info!("Converting {} sections to PDF", typst_sections.len());
    
    // Generate Typst document
    let typst_content = generate_typst_document(&request.title, typst_sections);
    
    // Write to temp file
    let mut typst_file = NamedTempFile::with_suffix(".typ").map_err(|e| {
        tracing::error!("Failed to create temp file: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ExportErrorResponse {
            success: false,
            error: "Failed to create temp file".to_string(),
        }))
    })?;
    
    typst_file.write_all(typst_content.as_bytes()).map_err(|e| {
        tracing::error!("Failed to write typst content: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ExportErrorResponse {
            success: false,
            error: "Failed to write content".to_string(),
        }))
    })?;
    
    let typst_path = typst_file.path();
    let pdf_path = typst_path.with_extension("pdf");
    
    // Compile with Typst
    let output = Command::new("typst")
        .args(["compile", typst_path.to_str().unwrap(), pdf_path.to_str().unwrap()])
        .output()
        .map_err(|e| {
            tracing::error!("Failed to run typst: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ExportErrorResponse {
                success: false,
                error: format!("Failed to run typst: {}", e),
            }))
        })?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        tracing::error!("Typst compilation failed: {}", stderr);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(ExportErrorResponse {
            success: false,
            error: format!("Typst compilation failed: {}", stderr),
        })));
    }
    
    // Read PDF
    let pdf_bytes = std::fs::read(&pdf_path).map_err(|e| {
        tracing::error!("Failed to read PDF: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ExportErrorResponse {
            success: false,
            error: "Failed to read generated PDF".to_string(),
        }))
    })?;
    
    // Clean up temp PDF
    let _ = std::fs::remove_file(&pdf_path);
    
    tracing::info!("PDF generated successfully: {} bytes", pdf_bytes.len());
    
    // Return PDF with proper headers
    let filename = format!("{}.pdf", sanitize_filename(&request.title));
    let content_disposition = format!("attachment; filename=\"{}\"", filename);
    
    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/pdf".to_string()),
            (header::CONTENT_DISPOSITION, content_disposition),
        ],
        pdf_bytes,
    ))
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>()
        .trim()
        .to_string()
}
