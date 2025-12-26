//! Backend API Client
//! 
//! This module provides a client for communicating with the Rust backend.
//! Used by both client components (directly) and API routes (as proxy).

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface BackendResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface UserInfo {
  userid: number;
  username: string;
  fullname: string;
  userpictureurl?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

export interface Course {
  id: number;
  shortname: string;
  fullname: string;
  displayname?: string;
  summary?: string;
  startdate?: number;
  enddate?: number;
  visible?: boolean;
  progress?: number;
}

export interface CoursesResponse {
  courses: Course[];
  userid: number;
  fullname: string;
}

export interface Section {
  id: number;
  name: string;
  visible?: number;
  summary?: string;
  section: number;
  uservisible?: boolean;
  modules: any[];
  activities: Activity[];
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  url: string;
  modname: string;
  completed?: boolean;
}

export interface CourseContentsResponse {
  sections: Section[];
}

export interface ContentResponse {
  success: boolean;
  content?: string;
  cached?: boolean;
  error?: string;
}

/**
 * Backend API Client
 */
export const backendClient = {
  /**
   * Login with Moodle token
   */
  async login(token: string): Promise<LoginResponse> {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return response.json();
  },

  /**
   * Validate a token
   */
  async validateToken(token: string): Promise<{ valid: boolean }> {
    const response = await fetch(`${BACKEND_URL}/api/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return response.json();
  },

  /**
   * Get user's enrolled courses
   */
  async getCourses(token: string): Promise<CoursesResponse> {
    const response = await fetch(`${BACKEND_URL}/api/courses`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get course contents
   */
  async getCourseContents(token: string, courseId: number): Promise<CourseContentsResponse> {
    const response = await fetch(`${BACKEND_URL}/api/courses/${courseId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch course contents: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get cleaned activity content
   */
  async getActivityContent(token: string, activityUrl: string): Promise<ContentResponse> {
    const response = await fetch(
      `${BACKEND_URL}/api/content/activity?url=${encodeURIComponent(activityUrl)}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    return response.json();
  },

  /**
   * Batch prefetch multiple activities in a single call
   */
  async batchPrefetch(token: string, urls: string[]): Promise<{
    success: boolean;
    total: number;
    loaded: number;
    items: Array<{
      url: string;
      success: boolean;
      content?: string;
      error?: string;
    }>;
  }> {
    const response = await fetch(`${BACKEND_URL}/api/content/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ urls }),
    });
    return response.json();
  },

  /**
   * Export course content as PDF (uses prefetched content)
   */
  async exportPdf(title: string, sections: Array<{ name: string; content: string }>): Promise<Blob> {
    const response = await fetch(`${BACKEND_URL}/api/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, sections }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'PDF export failed');
    }
    
    return response.blob();
  },

  /**
   * Clear backend cache
   */
  async clearCache(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${BACKEND_URL}/api/content/cache`, {
      method: 'DELETE',
    });
    return response.json();
  },
};

/**
 * Get the backend URL for use in other modules
 */
export function getBackendUrl(): string {
  return BACKEND_URL;
}
