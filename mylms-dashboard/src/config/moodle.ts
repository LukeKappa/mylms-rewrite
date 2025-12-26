/**
 * Centralized configuration for Moodle-specific constants and patterns.
 * This file contains all "magic strings" and configuration values used throughout the app.
 */

export const MOODLE_CONFIG = {
  /**
   * Unwanted content patterns to remove during HTML cleaning
   */
  UNWANTED_CONTENT: {
    /**
     * Phrases related to Kortext e-book integration that should be removed
     */
    KORTEXT_PHRASES: [
      'Sign in to Kortext',
      'Open book in new window',
      'You will only be able to access the book on Kortext'
    ],
    
    /**
     * Phrases related to prescribed reading blocks
     */
    PRESCRIBED_READING_PHRASES: [
      'Prescribed Reading'
    ],
    
    /**
     * CSS selectors for container elements to remove
     */
    CONTAINER_SELECTORS: [
      '.no-overflow',
      '.box',
      '.generalbox',
      '.prescribed-reading'
    ],
    
    /**
     * Navigation and metadata selectors to remove
     */
    NAVIGATION_SELECTORS: [
      'nav',
      '.navigation',
      '.breadcrumb',
      '#page-header',
      '.modified',
      '.activity-navigation'
    ]
  },

  /**
   * URL patterns and endpoints
   */
  URL_PATTERNS: {
    /**
     * Base Moodle URL from environment or default
     */
    MOODLE_BASE: process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net',
    
    /**
     * Moodle hostname for internal link detection
     */
    MOODLE_HOSTNAME: 'mylms.vossie.net',
    
    /**
     * Webservice REST API endpoint
     */
    WEBSERVICE_ENDPOINT: '/webservice/rest/server.php'
  },

  /**
   * Cache configuration
   */
  CACHE: {
    /**
     * Cookie max age in seconds (90 days)
     */
    TOKEN_MAX_AGE: 60 * 60 * 24 * 90,
    
    /**
     * Selected courses cookie max age (1 year)
     */
    COURSES_MAX_AGE: 60 * 60 * 24 * 365
  },

  /**
   * Batch processing configuration
   */
  BATCH: {
    /**
     * Number of activities to fetch in parallel
     */
    BATCH_SIZE: 25
  },

  /**
   * Moodle Mobile App service name
   */
  SERVICE: 'moodle_mobile_app'
} as const;

/**
 * Helper to get the full webservice URL
 */
export function getWebserviceUrl(): string {
  return `${MOODLE_CONFIG.URL_PATTERNS.MOODLE_BASE}${MOODLE_CONFIG.URL_PATTERNS.WEBSERVICE_ENDPOINT}`;
}

/**
 * Check if a URL is an internal Moodle link
 */
export function isMoodleUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === MOODLE_CONFIG.URL_PATTERNS.MOODLE_HOSTNAME;
  } catch {
    return false;
  }
}
