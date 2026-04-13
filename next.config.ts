import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker builds
  // This bundles only the necessary files for production
  output: 'standalone',
};

export default nextConfig;
