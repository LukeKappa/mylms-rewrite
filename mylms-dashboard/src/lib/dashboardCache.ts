// Simple in-memory cache for dashboard data
// This stores user info and courses per session to avoid re-scraping

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const DashboardCache = {
  get(key: string): any | null {
    const entry = cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  },

  set(key: string, data: any): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  clear(key: string): void {
    cache.delete(key);
  },

  clearAll(): void {
    cache.clear();
  }
};
