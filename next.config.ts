import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker builds
  // This bundles only the necessary files for production
  output: 'standalone',
  // Include Prisma binaries in standalone output (PERSIST-06)
  // Without this, the Docker production container crashes on first DB operation
  // because Prisma binaries are missing from the standalone output.
  outputFileTracingIncludes: {
    '/': [
      './node_modules/prisma/**/*',
      './node_modules/@prisma/**/*',
      './node_modules/.bin/**/*',
    ],
  },
};

export default nextConfig;
