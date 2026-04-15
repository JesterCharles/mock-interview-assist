import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    // Tests cover the full PIN-auth surface — the v1.2 feature flag defaults
    // to off in production but must be on in the test suite so route tests
    // exercise the real logic instead of the 404 gate.
    env: {
      ENABLE_ASSOCIATE_AUTH: 'true',
    },
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
    },
  },
});
