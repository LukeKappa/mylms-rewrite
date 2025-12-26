'use server';

import { cookies } from 'next/headers';
import { CacheService } from '../lib/cacheService';
import { getMoodleClient, ResourceMaps } from '../lib/moodle';
import { fetchActivityContent, scrapeCourseActivities as bulkScrape } from '../lib/content/scraper';
import { MOODLE_CONFIG, getWebserviceUrl } from '@/config/moodle';

export async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('moodle_token');
  return !!token;
}

export async function loginWithToken(token: string) {
  try {
    console.log('[Login] Verifying token...');
    
    // Verify token by fetching site info
    const params = new URLSearchParams({
      wstoken: token,
      wsfunction: 'core_webservice_get_site_info',
      moodlewsrestformat: 'json',
    });

    const response = await fetch(getWebserviceUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.exception || data.errorcode) {
      console.error('[Login] Token verification failed:', data);
      return { success: false, error: 'Invalid token. Please check and try again.' };
    }

    console.log('[Login] Token verified for user:', data.fullname);

    // Store the token in cookies
    const cookieStore = await cookies();
    
    cookieStore.set('moodle_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MOODLE_CONFIG.CACHE.TOKEN_MAX_AGE,
    });

    return { success: true };

  } catch (error) {
    console.error('[Login] Token login error:', error);
    return { success: false, error: 'Failed to verify token' };
  }
}

export async function saveSelectedCourses(courseIds: string[]) {
  const cookieStore = await cookies();
  cookieStore.set('selected_courses', JSON.stringify(courseIds), {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MOODLE_CONFIG.CACHE.COURSES_MAX_AGE,
  });
  return { success: true };
}

export async function getSelectedCourses(): Promise<string[]> {
  const cookieStore = await cookies();
  const value = cookieStore.get('selected_courses')?.value;
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function getActivityContent(url: string, resourceMaps?: ResourceMaps) {
  // Check cache first
  if (CacheService.isActivityCached(url)) {
    console.log(`[Cache] Hit for ${url}`);
    const content = CacheService.getActivityContent(url);
    return { success: true, content };
  }

  console.log(`[File] Fetching content for ${url}`);
  const cookieStore = await cookies();
  const token = cookieStore.get('moodle_token')?.value;

  if (!token) {
    console.error('[Auth] No token found - user not authenticated');
    return { error: 'Not authenticated' };
  }

  try {
    // Use the scraper service to fetch and clean content
    const result = await fetchActivityContent(url, token);
    
    if (result.success && result.content) {
      // Cache the result
      console.log('[File] Successfully fetched and cleaned content, caching...');
      CacheService.saveActivityContent(url, result.content);
      return { success: true, content: result.content };
    } else {
      return { error: result.error || 'Failed to fetch content' };
    }
  } catch (error: any) {
    console.error('[File] Fetch failed:', error?.message || error);
    return { error: 'Failed to fetch content' };
  }
}

export async function scrapeCourseActivities(
  urls: string[],
  onProgress?: (progress: { current: number; total: number; percentage: number; status: string; speed?: number; estimatedTimeRemaining?: number }) => void
) {
  console.log(`Starting bulk scrape for ${urls.length} activities...`);
  
  const cookieStore = await cookies();
  const token = cookieStore.get('moodle_token')?.value;

  if (!token) {
    return { error: 'Not authenticated' };
  }

  try {
    // Use the scraper service
    const result = await bulkScrape(urls, token, onProgress);
    return result;
  } catch (error) {
    console.error('Bulk scrape error:', error);
    return { error: 'Bulk scrape failed' };
  }
}

export async function cancelSync() {
  try {
    CacheService.setCancelFlag();
    // Also clear the cache to remove partially downloaded content
    CacheService.clearAllCache();
    return { success: true, message: 'Sync cancelled and cache cleared' };
  } catch (error) {
    console.error('Cancel sync error:', error);
    return { success: false, message: 'Failed to cancel' };
  }
}

export async function clearCache() {
  try {
    const result = CacheService.clearAllCache();
    return result;
  } catch (error) {
    console.error('Clear cache error:', error);
    return { success: false, message: 'Failed to clear cache' };
  }
}
