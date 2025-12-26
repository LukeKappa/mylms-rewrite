export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  /**
   * Clear all keys starting with the given prefix/namespace.
   * If no prefix provided, clears everything.
   */
  clear(prefix?: string): Promise<void>;
  has(key: string): Promise<boolean>;
}
