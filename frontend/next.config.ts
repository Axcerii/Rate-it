import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

