/**
 * HTML Content Cleaning Service
 * 
 * This service handles cleaning of raw Moodle HTML content to create a
 * distraction-free reading experience. It removes navigation, tracking,
 * and unwanted third-party integrations (like Kortext).
 */

import { MOODLE_CONFIG } from '@/config/moodle';

/**
 * Main function to clean HTML content from Moodle
 * 
 * @param html Raw HTML content from Moodle
 * @returns Cleaned HTML suitable for display
 */
export async function cleanHtmlContent(html: string): Promise<string> {
  if (!html) return '';
  
  try {
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Remove scripts and styles
    removeScriptsAndStyles($);
    
    // Remove navigation and metadata
    removeNavigationElements($);
    
    // Remove Kortext and Prescribed Reading junk
    removeUnwantedContent($);
    
    // Remove broken images
    cleanImages($);
    
    // Remove empty paragraphs
    removeEmptyParagraphs($);

    let result = $.html();
    
    // Fix common entity encoding issues
    // Replace &nbsp; with normal space
    result = result.replace(/&nbsp;/g, ' ');
    // Fix double encoded &nbsp;
    result = result.replace(/&amp;nbsp;/g, ' ');
    // Fix double encoded ampersands (if they are just text)
    // We have to be careful not to break HTML entities, but &amp;amp; -> &amp; is usually what we want for text
    result = result.replace(/&amp;amp;/g, '&amp;');
    
    console.log(`[Clean] Input length: ${html.length}, Output length: ${result.length}`);
    return result;

  } catch (error) {
    console.error('[Clean] Error cleaning HTML:', error);
    return html; // Fallback to original HTML if cleaning fails
  }
}

/**
 * Remove all scripts, styles, and stylesheet links
 */
function removeScriptsAndStyles($: any): void {
  $('script').remove();
  $('style').remove();
  $('link[rel="stylesheet"]').remove();
}

/**
 * Remove navigation elements and metadata
 */
function removeNavigationElements($: any): void {
  MOODLE_CONFIG.UNWANTED_CONTENT.NAVIGATION_SELECTORS.forEach(selector => {
    $(selector).remove();
  });
}

/**
 * Remove Kortext iframes and Prescribed Reading blocks
 */
function removeUnwantedContent($: any): void {
  // Remove all iframes (usually external tools like Kortext)
  $('iframe').remove();
  
  // Collect all unwanted text patterns
  const unwantedTexts = [
    ...MOODLE_CONFIG.UNWANTED_CONTENT.KORTEXT_PHRASES,
    ...MOODLE_CONFIG.UNWANTED_CONTENT.PRESCRIBED_READING_PHRASES
  ];

  unwantedTexts.forEach(text => {
    // Find all elements containing the text
    $(`:contains('${text}')`).each((_i: number, el: any) => {
      // Check if this element has children that also contain the text
      // If it does, it's a parent container, so we skip it (we'll catch the child)
      // If it doesn't, it's likely the leaf or near-leaf node we want to remove
      const hasChildWithText = $(el).children().filter((_j: number, child: any) => 
        $(child).text().includes(text)
      ).length > 0;
      
      if (!hasChildWithText) {
        // This is the deepest element with the text.
        // Now we want to remove its container if it's a "box" or "section"
        const containerSelector = MOODLE_CONFIG.UNWANTED_CONTENT.CONTAINER_SELECTORS.join(', ');
        const container = $(el).closest(containerSelector);
        
        if (container.length) {
          // Remove the container if it's one of these classes
          container.remove();
        } else {
          // Otherwise just remove the element itself (and maybe its parent if it's a p tag)
          const parent = $(el).parent();
          if (parent.is('p') || parent.is('div.text_to_html')) {
            parent.remove();
          } else {
            $(el).remove();
          }
        }
      }
    });
  });
}

/**
 * Clean up images - remove spacers, icons, and images in unwanted containers
 */
function cleanImages($: any): void {
  $('img').each((_i: number, el: any) => {
    const src = $(el).attr('src');
    
    // Remove spacer images or icons
    if (!src || src.startsWith('data:image/gif;base64') || src.includes('icon')) {
      $(el).remove();
      return;
    }
    
    // Remove images inside the Prescribed Reading box if it wasn't caught above
    if ($(el).closest('.prescribed-reading').length) {
      $(el).remove();
    }
  });
}

/**
 * Remove empty paragraphs that have no content or media
 */
function removeEmptyParagraphs($: any): void {
  $('p').each((_i: number, el: any) => {
    // Only remove if truly empty (no text, no images, no iframes)
    if ($(el).text().trim() === '' && $(el).find('img, iframe').length === 0) {
      $(el).remove();
    }
  });
}

/**
 * Download an HTML file from Moodle with token authentication
 * 
 * @param fileUrl The URL of the HTML file to download
 * @param token Moodle authentication token
 * @returns The HTML content, or null if download failed
 */
export async function downloadHtmlFile(fileUrl: string, token: string): Promise<string | null> {
  try {
    // Add token to URL (same as download-itcpb-html-fixed.js)
    let downloadUrl = fileUrl;
    if (!fileUrl.includes('token=') && !fileUrl.includes('wstoken=')) {
      const separator = fileUrl.includes('?') ? '&' : '?';
      downloadUrl = `${fileUrl}${separator}token=${token}`;
    }

    console.log(`[File] Downloading from: ${fileUrl.substring(0, 80)}...`);

    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      console.error(`[File] HTTP error: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Verify not an error response
    if (html.includes('"errorcode":"missingparam"') || 
        (html.trim().startsWith('{') && html.includes('"error"'))) {
      console.error('[File] Got error response');
      return null;
    }

    return html;
  } catch (error) {
    console.error('[File] Download failed:', error);
    return null;
  }
}
