import { MoodleToken, MoodleSiteInfo, MoodleCourse, CourseSection, Activity, ResourceMaps } from './types';
import { ApiAvailabilityCache } from '../apiAvailabilityCache';
import { TelemetryService } from '../telemetry';

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://mylms.vossie.net';
const SERVICE = 'moodle_mobile_app';

export class MoodleClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = `${MOODLE_URL}/webservice/rest/server.php`;
  }

  public async call(wsfunction: string, args: Record<string, any> = {}) {
    const params = new URLSearchParams({
      wstoken: this.token,
      wsfunction,
      moodlewsrestformat: 'json',
      ...args,
    });

    const start = performance.now();
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.exception || data.errorcode) {
        throw new Error(data.message || data.errorcode);
      }

      TelemetryService.recordSuccess(wsfunction, performance.now() - start);
      return data;
    } catch (error) {
      TelemetryService.recordFailure(wsfunction, error instanceof Error ? error.message : 'Unknown error');
      console.error(`[Moodle API] Error calling ${wsfunction}:`, error);
      throw error;
    }
  }

  async getSiteInfo(): Promise<MoodleSiteInfo> {
    return this.call('core_webservice_get_site_info');
  }

  async getUserCourses(userid: number): Promise<MoodleCourse[]> {
    return this.call('core_enrol_get_users_courses', { userid });
  }

  async getCourseContents(courseid: number): Promise<CourseSection[]> {
    const data = await this.call('core_course_get_contents', { courseid });
    
    // Process contents to extract activities
    return data.map((section: any) => ({
      ...section,
      activities: section.modules.map((mod: any) => ({
        id: mod.id,
        name: mod.name,
        type: mod.modplural,
        url: mod.url,
        modname: mod.modname,
        completed: mod.completiondata?.state === 1 || mod.completiondata?.state === 2
      }))
    }));
  }

  async getCourseModule(cmid: number): Promise<any> {
    return this.call('core_course_get_course_module', { cmid });
  }

  async getBookContents(bookid: number): Promise<any> {
    return this.call('mod_book_get_book_contents', { bookid });
  }

  /**
   * Batch pre-fetch resources for multiple courses to solve N+1 problem
   */
  async batchFetchResources(courseIds: number[]): Promise<ResourceMaps> {
    const resourceMaps: ResourceMaps = {
      pages: new Map(),
      resources: new Map(),
      folders: new Map(),
      urls: new Map(),
      lessons: new Map(),
      books: new Map()
    };

    if (courseIds.length === 0) return resourceMaps;

    console.log(`[Batch] Pre-fetching resources for courses: ${courseIds.join(', ')}`);

    // We need to fetch course contents for all courses
    // Moodle doesn't have a bulk "get contents for multiple courses" endpoint easily accessible
    // so we'll do parallel requests
    
    const promises = courseIds.map(id => this.call('core_course_get_contents', { courseid: id }));
    const results = await Promise.all(promises);

    results.forEach((sections: any[]) => {
      sections.forEach(section => {
        section.modules.forEach((mod: any) => {
          // Map module IDs to their contents if available
          if (mod.contents && mod.contents.length > 0) {
             // Check for Page content (often in contents[0] if it's a file, but Pages are different)
             // Actually, core_course_get_contents returns 'contents' for Resources, Folders, URLs
             // For Pages, it might return the HTML in 'contents' if it's a file, but usually Pages need mod_page_get_pages_by_courses
          }
        });
      });
    });

    // Fetch specific module types in bulk
    // 1. Pages
    try {
      const pages = await this.call('mod_page_get_pages_by_courses', { courseids: courseIds });
      if (pages && pages.pages) {
        pages.pages.forEach((page: any) => {
          if (page.coursemodule) resourceMaps.pages.set(page.coursemodule, page.content);
        });
        console.log(`[Batch] Cached ${pages.pages.length} pages`);
      }
    } catch (e) { console.warn('[Batch] Failed to fetch pages', e); }

    // 2. Resources (Files)
    try {
      const resources = await this.call('mod_resource_get_resources_by_courses', { courseids: courseIds });
      if (resources && resources.resources) {
        resources.resources.forEach((res: any) => {
          // For resources, we often want the file URL or content if it's inline
          // But usually resources are files. If we want description/intro:
          if (res.coursemodule && res.intro) resourceMaps.resources.set(res.coursemodule, res.intro);
        });
        console.log(`[Batch] Cached ${resources.resources.length} resources info`);
      }
    } catch (e) { console.warn('[Batch] Failed to fetch resources', e); }

    // 3. Folders
    try {
      const folders = await this.call('mod_folder_get_folders_by_courses', { courseids: courseIds });
      if (folders && folders.folders) {
        folders.folders.forEach((folder: any) => {
           // Construct a simple HTML list for the folder
           let html = `<div class="folder-content"><h3>${folder.name}</h3>`;
           if (folder.intro) html += `<div class="intro">${folder.intro}</div>`;
           // Note: API doesn't always return files here, might need to rely on course contents
           html += `</div>`;
           if (folder.coursemodule) resourceMaps.folders.set(folder.coursemodule, html);
        });
        console.log(`[Batch] Cached ${folders.folders.length} folders`);
      }
    } catch (e) { console.warn('[Batch] Failed to fetch folders', e); }

    // 4. URLs
    try {
      const urls = await this.call('mod_url_get_urls_by_courses', { courseids: courseIds });
      if (urls && urls.urls) {
        urls.urls.forEach((url: any) => {
          const html = `<div class="url-resource"><a href="${url.externalurl}" target="_blank" class="btn btn-primary">Open Link: ${url.name}</a><div class="intro">${url.intro || ''}</div></div>`;
          if (url.coursemodule) resourceMaps.urls.set(url.coursemodule, html);
        });
        console.log(`[Batch] Cached ${urls.urls.length} URLs`);
      }
    } catch (e) { console.warn('[Batch] Failed to fetch URLs', e); }

    // 5. Lessons
    try {
      const lessons = await this.call('mod_lesson_get_lessons_by_courses', { courseids: courseIds });
      if (lessons && lessons.lessons) {
        lessons.lessons.forEach((lesson: any) => {
           // Lessons are complex, but we can cache the intro
           if (lesson.coursemodule) resourceMaps.lessons.set(lesson.coursemodule, lesson.intro || 'Lesson content available when logged in.');
        });
        console.log(`[Batch] Cached ${lessons.lessons.length} lessons`);
      }
    } catch (e) { console.warn('[Batch] Failed to fetch lessons', e); }

    // 6. Books - Just mark them as existing so we know to skip API and use scraper
    try {
      const books = await this.call('mod_book_get_books_by_courses', { courseids: courseIds });
      if (books && books.books) {
        books.books.forEach((book: any) => {
          if (book.coursemodule) {
            resourceMaps.books.set(book.coursemodule, {
              id: book.id,
              coursemodule: book.coursemodule,
              name: book.name,
              intro: book.intro
            });
          }
        });
        console.log(`[Batch] Identified ${books.books.length} books (will use scraper)`);
      }
    } catch (e) { 
        // mod_book might not be enabled or available
        console.warn('[Batch] Failed to fetch books (might be unavailable via API)', e); 
    }

    return resourceMaps;
  }
}


/**
 * Get a Moodle client instance for the current request.
 * Creates a new instance per request to avoid state leakage in serverless environments.
 * 
 * @param token Optional token to use. If not provided, will attempt to fetch from cookies.
 * @returns MoodleClient instance or null if no token is available
 */
export async function getMoodleClient(token?: string): Promise<MoodleClient | null> {
  if (!token) {
    // Try to get token from cookies
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    token = cookieStore.get('moodle_token')?.value;
  }

  if (token) {
    // Return a new instance for this request (safer for serverless)
    return new MoodleClient(token);
  }

  return null;
}
