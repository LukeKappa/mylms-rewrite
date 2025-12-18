# MyLMS

<p align="center">
  <strong>A modern, high-performance dashboard for Moodle-based Learning Management Systems</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Rust-Axum-orange?logo=rust" alt="Rust">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker">
</p>

---

## ✨ Features

### 🚀 API-First Architecture
- **Direct API Access** — Fetches Pages, Resources, Folders, URLs, and Lessons instantly via the Moodle Mobile API
- **N+1 Optimization** — Pre-fetches resource maps in batches to eliminate redundant API calls
- **High-Performance Backend** — Rust-powered API server for lightning-fast content cleaning and processing

### 📱 Offline-First Design
- **Client-Side Caching** — Uses IndexedDB to store course structure and content locally
- **Multi-Layer Caching** — Browser → Server → Redis caching hierarchy for optimal performance
- **Instant Navigation** — Previously visited pages load instantly without network requests

### 🎨 Clean Reading Experience
- **Distraction-Free UI** — Standardized typography for comfortable reading
- **Dark Mode** — Native dark mode support for all content
- **LaTeX Support** — Beautiful mathematical equation rendering with KaTeX

### 🔐 Flexible Authentication
- **Token-Based Auth** — Secure access via Moodle Mobile Token
- **Session Persistence** — Seamless user experience across sessions

---

## 🏗️ Architecture

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
| **Backend** | Rust, Axum 0.8, Tokio | High-performance API server & content processor |
| **Caching** | Redis 7, IndexedDB | Multi-layer caching for speed & offline access |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Rust 1.70+](https://rustup.rs/) (for backend development)
- [Docker](https://docker.com/) (optional, recommended)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/mylms-rewrite.git
cd mylms-rewrite

# Start all services
docker-compose up --build
```

Access the dashboard at **http://localhost:3000**

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
cp .env.example .env
cargo run  # Runs on http://localhost:3001
```

**Frontend:**
```bash
cd mylms-dashboard
npm install
npm run dev  # Runs on http://localhost:3000
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOODLE_URL` | `https://mylms.vossie.net` | Your Moodle instance URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |
| `REDIS_URL` | - | Redis connection string |
| `RUST_LOG` | - | Rust log level filter |

---

## 📖 Usage

1. **Login** — Enter your Moodle Mobile Token to authenticate
2. **Dashboard** — View all your enrolled courses at a glance
3. **Download** — Click the download icon on a course to cache it for offline use
4. **Read** — Enjoy a clean, distraction-free reading experience
5. **Clear Cache** — Use the trash icon to refresh content when needed

---

## 📁 Project Structure

```
mylms-rewrite/
├── backend/              # Rust API server
│   ├── src/
│   │   ├── main.rs       # Application entry point
│   │   ├── content/      # Content cleaning & processing
│   │   └── moodle/       # Moodle API client
│   └── Cargo.toml
│
├── mylms-dashboard/      # Next.js frontend
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   └── lib/          # Core logic & utilities
│   │       ├── moodle/   # API client & auth
│   │       └── cache/    # Caching adapters
│   └── package.json
│
└── docker-compose.yml    # Full-stack Docker setup
```

---

## 📋 TODO

The following features are planned for future development:

- [ ] **Fix assignments** — Resolve issues with assignment display and submission
- [ ] **Notes downloading** — Enable downloading and exporting of course notes
- [ ] **Google Drive/OneDrive integration** — Sync course content with cloud storage
- [ ] **User account creation** — Implement user registration flow
- [ ] **Saving tokens to account** — Persist authentication tokens securely to user profiles
- [ ] **Automatic prescribed book acquisition** — Auto-fetch required textbooks and resources
- [ ] **Theme customisation** — User-selectable themes and color schemes
- [ ] **More functional dashboard** — Add favourites, recently viewed, and downloaded items sections
- [ ] **More functional book integration** — Enhanced e-book reading experience and annotations

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for students everywhere
</p>
