# MyLMS Backend - Rust API Server

A high-performance Rust backend for the MyLMS Dashboard, providing Moodle API integration, content cleaning, and caching.

## Quick Start

```bash
# Development
cp .env.example .env
cargo run

# Server runs at http://localhost:3001
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Token login, returns user info |
| POST | `/api/auth/validate` | Validate token |
| GET | `/api/courses` | List enrolled courses |
| GET | `/api/courses/:id` | Get course contents |
| GET | `/api/content/activity?url=...` | Fetch cleaned activity HTML |
| DELETE | `/api/content/cache` | Clear cache |

All endpoints require: `Authorization: Bearer <moodle_token>`

## Architecture

- **Framework**: Axum 0.8
- **Moodle Client**: reqwest-based API client
- **HTML Cleaning**: scraper + lol_html
- **Caching**: In-memory with TTL (Redis-ready)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `3001` | Server port |
| `MOODLE_URL` | `https://mylms.vossie.net` | Moodle base URL |
| `REDIS_URL` | - | Optional Redis connection |
| `RUST_LOG` | - | Log level filter |

## Docker

```bash
docker build -t mylms-backend .
docker run -p 3001:3001 mylms-backend
```

Or use Docker Compose from the parent directory:

```bash
cd ..
docker-compose up --build
```
