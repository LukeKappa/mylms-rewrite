/**
 * @jest-environment node
 */

import { getMoodleClient } from '../moodle';
import { cookies } from 'next/headers';

// Mock the cookies function
jest.mock('next/headers');
const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('Moodle Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('getMoodleClient', () => {
    it('should return null when no token or session cookie exists', async () => {
      mockedCookies.mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      } as any);

      const client = await getMoodleClient();
      
      expect(client).toBeNull();
    });

    it('should return client when token exists', async () => {
      mockedCookies.mockResolvedValue({
        get: jest.fn((name: string) => {
          if (name === 'moodle_token') {
            return { value: 'test-token' };
          }
          return undefined;
        }),
      } as any);

      const client = await getMoodleClient();
      
      expect(client).not.toBeNull();
      expect(client).toHaveProperty('call');
      expect(client).toHaveProperty('getSiteInfo');
      expect(client).toHaveProperty('getUserCourses');
    });

    it('should return client when session cookie exists', async () => {
      mockedCookies.mockResolvedValue({
        get: jest.fn((name: string) => {
          if (name === 'moodle_session') {
            return { value: 'test-session' };
          }
          if (name === 'moodle_cookie_name') {
            return { value: 'MoodleSession' };
          }
          return undefined;
        }),
      } as any);

      const client = await getMoodleClient();
      
      expect(client).not.toBeNull();
    });
  });

  describe('Moodle API calls', () => {
    beforeEach(() => {
      mockedCookies.mockResolvedValue({
        get: jest.fn((name: string) => {
          if (name === 'moodle_token') {
            return { value: 'test-token-123' };
          }
          return undefined;
        }),
      } as any);
    });

    it('should make successful API call', async () => {
      const mockResponse = { userid: 1, username: 'testuser' };
      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const client = await getMoodleClient();
      const result = await client!.call('core_webservice_get_site_info');
      
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webservice/rest/server.php'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = { 
        exception: 'invalid_token_exception',
        message: 'Invalid token' 
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockError),
      });

      const client = await getMoodleClient();
      
      await expect(client!.call('core_webservice_get_site_info')).rejects.toThrow('Invalid token');
    });

    it('should pass parameters correctly', async () => {
      const mockResponse = { courses: [] };
      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const client = await getMoodleClient();
      await client!.call('core_enrol_get_users_courses', { userid: 42 });
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = fetchCall[1].body;
      
      expect(body).toContain('userid=42');
      expect(body).toContain('wstoken=test-token-123');
      expect(body).toContain('wsfunction=core_enrol_get_users_courses');
    });
  });

  describe('getCourseModule', () => {
    beforeEach(() => {
      mockedCookies.mockResolvedValue({
        get: jest.fn((name: string) => {
          if (name === 'moodle_token') {
            return { value: 'test-token' };
          }
          return undefined;
        }),
      } as any);
    });

    it('should fetch course module by ID', async () => {
      const mockModule = {
        cm: {
          id: 123,
          modname: 'page',
          name: 'Test Page',
        }
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockModule),
      });

      const client = await getMoodleClient();
      const result = await client!.getCourseModule(123);
      
      expect(result).toEqual(mockModule);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = fetchCall[1].body;
      expect(body).toContain('cmid=123');
      expect(body).toContain('wsfunction=core_course_get_course_module');
    });
  });

  describe('Content type methods', () => {
    beforeEach(() => {
      mockedCookies.mockResolvedValue({
        get: jest.fn((name: string) => {
          if (name === 'moodle_token') {
            return { value: 'test-token' };
          }
          return undefined;
        }),
      } as any);
    });

    it('should fetch book contents', async () => {
      const mockBook = {
        items: [
          { id: 1, title: 'Chapter 1', content: '<p>Content</p>' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockBook),
      });

      const client = await getMoodleClient();
      const result = await client!.getBookContents(456);
      
      expect(result).toEqual(mockBook);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = fetchCall[1].body;
      expect(body).toContain('bookid=456');
      expect(body).toContain('wsfunction=mod_book_get_book_contents');
    });
  });
});
