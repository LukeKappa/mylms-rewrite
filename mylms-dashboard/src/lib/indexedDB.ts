
const DB_NAME = 'mylms-cache';
const DB_VERSION = 1;
const STORES = {
  ACTIVITIES: 'activities',
  COURSES: 'courses',
  IMAGES: 'images'
};

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isClosing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initPromise = this.open();
    }
  }

  private async ensureConnection(): Promise<IDBDatabase> {
    // If db is null or closing, reopen
    if (!this.db || this.isClosing) {
      this.initPromise = this.open();
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  private open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isClosing = false;
        
        // Handle database closing unexpectedly
        this.db.onclose = () => {
          console.log('IndexedDB connection closed, will reconnect on next operation');
          this.isClosing = true;
        };
        
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
          db.createObjectStore(STORES.ACTIVITIES, { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains(STORES.COURSES)) {
          db.createObjectStore(STORES.COURSES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          db.createObjectStore(STORES.IMAGES, { keyPath: 'url' });
        }
      };
    });
  }

  async get<T>(storeName: string, key: string | number): Promise<T | null> {
    try {
      const db = await this.ensureConnection();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  }

  async set<T>(storeName: string, key: string | number, data: T): Promise<void> {
    try {
      const db = await this.ensureConnection();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ [store.keyPath as string]: key, data, timestamp: Date.now() });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB set error:', error);
    }
  }

  // Specific methods for our use cases
  async getCourse(id: number | string) {
    return this.get(STORES.COURSES, Number(id));
  }

  async saveCourse(id: number | string, data: any) {
    return this.set(STORES.COURSES, Number(id), data);
  }

  async getActivity(url: string) {
    return this.get<string>(STORES.ACTIVITIES, url);
  }

  async saveActivity(url: string, content: string) {
    return this.set(STORES.ACTIVITIES, url, content);
  }

  async clear() {
    try {
      const db = await this.ensureConnection();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORES.ACTIVITIES, STORES.COURSES, STORES.IMAGES], 'readwrite');
        
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();

        transaction.objectStore(STORES.ACTIVITIES).clear();
        transaction.objectStore(STORES.COURSES).clear();
        transaction.objectStore(STORES.IMAGES).clear();
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
    }
  }
}

export const dbService = new IndexedDBService();
