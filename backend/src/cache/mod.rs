//! Caching module

mod memory;

pub use memory::*;

use std::time::Duration;

/// Cache trait for pluggable cache backends
#[async_trait::async_trait]
pub trait CacheBackend: Send + Sync {
    async fn get(&self, key: &str) -> Option<String>;
    async fn set(&self, key: &str, value: &str, ttl: Option<Duration>) -> bool;
    async fn delete(&self, key: &str) -> bool;
    async fn has(&self, key: &str) -> bool;
    async fn clear(&self) -> bool;
}
