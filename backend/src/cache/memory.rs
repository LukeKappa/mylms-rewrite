//! In-memory cache implementation

use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};

/// In-memory cache with TTL support
pub struct MemoryCache {
    store: RwLock<HashMap<String, CacheEntry>>,
}

struct CacheEntry {
    value: String,
    expires_at: Option<Instant>,
}

impl Default for MemoryCache {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryCache {
    pub fn new() -> Self {
        Self {
            store: RwLock::new(HashMap::new()),
        }
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let store = self.store.read().ok()?;
        let entry = store.get(key)?;
        
        // Check if expired
        if let Some(expires_at) = entry.expires_at {
            if Instant::now() > expires_at {
                drop(store);
                self.delete(key);
                return None;
            }
        }
        
        Some(entry.value.clone())
    }

    pub fn set(&self, key: &str, value: &str, ttl: Option<Duration>) -> bool {
        let mut store = match self.store.write() {
            Ok(s) => s,
            Err(_) => return false,
        };
        
        let expires_at = ttl.map(|d| Instant::now() + d);
        
        store.insert(
            key.to_string(),
            CacheEntry {
                value: value.to_string(),
                expires_at,
            },
        );
        
        true
    }

    pub fn delete(&self, key: &str) -> bool {
        let mut store = match self.store.write() {
            Ok(s) => s,
            Err(_) => return false,
        };
        store.remove(key).is_some()
    }

    pub fn has(&self, key: &str) -> bool {
        self.get(key).is_some()
    }

    pub fn clear(&self) -> bool {
        let mut store = match self.store.write() {
            Ok(s) => s,
            Err(_) => return false,
        };
        store.clear();
        true
    }

    /// Get the hash of a URL for use as cache key
    pub fn url_hash(url: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        url.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
}

/// Global cache instance
lazy_static::lazy_static! {
    pub static ref CACHE: MemoryCache = MemoryCache::new();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_set_get() {
        let cache = MemoryCache::new();
        cache.set("key1", "value1", None);
        assert_eq!(cache.get("key1"), Some("value1".to_string()));
    }

    #[test]
    fn test_cache_delete() {
        let cache = MemoryCache::new();
        cache.set("key1", "value1", None);
        cache.delete("key1");
        assert_eq!(cache.get("key1"), None);
    }

    #[test]
    fn test_cache_has() {
        let cache = MemoryCache::new();
        cache.set("key1", "value1", None);
        assert!(cache.has("key1"));
        assert!(!cache.has("key2"));
    }
}
