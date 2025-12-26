import { CacheService } from '../cacheService';
import fs from 'fs';
import path from 'path';

// Mock the file system for testing
jest.mock('fs');
jest.mock('path');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementations
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedFs.existsSync.mockReturnValue(true);
  });

  describe('getHash', () => {
    it('should generate consistent hash for same URL', () => {
      const url = 'https://example.com/test';
      const hash1 = CacheService.getHash(url);
      const hash2 = CacheService.getHash(url);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hash length
    });

    it('should generate different hashes for different URLs', () => {
      const url1 = 'https://example.com/test1';
      const url2 = 'https://example.com/test2';
      
      const hash1 = CacheService.getHash(url1);
      const hash2 = CacheService.getHash(url2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isActivityCached', () => {
    it('should return true when cache file exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      
      const result = CacheService.isActivityCached('https://example.com/test');
      
      expect(result).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalled();
    });

    it('should return false when cache file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = CacheService.isActivityCached('https://example.com/test');
      
      expect(result).toBe(false);
    });
  });

  describe('saveActivityContent', () => {
    it('should write content to cache file', () => {
      mockedFs.writeFileSync.mockImplementation(() => {});
      
      const url = 'https://example.com/test';
      const content = '<div>Test content</div>';
      
      CacheService.saveActivityContent(url, content);
      
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        content,
        'utf-8'
      );
    });

    it('should handle errors gracefully', () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        CacheService.saveActivityContent('https://example.com/test', 'content');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getActivityContent', () => {
    it('should return content when cache exists', () => {
      const mockContent = '<div>Cached content</div>';
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);
      
      const result = CacheService.getActivityContent('https://example.com/test');
      
      expect(result).toBe(mockContent);
      expect(mockedFs.readFileSync).toHaveBeenCalled();
    });

    it('should return null when cache does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = CacheService.getActivityContent('https://example.com/test');
      
      expect(result).toBe(null);
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Cancel flag management', () => {
    it('should set and check cancel flag', () => {
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(true);
      
      CacheService.setCancelFlag();
      const result = CacheService.checkCancelFlag();
      
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should clear cancel flag', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {});
      
      CacheService.clearCancelFlag();
      
      expect(mockedFs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw error when clearing non-existent flag', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        CacheService.clearCancelFlag();
      }).not.toThrow();
      
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('saveCourseStructure and getCourseStructure', () => {
    it('should save and retrieve course structure', () => {
      const courseData = {
        title: 'Test Course',
        sections: [
          { id: 1, name: 'Section 1', activities: [] }
        ]
      };
      
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(courseData));
      
      CacheService.saveCourseStructure(123, courseData);
      const retrieved = CacheService.getCourseStructure(123);
      
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(retrieved).toEqual(courseData);
    });

    it('should return null for non-existent course cache', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = CacheService.getCourseStructure(999);
      
      expect(result).toBe(null);
    });
  });
});
