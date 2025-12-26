import fs from 'fs';
import path from 'path';
import { CacheAdapter } from './types';

export class FileSystemCacheAdapter implements CacheAdapter {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  }

  private getPath(key: string): string {
    // Map prefixes to subdirectories to maintain existing structure
    if (key.startsWith('activity:')) {
      const dir = path.join(this.baseDir, 'activities');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // key is "activity:HASH", we want "HASH.html"
      const filename = key.replace('activity:', '') + '.html';
      return path.join(dir, filename);
    }
    if (key.startsWith('course:')) {
      const dir = path.join(this.baseDir, 'courses');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // key is "course:ID", we want "ID.json"
      const filename = key.replace('course:', '') + '.json';
      return path.join(dir, filename);
    }
    
    // Default for other keys (like cancel flag)
    return path.join(this.baseDir, key.replace(/[^a-z0-9\-_.]/gi, '_'));
  }

  async get(key: string): Promise<string | null> {
    const filePath = this.getPath(key);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }

  async set(key: string, value: string): Promise<void> {
    const filePath = this.getPath(key);
    fs.writeFileSync(filePath, value, 'utf-8');
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getPath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async has(key: string): Promise<boolean> {
    const filePath = this.getPath(key);
    return fs.existsSync(filePath);
  }

  async clear(prefix?: string): Promise<void> {
    // If prefix matches our mapped directories, clear them
    if (prefix === 'activity:') {
      const dir = path.join(this.baseDir, 'activities');
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => fs.unlinkSync(path.join(dir, file)));
      }
      return;
    }

    if (prefix === 'course:') {
      const dir = path.join(this.baseDir, 'courses');
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => fs.unlinkSync(path.join(dir, file)));
      }
      return;
    }

    // If no prefix or unknown prefix, we might need to iterate everything
    // For now, let's support clearing everything if no prefix
    if (!prefix) {
      // Clear activities
      const activitiesDir = path.join(this.baseDir, 'activities');
      if (fs.existsSync(activitiesDir)) {
        fs.readdirSync(activitiesDir).forEach(f => fs.unlinkSync(path.join(activitiesDir, f)));
      }

      // Clear courses
      const coursesDir = path.join(this.baseDir, 'courses');
      if (fs.existsSync(coursesDir)) {
        fs.readdirSync(coursesDir).forEach(f => fs.unlinkSync(path.join(coursesDir, f)));
      }

      // Clear root files
      fs.readdirSync(this.baseDir).forEach(f => {
        const filePath = path.join(this.baseDir, f);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  }
}
