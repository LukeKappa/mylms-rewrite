# Vercel Deployment Guide

This project is configured for deployment on Vercel. It uses `next.config.ts` with `output: 'standalone'` and includes adapters for serverless environments.

## Prerequisites

- A [Vercel](https://vercel.com) account.
- The project pushed to a Git repository (GitHub, GitLab, or Bitbucket).

## Environment Variables

The following environment variables are required for the application to function correctly. You can set these in the Vercel project settings.

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_MOODLE_URL` | The URL of your Moodle instance. | `https://mylms.vossie.net` |
| `MOODLE_TOKEN` | Your Moodle API token. | `your_moodle_token` |
| `TEST_COURSE_ID` | (Optional) Course ID for testing. | `12345` |
| `TEST_BOOK_CMID` | (Optional) Book CMID for testing. | `67890` |
| `TEST_BOOK_ID` | (Optional) Book ID for testing. | `54321` |

> [!IMPORTANT]
> Ensure `MOODLE_TOKEN` is set in the **Environment Variables** section of your Vercel project settings. Do not commit it to the repository.

## Caching and Telemetry

In production (Vercel), the application automatically switches to:
- **In-Memory Caching**: Replaces file-based caching for course data and activities. Note that this cache is ephemeral and will be cleared on new deployments or server restarts.
- **In-Memory Telemetry**: Telemetry data is stored in memory and not persisted to disk to avoid file system errors.

## Deployment Steps

1.  **Import Project**: Log in to Vercel and click "Add New..." -> "Project". Select your repository.
2.  **Configure Project**:
    - **Framework Preset**: Next.js
    - **Root Directory**: `.` (default)
    - **Build Command**: `next build` (default)
    - **Output Directory**: `.next` (default)
    - **Install Command**: `npm install` (default)
3.  **Set Environment Variables**: Add the variables listed above.
4.  **Deploy**: Click "Deploy".

## Verification

After deployment:
1.  Visit the deployment URL.
2.  Log in (if applicable) or navigate to the dashboard.
3.  Verify that courses load correctly.
4.  Check that no 500 errors occur due to file system writes (logs can be viewed in the Vercel dashboard).
