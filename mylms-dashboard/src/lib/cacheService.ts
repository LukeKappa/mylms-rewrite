import crypto from 'crypto';
import path from 'path';
import { CacheAdapter } from './cache/types';
import { FileSystemCacheAdapter } from './cache/fileSystemAdapter';
import { InMemoryCacheAdapter } from './cache/inMemoryAdapter';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';
let adapter: CacheAdapter = isServerless 
  ? new InMemoryCacheAdapter() 
  : new FileSystemCacheAdapter(CACHE_DIR);

export const CacheService = {
  /**
   * Inject a custom cache adapter (e.g., Redis, S3)
   */
  setAdapter(newAdapter: CacheAdapter): void {
    adapter = newAdapter;
  },

  getAdapter(): CacheAdapter {
    return adapter;
  },

  // Generate a stable hash for a URL to use as key
  getHash(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  },

  // Save activity content (HTML)
  saveActivityContent(url: string, content: string): void {
    const hash = this.getHash(url);
    adapter.set(`activity:${hash}`, content).catch(err => 
      console.error(`[Cache] Failed to save activity:`, err)
    );
  },

  // Get activity content if exists
  getActivityContent(url: string): string | null {
    const hash = this.getHash(url);
    // Adapter.get is async, but we need sync for backward compatibility
    // For FileSystem adapter, we can make it work synchronously
    // For Redis, we'd need to refactor callers to be async
    // For now, we'll use a workaround for FS
    try {
      // This is a temporary sync wrapper - ideally we'd make the whole stack async
      const result = adapter.get(`activity:${hash}`);
      if (result instanceof Promise) {
        // Block on promise (not ideal, but maintains compatibility)
        let value: string | null = null;
        result.then(v => value = v);
        // Busy wait (very hacky, but temporary)
        const start = Date.now();
        while (value === null && Date.now() - start < 100) {}
        return value;
      }
      return result as string | null;
    } catch (error) {
      console.error('[Cache] Failed to get activity:', error);
      return null;
    }
  },

  // Save course structure (sections list)
  saveCourseStructure(courseId: number, data: any): void {
    adapter.set(`course:${courseId}`, JSON.stringify(data, null, 2)).catch(err =>
      console.error(`[Cache] Failed to save course structure:`, err)
    );
  },

  // Get course structure
  getCourseStructure(courseId: number): any | null {
    try {
      const result = adapter.get(`course:${courseId}`);
      if (result instanceof Promise) {
        let value: string | null = null;
        result.then(v => value = v);
        const start = Date.now();
        while (value === null && Date.now() - start < 100) {}
        if (value) return JSON.parse(value);
        return null;
      }
      return result ? JSON.parse(result as string) : null;
    } catch (error) {
      console.error('[Cache] Failed to get course structure:', error);
      return null;
    }
  },

  // Check if activity is cached
  isActivityCached(url: string): boolean {
    const hash = this.getHash(url);
    try {
      const result = adapter.has(`activity:${hash}`);
      if (result instanceof Promise) {
        let value = false;
        result.then(v => value = v);
        const start = Date.now();
        while (value === false && Date.now() - start < 100) {}
        return value;
      }
      return result as boolean;
    } catch {
      return false;
    }
  },

  // Clear all cache
  clearAllCache(): { success: boolean; message: string } {
    try {
      console.log('[Cache] Starting cache clear...');
      
      // Use adapter to clear both activities and courses
      adapter.clear().catch(err => console.error('[Cache] Clear failed:', err));

      console.log('[Cache] Cache cleared');
      
      return { 
        success: true, 
        message: 'Cache cleared successfully'
      };
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return { success: false, message: 'Failed to clear cache' };
    }
  },

  // Clear specific course cache
  clearCourseCache(courseId: number): { success: boolean; message: string } {
    try {
      adapter.delete(`course:${courseId}`).catch(err =>
        console.error('[Cache] Failed to delete course:', err)
      );
      return { success: true, message: 'Course cache cleared' };
    } catch (error) {
      console.error('Failed to clear course cache:', error);
      return { success: false, message: 'Failed to clear cache' };
    }
  },

  // Cancellation flag management
  setCancelFlag(): void {
    adapter.set('cancel.flag', Date.now().toString()).catch(err =>
      console.error('[Cache] Failed to set cancel flag:', err)
    );
  },

  checkCancelFlag(): boolean {
    try {
      const result = adapter.has('cancel.flag');
      if (result instanceof Promise) {
        let value = false;
        result.then(v => value = v);
        const start = Date.now();
        while (value === false && Date.now() - start < 100) {}
        return value;
      }
      return result as boolean;
    } catch {
      return false;
    }
  },

  clearCancelFlag(): void {
    adapter.delete('cancel.flag').catch(err =>
      console.error('[Cache] Failed to clear cancel flag:', err)
    );
  }
};
