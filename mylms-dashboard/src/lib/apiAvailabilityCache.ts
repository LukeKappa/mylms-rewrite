import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const API_AVAILABILITY_FILE = path.join(CACHE_DIR, 'api_availability.json');

interface ApiAvailability {
  [endpoint: string]: {
    available: boolean;
    lastChecked: number;
    failureCount: number;
  };
}

/**
 * Service to cache API endpoint availability to avoid repeated failed attempts
 */
/**
 * Service to cache API endpoint availability to avoid repeated failed attempts
 */
class ApiAvailabilityCacheService {
  private cache: ApiAvailability = {};
  private isServerless = !!(process.env.VERCEL || process.env.NODE_ENV === 'production');

  constructor() {
    if (!this.isServerless) {
      this.loadFromFile();
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(API_AVAILABILITY_FILE)) {
        const data = fs.readFileSync(API_AVAILABILITY_FILE, 'utf-8');
        this.cache = JSON.parse(data);
      }
    } catch (error) {
      console.error('[API Cache] Failed to load availability cache:', error);
    }
  }

  private saveToFile() {
    if (this.isServerless) return;
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(API_AVAILABILITY_FILE, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (error) {
      console.error('[API Cache] Failed to save availability cache:', error);
    }
  }

  /**
   * Check if an API endpoint is available (cached result)
   * Returns null if not cached or cache is expired (> 24 hours)
   */
  isAvailable(endpoint: string): boolean | null {
    const entry = this.cache[endpoint];
    
    if (!entry) {
      return null; // Not cached
    }

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const age = Date.now() - entry.lastChecked;
    
    if (age > ONE_DAY) {
      return null; // Cache expired
    }

    // If it's been marked as unavailable multiple times, be more confident
    if (!entry.available && entry.failureCount >= 3) {
      return false;
    }

    return entry.available;
  }

  /**
   * Mark an endpoint as available
   */
  markAvailable(endpoint: string): void {
    this.cache[endpoint] = {
      available: true,
      lastChecked: Date.now(),
      failureCount: 0,
    };
    this.saveToFile();
  }

  /**
   * Mark an endpoint as unavailable
   */
  markUnavailable(endpoint: string): void {
    const existing = this.cache[endpoint];
    
    this.cache[endpoint] = {
      available: false,
      lastChecked: Date.now(),
      failureCount: (existing?.failureCount || 0) + 1,
    };
    this.saveToFile();
  }

  /**
   * Get the entire cache (for admin/debugging)
   */
  getAll(): ApiAvailability {
    return { ...this.cache };
  }

  /**
   * Clear the entire cache (useful for debugging or after Moodle updates)
   */
  clear(): void {
    this.cache = {};
    if (!this.isServerless) {
      try {
        if (fs.existsSync(API_AVAILABILITY_FILE)) {
          fs.unlinkSync(API_AVAILABILITY_FILE);
          console.log('[API Cache] Cleared API availability cache');
        }
      } catch (error) {
        console.error('[API Cache] Failed to clear cache:', error);
      }
    }
  }
}

export const ApiAvailabilityCache = new ApiAvailabilityCacheService();
