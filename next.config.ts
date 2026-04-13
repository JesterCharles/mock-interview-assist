import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker builds
  // This bundles only the necessary files for production
  output: 'standalone',
  // Set tracing root to this directory to prevent Next.js from using
  // the parent repo root when running in a git worktree
  outputFileTracingRoot: path.join(__dirname),
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
  // Transpile ESM-only packages so webpack can bundle them correctly
  // @react-pdf/renderer v4 is ESM-only and fails with --webpack without this
  transpilePackages: ['@react-pdf/renderer'],
};

export default nextConfig;
