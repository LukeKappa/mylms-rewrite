import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  // Vercel ignores this setting and handles builds automatically
  output: 'standalone',
};

export default nextConfig;
