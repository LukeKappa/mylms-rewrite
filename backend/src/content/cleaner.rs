//! HTML Content Cleaning Service
//!
//! Ported from TypeScript cleaner.ts - removes scripts, styles, navigation,
//! iframes, and Kortext/Prescribed Reading boilerplate.
//!
//! Uses lol_html for single-pass streaming - much faster than scraper.

use lol_html::{element, rewrite_str, RewriteStrSettings};
use std::cell::RefCell;
use std::collections::HashSet;

/// Navigation classes to remove (elements with these classes)
const NAVIGATION_CLASSES: &[&str] = &[
    "navigation",
    "breadcrumb",
    "page-header",
    "modified",
    "activity-navigation",
];

/// Navigation IDs to remove
const NAVIGATION_IDS: &[&str] = &[
    "page-header",
];

/// Navigation tags to remove entirely
const NAVIGATION_TAGS: &[&str] = &[
    "nav",
];

/// Kortext phrases - elements containing these should be removed
const KORTEXT_PHRASES: &[&str] = &[
    "Sign in to Kortext",
    "Open book in new window",
    "You will only be able to access the book on Kortext",
    "kortext.com",
    "Kortext eBook",
    "Access via Kortext",
];

/// Prescribed Reading phrases
const PRESCRIBED_READING_PHRASES: &[&str] = &[
    "Prescribed Reading",
    "Learning outcomes",
];

/// Container classes that hold unwanted content
const UNWANTED_CONTAINER_CLASSES: &[&str] = &[
    "no-overflow",
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
    
    // Track seen headings for deduplication
    let seen_headings: RefCell<HashSet<String>> = RefCell::new(HashSet::new());
    
    // First pass: streaming removal of elements
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
                // Remove no-overflow containers (often Kortext)
                element!(".no-overflow", |el| {
                    el.remove();
                    Ok(())
                }),
                // Remove prescribed-reading containers
                element!(".prescribed-reading", |el| {
                    el.remove();
                    Ok(())
                }),
                // Remove box/generalbox that might contain Kortext
                element!(".box", |el| {
                    el.remove();
                    Ok(())
                }),
                element!(".generalbox", |el| {
                    el.remove();
                    Ok(())
                }),
                // Clean images - remove spacers, icons, data URIs
                element!("img", |el| {
                    if let Some(src) = el.get_attribute("src") {
                        // Remove spacer images, icons, and empty src
                        if src.is_empty() 
                            || src.starts_with("data:image/gif;base64")
                            || src.contains("icon")
                            || src.contains("spacer")
                        {
                            el.remove();
                        }
                    } else {
                        // No src attribute, remove
                        el.remove();
                    }
                    Ok(())
                }),
                // Handle headings for deduplication
                element!("h1, h2, h3, h4, h5, h6", |el| {
                    // We'll handle deduplication in post-processing
                    // lol_html doesn't give us easy text content access
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

    // Second pass: remove elements containing Kortext/Prescribed Reading text
    // We need to use scraper for this since lol_html can't easily access text content
    output = remove_kortext_content(&output);
    
    // Post-process: remove duplicate headings
    output = remove_duplicate_headings_scraper(&output);
    
    // Post-process: remove empty paragraphs
    output = remove_empty_paragraphs_fast(&output);
    
    // Fix image URLs with token if provided
    if let Some(token) = token {
        output = fix_image_urls(&output, token);
    }
    
    // Fix entity encoding
    output = output.replace("&amp;nbsp;", " ");
    output = output.replace("&amp;gt;", ">");
    output = output.replace("&amp;lt;", "<");
    output = output.replace("&amp;quot;", "\"");
    output = output.replace("&amp;amp;", "&");
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

/// Remove elements containing Kortext/Prescribed Reading text
/// Uses scraper for text content matching
fn remove_kortext_content(html: &str) -> String {
    use scraper::{Html, Selector};
    
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    
    // Collect all unwanted phrases
    let all_phrases: Vec<&str> = KORTEXT_PHRASES.iter()
        .chain(PRESCRIBED_READING_PHRASES.iter())
        .copied()
        .collect();
    
    // Check common container elements for unwanted text
    let container_selectors = ["div", "section", "article", "p", "span"];
    
    for selector_str in container_selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            for element in document.select(&selector) {
                let element_text: String = element.text().collect();
                
                // Check if this element contains any unwanted phrases
                let has_unwanted = all_phrases.iter().any(|phrase| 
                    element_text.to_lowercase().contains(&phrase.to_lowercase())
                );
                
                if has_unwanted {
                    let element_html = element.html();
                    // Only remove if the container is reasonably sized (not the whole page)
                    if element_html.len() < 5000 && element_html.len() > 10 {
                        output = output.replace(&element_html, "");
                        tracing::debug!("Removed Kortext content: {:.50}...", element_text);
                    }
                }
            }
        }
    }
    
    output
}

/// Remove duplicate headings using scraper
fn remove_duplicate_headings_scraper(html: &str) -> String {
    use scraper::{Html, Selector};
    
    let document = Html::parse_document(html);
    let mut output = html.to_string();
    let mut seen_headings: HashSet<String> = HashSet::new();
    
    for tag in ["h1", "h2", "h3", "h4", "h5", "h6"] {
        if let Ok(selector) = Selector::parse(tag) {
            for element in document.select(&selector) {
                let text: String = element.text().collect::<String>().trim().to_string();
                let key = format!("{}:{}", tag, text);
                
                if seen_headings.contains(&key) {
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

/// Fast removal of empty paragraphs using regex
fn remove_empty_paragraphs_fast(html: &str) -> String {
    // Remove <p></p>, <p> </p>, <p>&nbsp;</p> etc.
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
        let html = r#"<html><body><p>Content</p><div class="no-overflow">Sign in to Kortext</div><p>More</p></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("Kortext"));
        assert!(cleaned.contains("Content"));
        assert!(cleaned.contains("More"));
    }
    
    #[test]
    fn test_removes_kortext_text() {
        let html = r#"<html><body><p>Content</p><div>Please Sign in to Kortext to view</div><p>More</p></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("Kortext"));
    }

    #[test]
    fn test_removes_iframes() {
        let html = r#"<html><body><p>Content</p><iframe src="https://kortext.com/embed"></iframe><p>More</p></body></html>"#;
        let cleaned = clean_html_content(html);
        assert!(!cleaned.contains("<iframe"));
    }
    
    #[test]
    fn test_removes_empty_paragraphs() {
        let html = "<html><body><p>Content</p><p></p><p>   </p><p>&nbsp;</p><p>More</p></body></html>";
        let cleaned = clean_html_content(html);
        // Should have fewer empty paragraphs
        assert!(cleaned.contains("Content"));
        assert!(cleaned.contains("More"));
    }
}
