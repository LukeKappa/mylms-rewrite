//! HTML Content Cleaning Service
//!
//! Ported from TypeScript cleaner.ts - removes scripts, styles, navigation,
//! iframes, and Kortext/Prescribed Reading boilerplate.

use lol_html::{element, rewrite_str, RewriteStrSettings};

/// Kortext phrases - containers with these phrases are removed
const KORTEXT_PHRASES: &[&str] = &[
    "Sign in to Kortext",
    "Open book in new window",
    "You will only be able to access the book on Kortext",
    "kortext.com",
    "launchReader",
    "emailKortextSupport",
];

/// Prescribed Reading phrases
const PRESCRIBED_READING_PHRASES: &[&str] = &[
    "Prescribed Reading",
];

/// Container classes to remove when they contain unwanted text
const CONTAINER_CLASSES: &[&str] = &[
    "no-overflow",
    "box",
    "generalbox", 
    "prescribed-reading",
];

/// Clean HTML content
pub fn clean_html_content(html: &str) -> String {
    clean_html_with_token(html, None)
}

/// Clean HTML content and optionally fix image URLs with token
pub fn clean_html_with_token(html: &str, token: Option<&str>) -> String {
    if html.is_empty() {
        return String::new();
    }

    let original_len = html.len();
    
    // First pass: streaming removal of definitely unwanted elements
    let result = rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: vec![
                // Remove script elements
                element!("script", |el| {
                    el.remove();
                    Ok(())
                }),
                // Remove style elements
                element!("style", |el| {
                    el.remove();
                    Ok(())
                }),
                // Remove link stylesheets
                element!("link[rel='stylesheet']", |el| {
                    el.remove();
                    Ok(())
                }),
                element!("link[rel=\"stylesheet\"]", |el| {
                    el.remove();
                    Ok(())
                }),
                // Remove iframes (Kortext embeds, etc.)
                element!("iframe", |el| {
                    el.remove();
                    Ok(())
                }),
                // Remove nav elements
                element!("nav", |el| {
                    el.remove();
                    Ok(())
                }),
                // Remove elements with navigation classes
                element!(".navigation", |el| {
                    el.remove();
                    Ok(())
                }),
                element!(".breadcrumb", |el| {
                    el.remove();
                    Ok(())
                }),
                element!("#page-header", |el| {
                    el.remove();
                    Ok(())
                }),
                element!(".modified", |el| {
                    el.remove();
                    Ok(())
                }),
                element!(".activity-navigation", |el| {
                    el.remove();
                    Ok(())
                }),
            ],
            ..RewriteStrSettings::default()
        },
    );

    let mut output = match result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("lol_html rewrite failed: {}", e);
            return html.to_string();
        }
    };

    // Second pass: remove unwanted containers using scraper
    output = remove_unwanted_containers(&output);
    
    // Remove duplicate headings
    output = remove_duplicate_headings(&output);
    
    // Post-process: clean images
    output = clean_images(&output);
    
    // Post-process: remove empty paragraphs
    output = remove_empty_paragraphs(&output);
    
    // Fix image URLs with token if provided
    if let Some(token) = token {
        output = fix_image_urls(&output, token);
    }
    
    // Fix entity encoding
    output = output.replace("&amp;nbsp;", " ");
    output = output.replace("&nbsp;", " ");
    output = output.replace("&amp;amp;", "&");
    
    tracing::debug!(
        "Cleaned HTML: {} -> {} bytes",
        original_len,
        output.len()
    );

    output
}

/// Remove containers that have unwanted Kortext/Prescribed Reading content
fn remove_unwanted_containers(html: &str) -> String {
    use scraper::{Html, Selector};
    
    let mut output = html.to_string();
    
    // Combine all unwanted phrases
    let all_phrases: Vec<&str> = KORTEXT_PHRASES.iter()
        .chain(PRESCRIBED_READING_PHRASES.iter())
        .copied()
        .collect();
    
    // For each container class, check if it contains unwanted text and remove it
    for class in CONTAINER_CLASSES {
        let selector_str = format!(".{}", class);
        let selector = match Selector::parse(&selector_str) {
            Ok(s) => s,
            Err(_) => continue,
        };
        
        // Re-parse after each class to get fresh DOM
        let document = Html::parse_document(&output);
        
        for element in document.select(&selector) {
            // Get the full HTML including attributes (to catch onclick="launchReader()")
            let element_html = element.html();
            let element_html_lower = element_html.to_lowercase();
            
            // Check if this container has any unwanted phrase in text OR attributes
            let has_unwanted = all_phrases.iter().any(|phrase| 
                element_html_lower.contains(&phrase.to_lowercase())
            );
            
            if has_unwanted {
                output = output.replace(&element_html, "");
                tracing::debug!("Removed container .{} with Kortext/Prescribed Reading content", class);
            }
        }
    }
    
    output
}

/// Remove duplicate headings (keeps first occurrence, removes subsequent identical ones)
fn remove_duplicate_headings(html: &str) -> String {
    use scraper::{Html, Selector};
    use std::collections::HashSet;
    
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    let mut seen_headings: HashSet<String> = HashSet::new();
    
    // Check h2 and h3 headings (most common duplicates)
    for tag in ["h2", "h3"] {
        let selector = match Selector::parse(tag) {
            Ok(s) => s,
            Err(_) => continue,
        };
        
        for element in document.select(&selector) {
            let text: String = element.text().collect::<String>().trim().to_string();
            
            // Skip empty headings
            if text.is_empty() {
                continue;
            }
            
            let key = format!("{}:{}", tag, text);
            
            if seen_headings.contains(&key) {
                // This is a duplicate - remove it
                let element_html = element.html();
                output = output.replacen(&element_html, "", 1);
                tracing::debug!("Removed duplicate heading: {}", text);
            } else {
                seen_headings.insert(key);
            }
        }
    }
    
    output
}

/// Clean images - remove spacers and data URIs
fn clean_images(html: &str) -> String {
    use scraper::{Html, Selector};
    
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    
    if let Ok(selector) = Selector::parse("img") {
        for element in document.select(&selector) {
            if let Some(src) = element.value().attr("src") {
                // Remove spacer images
                if src.is_empty() || src.starts_with("data:image/gif;base64") || src.contains("spacer") {
                    output = output.replace(&element.html(), "");
                }
            } else {
                // No src, remove
                output = output.replace(&element.html(), "");
            }
        }
    }
    
    output
}

/// Remove empty paragraphs
fn remove_empty_paragraphs(html: &str) -> String {
    if let Ok(re) = regex::Regex::new(r"<p[^>]*>\s*(&nbsp;|\s)*\s*</p>") {
        re.replace_all(html, "").to_string()
    } else {
        html.to_string()
    }
}

/// Fix image URLs to include authentication token
fn fix_image_urls(html: &str, token: &str) -> String {
    let mut result = html.to_string();
    
    if let Ok(re) = regex::Regex::new(r#"(<img[^>]+src=["'])([^"']+)(["'])"#) {
        result = re.replace_all(&result, |caps: &regex::Captures| {
            let prefix = &caps[1];
            let url = &caps[2];
            let suffix = &caps[3];
            
            // Skip if already has token
            if url.contains("token=") {
                return caps[0].to_string();
            }
            
            // Skip data URIs
            if url.starts_with("data:") {
                return caps[0].to_string();
            }
            
            // Skip external URLs (not Moodle)
            if url.starts_with("http") && !url.contains("mylms.vossie.net") {
                return caps[0].to_string();
            }
            
            // Add token to Moodle URLs or relative URLs
            let separator = if url.contains('?') { "&" } else { "?" };
            format!("{}{}{}token={}{}", prefix, url, separator, token, suffix)
        }).to_string();
    }
    
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_removes_scripts() {
        let html = "<html><body><p>Before</p><script>alert('x');</script><p>After</p></body></html>";
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("<script>"));
        assert!(cleaned.contains("Before"));
        assert!(cleaned.contains("After"));
    }

    #[test]
    fn test_removes_kortext_container() {
        let html = r#"<html><body><p>Content</p><div class="no-overflow">Sign in to Kortext stuff</div><p>More</p></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("Kortext"));
        assert!(cleaned.contains("Content"));
        assert!(cleaned.contains("More"));
    }
    
    #[test]
    fn test_removes_container_with_launchreader() {
        let html = r##"<html><body><p>Content</p><div class="no-overflow"><button onclick="launchReader()">Open</button></div><p>More</p></body></html>"##;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("launchReader"));
        assert!(cleaned.contains("Content"));
        assert!(cleaned.contains("More"));
    }

    #[test]
    fn test_removes_iframes() {
        let html = r#"<html><body><p>Content</p><iframe src="https://kortext.com/embed"></iframe><p>More</p></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("<iframe"));
        assert!(cleaned.contains("Content"));
    }
    
    #[test]
    fn test_preserves_normal_content() {
        let html = "<html><body><h2>1. Learning outcomes</h2><p>By the end of this chapter, you should be able to understand calculus.</p></body></html>";
        let cleaned = clean_html_content(html);
        assert!(cleaned.contains("Learning outcomes"));
        assert!(cleaned.contains("By the end of this chapter"));
        assert!(cleaned.contains("understand calculus"));
    }
    
    #[test]
    fn test_preserves_box_without_kortext() {
        let html = r#"<html><body><div class="box"><p>Important regular content here</p></div></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(cleaned.contains("Important regular content"));
    }
    
    #[test]
    fn test_removes_prescribed_reading_container() {
        let html = r#"<html><body><p>Content</p><div class="no-overflow">Prescribed Reading for this module</div><p>More</p></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("Prescribed Reading"));
        assert!(cleaned.contains("Content"));
        assert!(cleaned.contains("More"));
    }
}
