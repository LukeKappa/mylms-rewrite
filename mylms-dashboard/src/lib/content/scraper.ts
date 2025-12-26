/**
 * Course Content Scraping Service
 * 
 * This service handles bulk downloading and caching of course activity content.
 * It manages batch processing, progress tracking, and cancellation.
 */

import { CacheService } from '../cacheService';
import { getMoodleClient } from '../moodle';
import { cleanHtmlContent, downloadHtmlFile } from './cleaner';
import { MOODLE_CONFIG } from '@/config/moodle';

/**
 * Progress callback for tracking scrape operations
 */
export interface ScrapeProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
  speed?: number;
  estimatedTimeRemaining?: number;
}

/**
 * Result of a scrape operation
 */
export interface ScrapeResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
  stats?: {
    total: number;
    success: number;
    failed: number;
    cached?: number;
    apiSuccess?: number;
    apiFailed?: number;
  };
  scrapedData?: Array<{ url: string; content: string }>;
}

/**
 * Fetch content for a single activity
 * 
 * @param url Activity URL
 * @param token Moodle authentication token
 * @returns Activity content or error
 */
export async function fetchActivityContent(
  url: string,
  token: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const client = await getMoodleClient();
    if (!client) {
      return { success: false, error: 'Failed to create Moodle client' };
    }

    // Extract module ID from URL
    const cmidMatch = url.match(/[?&]id=(\d+)/);
    if (!cmidMatch) {
      console.error('[File] Could not extract module ID from URL');
      return { success: false, error: 'Invalid URL format' };
    }

    const cmid = parseInt(cmidMatch[1]);

    // Get module info to find the course
    const modInfo = await client.call('core_course_get_course_module', { cmid });
    if (!modInfo?.cm) {
      console.error('[File] Could not fetch module info');
      return { success: false, error: 'Module not found' };
    }

    const { course } = modInfo.cm;

    // Get course contents to find HTML files
    const contents = await client.call('core_course_get_contents', { courseid: course });
    
    let htmlFiles: any[] = [];
    
    // Search through all modules to find HTML files for this activity
    for (const section of contents) {
      for (const module of section.modules) {
        if (module.id === cmid && module.contents) {
          // Found our module - get its HTML files
          htmlFiles = module.contents.filter((file: any) => 
            file.filename && (
              file.filename.toLowerCase().endsWith('.html') || 
              file.filename.toLowerCase().endsWith('.htm')
            )
          );
          break;
        }
      }
      if (htmlFiles.length > 0) break;
    }

    if (htmlFiles.length === 0) {
      console.log('[File] No HTML files found for this activity');
      return { success: false, error: 'No HTML content available for this activity' };
    }

    console.log(`[File] Found ${htmlFiles.length} HTML file(s)`);

    // Download and combine all HTML files
    let combinedHtml = '';
    
    for (const file of htmlFiles) {
      try {
        const html = await downloadHtmlFile(file.fileurl, token);
        if (html) {
          combinedHtml += html;
          combinedHtml += '\n\n';
        }
      } catch (error) {
        console.error(`[File] Failed to download ${file.filename}:`, error);
      }
    }

    if (!combinedHtml) {
      return { success: false, error: 'Failed to download any content' };
    }

    // Clean the HTML content
    const cleanedHtml = await cleanHtmlContent(combinedHtml);
    
    return { success: true, content: cleanedHtml };

  } catch (error: any) {
    console.error('[File] Fetch failed:', error?.message || error);
    return { success: false, error: 'Failed to fetch content' };
  }
}

/**
 * Bulk scrape multiple course activities
 * 
 * @param urls Array of activity URLs to scrape
 * @param token Moodle authentication token
 * @param onProgress Optional callback for progress updates
 * @returns Scrape result with statistics
 */
export async function scrapeCourseActivities(
  urls: string[],
  token: string,
  onProgress?: (progress: ScrapeProgress) => void
): Promise<ScrapeResult> {
  console.log(`Starting bulk scrape for ${urls.length} activities...`);
  
  // Clear any existing cancel flag from previous runs
  CacheService.clearCancelFlag();
  
  try {
    let successCount = 0;
    let failCount = 0;
    const scrapedData: Array<{ url: string; content: string }> = [];

    // Speed tracking
    const startTime = Date.now();
    let lastProgressTime = startTime;
    let lastCompletedCount = 0;

    // Filter out already cached URLs
    const uncachedUrls = urls.filter(url => !CacheService.isActivityCached(url));
    const cachedCount = urls.length - uncachedUrls.length;
    
    console.log(`${cachedCount} already cached, ${uncachedUrls.length} to scrape`);
    successCount += cachedCount;

    if (uncachedUrls.length === 0) {
      return { 
        success: true, 
        stats: { total: urls.length, success: successCount, failed: 0 } 
      };
    }

    console.log('[Bulk] Using direct URL fetching');

    let apiSuccessCount = 0;
    let apiFailCount = 0;
    
    // Process in batches to prevent timeouts/congestion
    const BATCH_SIZE = MOODLE_CONFIG.BATCH.BATCH_SIZE;
    
    for (let i = 0; i < uncachedUrls.length; i += BATCH_SIZE) {
      // Check cancellation
      if (CacheService.checkCancelFlag()) {
        return { 
          success: false, 
          error: 'Cancelled by user', 
          cancelled: true 
        };
      }

      const batch = uncachedUrls.slice(i, i + BATCH_SIZE);
      console.log(`[Bulk] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uncachedUrls.length / BATCH_SIZE)}`);
      
      const results = await Promise.all(batch.map(async (url) => {
        try {
          const result = await fetchActivityContent(url, token);
          
          // Cache successful results
          if (result.success && result.content) {
            CacheService.saveActivityContent(url, result.content);
          }
          
          return { url, content: result.content, success: result.success };
        } catch (error) {
          console.error(`[Bulk] Failed to fetch ${url}:`, error);
          return { url, success: false };
        }
      }));

      // Process results
      results.forEach(r => {
        if (r.success && r.content) {
          apiSuccessCount++;
          successCount++;
          scrapedData.push({ url: r.url, content: r.content });
        } else {
          apiFailCount++;
          failCount++;
        }
      });

      // Calculate progress stats
      const currentItemIndex = successCount + failCount;
      const currentTime = Date.now();
      const elapsedTime = (currentTime - lastProgressTime) / 1000; // seconds
      const completedSinceLast = currentItemIndex - lastCompletedCount;
      
      let speed = 0;
      let estimatedTimeRemaining = 0;
      
      if (elapsedTime > 0 && completedSinceLast > 0) {
        speed = completedSinceLast / elapsedTime; // items per second
        const remainingItems = urls.length - currentItemIndex;
        estimatedTimeRemaining = speed > 0 ? remainingItems / speed : 0;
        
        // Update tracking variables
        lastProgressTime = currentTime;
        lastCompletedCount = currentItemIndex;
      }

      // Report progress
      onProgress?.({
        current: currentItemIndex,
        total: urls.length,
        percentage: Math.round((currentItemIndex / urls.length) * 100),
        status: `Downloading ${currentItemIndex}/${urls.length}...`,
        speed: speed > 0 ? speed : undefined,
        estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined,
      });
    }

    console.log(`[Bulk] API Fetch Complete: ${apiSuccessCount} succeeded, ${apiFailCount} failed`);
    
    // Final progress callback
    onProgress?.({
      current: urls.length,
      total: urls.length,
      percentage: 100,
      status: 'Complete'
    });
    
    CacheService.clearCancelFlag(); // Clean up flag
    
    return { 
      success: true, 
      stats: { 
        total: urls.length, 
        success: successCount, 
        failed: failCount,
        cached: cachedCount,
        apiSuccess: apiSuccessCount,
        apiFailed: apiFailCount
      },
      scrapedData
    };

  } catch (error) {
    CacheService.clearCancelFlag(); // Clean up flag on error
    console.error('Bulk scrape error:', error);
    return { success: false, error: 'Bulk scrape failed' };
  }
}
