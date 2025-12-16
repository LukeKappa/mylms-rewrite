//! LibGen (Library Genesis) integration module
//! Provides search and download functionality for books

pub mod client;
pub mod types;

pub use client::LibGenClient;
pub use types::*;
