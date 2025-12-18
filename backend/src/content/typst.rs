//! HTML to Typst conversion module

use regex::Regex;

// Use unique placeholders that won't be affected by escaping
const MATH_START: &str = "___TYPST_MATH_";
const MATH_END: &str = "_TYPST_MATH___";
const HEADING_START: &str = "___TYPST_H";
const HEADING_END: &str = "_TYPST_HEADING___";

/// Convert cleaned HTML content to Typst markup
pub fn html_to_typst(html: &str) -> String {
    let mut result = html.to_string();
    
    // Decode HTML entities first
    result = result.replace("&amp;", "&");
    result = result.replace("&lt;", "<");
    result = result.replace("&gt;", ">");
    result = result.replace("&quot;", "\"");
    result = result.replace("&nbsp;", " ");
    result = result.replace("&#39;", "'");
    
    // STEP 1: Extract and protect math expressions before any processing
    let (result_with_placeholders, math_blocks) = extract_math(&result);
    result = result_with_placeholders;
    
    // STEP 2: Extract and convert headings
    result = extract_headings(&result);
    
    // STEP 3: Convert lists
    result = convert_lists(&result);
    
    // STEP 4: Strip HTML tags
    result = strip_html_tags(&result);
    
    // STEP 5: Escape special characters in NON-MATH content
    result = escape_typst_content(&result);
    
    // STEP 6: Restore heading markers
    result = restore_headings(&result);
    
    // STEP 7: Restore math expressions (converted to Typst format)
    result = restore_math(&result, &math_blocks);
    
    // STEP 8: Clean up whitespace
    result = clean_whitespace(&result);
    
    result
}

/// Extract math expressions and replace with placeholders
fn extract_math(html: &str) -> (String, Vec<(bool, String)>) {
    let mut result = html.to_string();
    let mut math_blocks: Vec<(bool, String)> = Vec::new(); // (is_display, latex)
    
    // Extract display math $$...$$
    if let Ok(re) = Regex::new(r"\$\$([\s\S]+?)\$\$") {
        result = re.replace_all(&result, |caps: &regex::Captures| {
            let idx = math_blocks.len();
            math_blocks.push((true, caps[1].to_string()));
            format!("{}{}{}", MATH_START, idx, MATH_END)
        }).to_string();
    }
    
    // Extract \[...\] display math
    if let Ok(re) = Regex::new(r"\\\[([\s\S]*?)\\\]") {
        result = re.replace_all(&result, |caps: &regex::Captures| {
            let idx = math_blocks.len();
            math_blocks.push((true, caps[1].to_string()));
            format!("{}{}{}", MATH_START, idx, MATH_END)
        }).to_string();
    }
    
    // Extract \(...\) inline math
    if let Ok(re) = Regex::new(r"\\\((.+?)\\\)") {
        result = re.replace_all(&result, |caps: &regex::Captures| {
            let idx = math_blocks.len();
            math_blocks.push((false, caps[1].to_string()));
            format!("{}{}{}", MATH_START, idx, MATH_END)
        }).to_string();
    }
    
    // Extract inline math $...$ (be careful not to match currency)
    if let Ok(re) = Regex::new(r"\$([^$\n]+?)\$") {
        result = re.replace_all(&result, |caps: &regex::Captures| {
            let content = &caps[1];
            // Skip if it looks like currency (just a number)
            if content.trim().chars().all(|c| c.is_numeric() || c == '.' || c == ',') {
                return caps[0].to_string();
            }
            let idx = math_blocks.len();
            math_blocks.push((false, content.to_string()));
            format!("{}{}{}", MATH_START, idx, MATH_END)
        }).to_string();
    }
    
    (result, math_blocks)
}

/// Convert LaTeX to Typst math syntax using tex2typst-rs library
fn latex_to_typst_math(latex: &str) -> String {
// tex2typst-rs::tex2typst returns Result<String, String>
    // Pre-process common unicode symbols that tex2typst might not handle or that Typst rejects raw
    // √ followed by space or end -> \sqrt{} (empty root)
    // √ followed by char -> \sqrt (let tex parser handle arg)
    let processed = latex.replace("√", "\\sqrt ");

    match tex2typst_rs::tex2typst(&processed) {
        Ok(s) => s,
        Err(_) => latex.to_string(), // Fallback on error
    }
}

/// Restore math expressions as Typst math
fn restore_math(text: &str, math_blocks: &[(bool, String)]) -> String {
    let mut result = text.to_string();
    
    for (idx, (is_display, latex)) in math_blocks.iter().enumerate() {
        let typst_math = latex_to_typst_math(latex);
        let placeholder = format!("{}{}{}", MATH_START, idx, MATH_END);
        
        // Also handle version with escaped underscores
        let escaped_placeholder = placeholder.replace("_", "\\_");
        
        let replacement = if *is_display {
            format!("\n$ {} $\n", typst_math)
        } else {
            format!("${}$", typst_math)
        };
        
        result = result.replace(&escaped_placeholder, &replacement);
        result = result.replace(&placeholder, &replacement);
    }
    
    result
}

/// Extract headings and replace with markers
fn extract_headings(html: &str) -> String {
    let mut result = html.to_string();
    
    for (tag, level) in [("h1", 1), ("h2", 2), ("h3", 3), ("h4", 4)] {
        let pattern = format!(r"(?si)<{}[^>]*>(.*?)</{}>", tag, tag);
        if let Ok(re) = Regex::new(&pattern) {
            result = re.replace_all(&result, |caps: &regex::Captures| {
                let content = strip_html_tags(&caps[1]);
                let clean_content = content.trim().replace("\n", " ").replace("  ", " ");
                format!("\n\n{}{}{}{}\n\n", HEADING_START, level, clean_content, HEADING_END)
            }).to_string();
        }
    }
    
    result
}

/// Restore heading markers to Typst format
fn restore_headings(text: &str) -> String {
    let mut result = text.to_string();
    
    for level in 1..=4 {
        let equals = "=".repeat(level);
        let plain_pattern = format!("{}{}(.*?){}", HEADING_START, level, HEADING_END);
        
        if let Ok(re) = Regex::new(&plain_pattern) {
            result = re.replace_all(&result, |caps: &regex::Captures| {
                let content = unescape_typst_content(&caps[1]);
                format!("{} {}", equals, content.trim())
            }).to_string();
        }
        
        // Also replace escaped version
        let escaped_start = HEADING_START.replace("_", "\\_");
        let escaped_end = HEADING_END.replace("_", "\\_");
        let escaped_pattern = format!("{}{}(.*?){}", 
            regex::escape(&escaped_start), level, regex::escape(&escaped_end));
        
        if let Ok(re) = Regex::new(&escaped_pattern) {
            result = re.replace_all(&result, |caps: &regex::Captures| {
                let content = unescape_typst_content(&caps[1]);
                format!("{} {}", equals, content.trim())
            }).to_string();
        }
    }
    
    result
}

fn convert_lists(html: &str) -> String {
    let mut result = html.to_string();
    
    let li_pattern = r"(?si)<li[^>]*>(.*?)</li>";
    if let Ok(re) = Regex::new(li_pattern) {
        result = re.replace_all(&result, |caps: &regex::Captures| {
            let content = strip_html_tags(&caps[1]);
            format!("\n- {}", content.trim())
        }).to_string();
    }
    
    result = Regex::new(r"(?si)</?ul[^>]*>").unwrap().replace_all(&result, "\n").to_string();
    result = Regex::new(r"(?si)</?ol[^>]*>").unwrap().replace_all(&result, "\n").to_string();
    
    result
}

fn strip_html_tags(html: &str) -> String {
    let mut result = html.to_string();
    result = Regex::new(r"(?i)<br\s*/?>").unwrap().replace_all(&result, "\n").to_string();
    result = Regex::new(r"(?i)</p>").unwrap().replace_all(&result, "\n\n").to_string();
    result = Regex::new(r"(?i)<p[^>]*>").unwrap().replace_all(&result, "\n").to_string();
    
    Regex::new(r"<[^>]+>")
        .unwrap()
        .replace_all(&result, "")
        .to_string()
}

/// Escape Typst special characters (but NOT in placeholders)
fn escape_typst_content(text: &str) -> String {
    let mut result = String::new();
    let mut i = 0;
    let chars: Vec<char> = text.chars().collect();
    
    while i < chars.len() {
        let remaining: String = chars[i..].iter().collect();
        
        if remaining.starts_with(MATH_START) {
            if let Some(end_pos) = remaining.find(MATH_END) {
                let placeholder = &remaining[..end_pos + MATH_END.len()];
                result.push_str(placeholder);
                i += placeholder.len();
                continue;
            }
        }
        
        if remaining.starts_with(HEADING_START) {
            if let Some(end_pos) = remaining.find(HEADING_END) {
                let placeholder = &remaining[..end_pos + HEADING_END.len()];
                result.push_str(placeholder);
                i += placeholder.len();
                continue;
            }
        }
        
        let c = chars[i];
        match c {
            '\\' => result.push_str("\\\\"),
            '#' => result.push_str("\\#"),
            '$' => result.push_str("\\$"),
            '*' => result.push_str("\\*"),
            '_' => result.push_str("\\_"),
            '@' => result.push_str("\\@"),
            '[' => result.push_str("\\["),
            ']' => result.push_str("\\]"),
            '<' => result.push_str("\\<"),
            '>' => result.push_str("\\>"),
            _ => result.push(c),
        }
        
        i += 1;
    }
    
    result
}

fn unescape_typst_content(text: &str) -> String {
    let mut result = text.to_string();
    
    result = result.replace("\\#", "#");
    result = result.replace("\\$", "$");
    result = result.replace("\\*", "*");
    result = result.replace("\\_", "_");
    result = result.replace("\\@", "@");
    result = result.replace("\\[", "[");
    result = result.replace("\\]", "]");
    result = result.replace("\\<", "<");
    result = result.replace("\\>", ">");
    result = result.replace("\\\\", "\\");
    
    result
}

fn clean_whitespace(text: &str) -> String {
    let mut result = text.to_string();
    
    result = Regex::new(r" {2,}").unwrap().replace_all(&result, " ").to_string();
    result = Regex::new(r"\n{3,}").unwrap().replace_all(&result, "\n\n").to_string();
    
    result = result.lines()
        .map(|line| line.trim())
        .collect::<Vec<_>>()
        .join("\n");
    
    result.trim().to_string()
}

/// Generate a complete Typst document with template
pub fn generate_typst_document(title: &str, sections: Vec<(String, String)>) -> String {
    let mut doc = String::new();
    
    let safe_title = title.replace("\\", "\\\\").replace("\"", "\\\"");
    
    doc.push_str(&format!(r#"#set document(title: "{}")
#set page(
  paper: "a4",
  margin: (x: 2.5cm, y: 2cm),
  numbering: "1",
)
#set text(font: "New Computer Modern", size: 11pt)
#set heading(numbering: "1.1")
#set par(justify: true)

// Title page
#align(center)[
  #v(3cm)
  #text(size: 28pt, weight: "bold")[
    {}
  ]
  #v(1cm)
  #text(size: 14pt, fill: gray)[Course Notes]
  #v(2cm)
]

#pagebreak()

// Table of contents
#outline(
  title: [Table of Contents],
  indent: auto,
)

#pagebreak()

// Content
"#, safe_title, safe_title));
    
    for (section_name, content) in sections {
        let safe_section = section_name
            .replace("\\", "\\\\")
            .replace("#", "\\#")
            .replace("$", "\\$")
            .replace("*", "\\*")
            .replace("_", "\\_");
        
        doc.push_str(&format!("\n\n= {}\n\n", safe_section));
        doc.push_str(&content);
    }
    
    doc
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_latex_to_typst_math() {
        // Basic function checks
        assert_eq!(latex_to_typst_math(r"\ln(x)").replace(" ", ""), "ln(x)");
        
        let res = latex_to_typst_math(r"\ln\left(\frac{a}{b}\right)");
        assert!(res.contains("ln"));
        // lib might produce "frac(a, b)" or "a/b", just ensure it doesn't crash
        
        // Limits: tex2typst uses "limits(...)", so "limits" word is EXPECTED.
        // We verify it does NOT produce corruption "limlimi".
        assert!(!latex_to_typst_math(r"\lim\limits_{x \to 0}").contains("limlimi"));
        
        // Infinity
        assert!(latex_to_typst_math(r"\infty").contains("infinity"));
        
        // Variable concatenated with function (regression test for xsqrt)
        // x\sqrt{y} -> x sqrt(y) (valid) or x dot sqrt(y)
        // Should NOT be fused "xsqrt"
        let var_func = latex_to_typst_math(r"x\sqrt{y}");
        assert!(!var_func.contains("xsqrt"));

        // Unicode fallback
        // √ -> sqrt
        assert!(latex_to_typst_math("√").contains("sqrt"));
    }
}
