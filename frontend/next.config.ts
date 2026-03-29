import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Proxy API requests locally to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/:path*'
      }
    ]
  }
};

export default nextConfig;
