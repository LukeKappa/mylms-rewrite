# MyLMS Dashboard

A high-performance, offline-first dashboard for Moodle-based Learning Management Systems. It features an **API-First Architecture** that prioritizes speed and reliability by leveraging the Moodle Mobile API for all data fetching.

## Features

*   **API-First Architecture**:
    *   **Direct API Access**: Fetches Pages, Resources, Folders, URLs, and Lessons instantly via the Moodle Mobile API.
    *   **N+1 Optimization**: Pre-fetches resource maps in batches to eliminate redundant API calls.
*   **Offline-First Design**:
    *   **Client-Side Caching**: Uses **IndexedDB** to store course structure and content locally in your browser.
    *   **Adaptive Server Caching**: Automatically switches between in-memory caching (for serverless environments like Vercel) and file-system caching (for persistent servers).
    *   **Instant Navigation**: Previously visited pages load instantly without network requests.
*   **Flexible Authentication**:
    *   **Token Support**: Secure access via Moodle Mobile Token.
    *   **Session Persistence**: Persists login state for seamless user experience.
*   **Optimized Reading**:
    *   **Clean UI**: Distraction-free reading experience with standardized typography.
    *   **Dark Mode**: Native dark mode support for all content.

## Architecture

### Data Fetching
The application uses a streamlined approach to fetch content:
1.  **API Path**: All content is fetched using the `core_course_get_contents` and related API endpoints. This ensures stability and speed, avoiding the fragility of web scraping.

### Caching Strategy
1.  **L1 Cache (Browser)**: IndexedDB stores the full content of activities. The UI checks this first for instant rendering.
2.  **L2 Cache (Server)**: 
    *   **Development/Docker**: Uses file-system caching in `data/cache` for persistence across restarts.
    *   **Production (Vercel)**: Uses in-memory caching for fast, ephemeral access in serverless functions.
3.  **L3 Source (Moodle)**: If caches miss, it fetches fresh data from the Moodle API.

## Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS v4
*   **Data Fetching**: Native Fetch
*   **Local Database**: IndexedDB (via `idb` wrapper)
*   **Deployment**: Vercel / Docker

## Getting Started

### Prerequisites

*   Node.js 18+

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```

2.  **Configuration**:
    *   Create a `.env.local` file (optional) or configure environment variables for your Moodle URL.
    *   Default Moodle URL is configured in `src/lib/moodle/auth.ts`.

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000).

### Usage

1.  **Login**: Enter your **Moodle Mobile Token** or credentials to authenticate.
2.  **Dashboard**: View your enrolled courses.
3.  **Download**: Click the download icon on a course to cache it for offline use.
4.  **Clear Cache**: Use the trash icon to wipe local caches if you need to refresh content.

## Deployment

### Vercel Deployment (Recommended)

The project is optimized for Vercel deployment.

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project into Vercel.
3.  Vercel will automatically detect Next.js and configure the build settings.
4.  Deploy.

### Docker

You can build and run the container locally:

```bash
# Build the image
docker build -t mylms-dashboard .

# Run the container
docker run -p 3000:3000 mylms-dashboard
```

## Project Structure

*   `src/app`: Next.js App Router pages and server actions.
*   `src/lib`: Core logic for Moodle API and caching.
    *   `moodle/`: API client, authentication, and types.
    *   `cache/`: Adaptive caching adapters (FileSystem and InMemory).
    *   `indexedDB.ts`: Client-side database wrapper.
    *   `cacheService.ts`: Unified caching service.
*   `data`: Directory where cached content is stored (gitignored, dev/docker only).
