import type { NextConfig } from "next";

// The FastAPI backend origin. Override with BACKEND_ORIGIN in the environment.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next.js ignores an unrelated lockfile in the home dir.
  turbopack: { root: __dirname },

  // Proxy /backend/* to the FastAPI server so the browser makes same-origin
  // requests (no CORS) and the backend URL is not hard-coded in client bundles.
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
