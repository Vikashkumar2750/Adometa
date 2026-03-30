import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Proxy /api/* → backend (avoids CORS in both dev and prod)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
