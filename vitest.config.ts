import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      'tests/e2e/**',
      'tests/visual/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Next.js `server-only` sentinel is unavailable to Vitest; alias to a
      // no-op module so server-only files can be unit-tested.
      'server-only': path.resolve(__dirname, './src/test-utils/server-only-shim.ts'),
    },
  },
});
