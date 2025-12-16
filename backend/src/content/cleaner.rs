//! HTML Content Cleaning Service
//!
//! Ported from TypeScript cleaner.ts - removes scripts, styles, navigation,
//! iframes, and Kortext/Prescribed Reading boilerplate.

use scraper::{Html, Selector};

/// Navigation selectors to remove
const NAVIGATION_SELECTORS: &[&str] = &[
    "nav",
    ".navigation",
    ".breadcrumb",
    "#page-header",
    ".modified",
    ".activity-navigation",
];

/// Kortext phrases - elements containing these should have their container removed
const KORTEXT_PHRASES: &[&str] = &[
    "Sign in to Kortext",
    "Open book in new window",
    "You will only be able to access the book on Kortext",
];

/// Prescribed Reading phrases
const PRESCRIBED_READING_PHRASES: &[&str] = &[
    "Prescribed Reading",
    "Learning outcomes",
];

/// Container selectors that might hold unwanted content
const CONTAINER_SELECTORS: &[&str] = &[
    ".no-overflow",
    ".box",
    ".generalbox",
    ".prescribed-reading",
    "div[style*='margin: auto 20%']",  // Kortext sign-in container
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
    let mut output = html.to_string();
    
    // Step 1: Remove scripts, styles, and stylesheet links
    output = remove_elements_by_tag(&output, "script");
    output = remove_elements_by_tag(&output, "style");
    output = remove_link_stylesheets(&output);
    
    // Step 2: Remove navigation elements
    for selector in NAVIGATION_SELECTORS {
        output = remove_elements_by_selector(&output, selector);
    }
    
    // Step 3: Remove iframes (Kortext embeds)
    output = remove_elements_by_tag(&output, "iframe");
    
    // Step 4: Remove containers that contain Kortext/Prescribed Reading phrases
    output = remove_unwanted_content(&output);
    
    // Step 5: Clean images - remove spacers, icons, data URIs
    output = clean_images(&output);
    
    // Step 6: Remove duplicate headings (from concatenated HTML files)
    output = remove_duplicate_headings(&output);
    
    // Step 7: Remove empty paragraphs
    output = remove_empty_paragraphs(&output);
    
    // Step 8: Fix image URLs with token if provided
    if let Some(token) = token {
        output = fix_image_urls(&output, token);
    }
    
    // Step 9: Fix entity encoding - decode common HTML entities
    // Handle double-encoded entities first
    output = output.replace("&amp;nbsp;", " ");
    output = output.replace("&amp;gt;", ">");
    output = output.replace("&amp;lt;", "<");
    output = output.replace("&amp;quot;", "\"");
    output = output.replace("&amp;amp;", "&");
    // Then handle single-encoded entities
    output = output.replace("&nbsp;", " ");
    output = output.replace("&gt;", ">");
    output = output.replace("&lt;", "<");
    output = output.replace("&quot;", "\"");
    
    tracing::debug!(
        "Cleaned HTML: {} -> {} bytes",
        original_len,
        output.len()
    );

    output
}

/// Remove elements containing unwanted text (Kortext, Prescribed Reading)
/// This follows the TypeScript pattern of finding containers with unwanted phrases
fn remove_unwanted_content(html: &str) -> String {
    let mut output = html.to_string();
    let document = Html::parse_document(html);
    
    // Collect all unwanted phrases
    let all_phrases: Vec<&str> = KORTEXT_PHRASES.iter()
        .chain(PRESCRIBED_READING_PHRASES.iter())
        .copied()
        .collect();
    
    // For each container selector, check if it contains unwanted phrases
    for container_selector in CONTAINER_SELECTORS {
        if let Ok(selector) = Selector::parse(container_selector) {
            for element in document.select(&selector) {
                let element_text: String = element.text().collect();
                
                // Check if this container has any unwanted phrases
                let has_unwanted = all_phrases.iter().any(|phrase| element_text.contains(phrase));
                
                if has_unwanted {
                    let element_html = element.html();
                    // Only remove if the container is reasonably sized (not the whole page)
                    if element_html.len() < 5000 {
                        output = output.replace(&element_html, "");
                        tracing::debug!("Removed unwanted container: {}", container_selector);
                    }
                }
            }
        }
    }
    
    output
}

/// Remove all elements matching a tag name
fn remove_elements_by_tag(html: &str, tag: &str) -> String {
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    
    if let Ok(selector) = Selector::parse(tag) {
        for element in document.select(&selector) {
            let element_html = element.html();
            output = output.replace(&element_html, "");
        }
    }
    
    output
}

/// Remove link stylesheet elements
fn remove_link_stylesheets(html: &str) -> String {
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    
    if let Ok(selector) = Selector::parse("link[rel=\"stylesheet\"]") {
        for element in document.select(&selector) {
            let element_html = element.html();
            output = output.replace(&element_html, "");
        }
    }
    
    output
}

/// Remove elements by CSS selector
fn remove_elements_by_selector(html: &str, selector_str: &str) -> String {
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    
    if let Ok(selector) = Selector::parse(selector_str) {
        for element in document.select(&selector) {
            let element_html = element.html();
            output = output.replace(&element_html, "");
        }
    }
    
    output
}

/// Clean images - remove spacers, icons, and data URI images
fn clean_images(html: &str) -> String {
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    
    if let Ok(selector) = Selector::parse("img") {
        for element in document.select(&selector) {
            let src = element.value().attr("src").unwrap_or("");
            
            // Remove spacer images or icons
            if src.is_empty() 
                || src.starts_with("data:image/gif;base64") 
                || src.contains("icon")
                || src.contains("spacer")
            {
                let element_html = element.html();
                output = output.replace(&element_html, "");
            }
        }
    }
    
    output
}

/// Remove duplicate headings (from concatenated HTML files)
fn remove_duplicate_headings(html: &str) -> String {
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    let mut seen_headings: std::collections::HashSet<String> = std::collections::HashSet::new();
    
    // Check h1-h6 headings
    for tag in ["h1", "h2", "h3", "h4", "h5", "h6"] {
        if let Ok(selector) = Selector::parse(tag) {
            for element in document.select(&selector) {
                let text: String = element.text().collect::<String>().trim().to_string();
                
                // Create a key from tag + text
                let key = format!("{}:{}", tag, text);
                
                if seen_headings.contains(&key) {
                    // This is a duplicate, remove it
                    let element_html = element.html();
                    output = output.replacen(&element_html, "", 1);
                    tracing::debug!("Removed duplicate heading: {}", text);
                } else {
                    seen_headings.insert(key);
                }
            }
        }
    }
    
    output
}

/// Remove empty paragraphs that have no content
fn remove_empty_paragraphs(html: &str) -> String {
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    
    if let Ok(selector) = Selector::parse("p") {
        for element in document.select(&selector) {
            // Get text content
            let text: String = element.text().collect::<String>();
            
            // Check if has images or iframes
            let has_media = element.select(&Selector::parse("img, iframe").unwrap()).next().is_some();
            
            // Only remove if truly empty
            if text.trim().is_empty() && !has_media {
                let element_html = element.html();
                if element_html.len() < 100 { // Only remove small empty paragraphs
                    output = output.replace(&element_html, "");
                }
            }
        }
    }
    
    output
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
        let html = r#"<html><body><p>Content</p><div class="no-overflow">Sign in to Kortext</div><p>More</p></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("Kortext"));
        assert!(cleaned.contains("Content"));
        assert!(cleaned.contains("More"));
    }
}
