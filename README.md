# MyLMS

**A modern, high-performance dashboard for Moodle-based Learning Management Systems**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Rust](https://img.shields.io/badge/Rust-Axum-orange?logo=rust)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

---

## Features

### API-First Architecture
- **Direct API Access** — Fetches Pages, Resources, Folders, URLs, and Lessons instantly via the Moodle Mobile API
- **N+1 Optimization** — Pre-fetches resource maps in batches to eliminate redundant API calls
- **High-Performance Backend** — Rust-powered API server for lightning-fast content cleaning and processing

### Offline-First Design
- **Client-Side Caching** — Uses IndexedDB to store course structure and content locally
- **Multi-Layer Caching** — Browser, Server, and Redis caching hierarchy for optimal performance
- **Instant Navigation** — Previously visited pages load instantly without network requests

### Clean Reading Experience
- **Distraction-Free UI** — Standardized typography for comfortable reading
- **Dark Mode** — Native dark mode support for all content
- **LaTeX Support** — Beautiful mathematical equation rendering with KaTeX

### Flexible Authentication
- **Token-Based Auth** — Secure access via Moodle Mobile Token
- **Session Persistence** — Seamless user experience across sessions

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│    Frontend     │────▶│     Backend      │────▶│     Moodle      │
│   (Next.js)     │     │     (Rust)       │     │      API        │
│   Port: 3000    │     │   Port: 3001     │     │                 │
│                 │     │                  │     │                 │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │      Redis      │
                        │    (Caching)    │
                        │   Port: 6379    │
                        └─────────────────┘
```

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript | Modern web dashboard with offline support |
| **Backend** | Rust, Axum 0.8, Tokio | High-performance API server and content processor |
| **Caching** | Redis 7, IndexedDB | Multi-layer caching for speed and offline access |

---

## Quick Start

### Prerequisites
- [Node.js 20+](https://nodejs.org/)
- [Rust 1.70+](https://rustup.rs/)
- [Docker](https://docker.com/) (optional, for production)

### Development Setup (Recommended)

The fastest way to develop with hot-reload:

```powershell
# First time: install dependencies
.\dev.ps1 -Install

# Start both services with hot-reload
.\dev.ps1
```

Or manually:

```powershell
# Terminal 1: Backend with hot-reload
cd backend
$env:RUST_LOG="mylms_backend=debug"
cargo watch -x run

# Terminal 2: Frontend
cd mylms-dashboard
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

Changes to Rust files automatically recompile. Changes to Next.js files hot-reload instantly.

### Docker Compose (Production)

```bash
docker-compose up --build
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOODLE_URL` | `https://mylms.vossie.net` | Your Moodle instance URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |
| `REDIS_URL` | - | Redis connection string |
| `RUST_LOG` | - | Rust log level filter |

---

## Usage

1. **Login** — Enter your Moodle Mobile Token to authenticate
2. **Dashboard** — View all your enrolled courses at a glance
3. **Download** — Click the download icon on a course to cache it for offline use
4. **Read** — Enjoy a clean, distraction-free reading experience
5. **Clear Cache** — Use the trash icon to refresh content when needed

---

## Project Structure

```
mylms-rewrite/
├── backend/              # Rust API server
│   ├── src/
│   │   ├── main.rs       # Application entry point
│   │   ├── content/      # Content cleaning and processing
│   │   │   └── cleaner.rs
│   │   └── moodle/       # Moodle API client
│   └── Cargo.toml
│
├── mylms-dashboard/      # Next.js frontend
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   └── lib/          # Core logic and utilities
│   │       ├── moodle/   # API client and auth
│   │       └── cache/    # Caching adapters
│   └── package.json
│
├── dev.ps1               # Development script (hot-reload)
└── docker-compose.yml    # Full-stack Docker setup
```

---

## Development

### Hot-Reload Workflow

For the fastest iteration:

| Service | Command | Auto-Reload |
|---------|---------|-------------|
| Backend | `cargo watch -x run` | On save |
| Frontend | `npm run dev` | Instant HMR |

### Backend Development

```powershell
cd backend

# Run with debug logging
$env:RUST_LOG="mylms_backend=debug,tower_http=debug"
cargo watch -x run

# Run tests
cargo test

# Check without building
cargo check
```

### Frontend Development

```powershell
cd mylms-dashboard

npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
npm test         # Jest tests
```

---

## TODO

The following features are planned for future development:

- [ ] Fix assignments
- [ ] Notes downloading
- [ ] Google Drive/OneDrive integration
- [ ] User account creation
- [ ] Saving tokens to account
- [ ] Automatic prescribed book acquisition
- [ ] Theme customisation
- [ ] More functional dashboard (favourites, recently viewed, downloaded items)
- [ ] More functional book integration

---

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
