import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 14-01 advisory visual config — runs the public-flow spec only.
 * Standalone so it does NOT collide with the main e2e config (testDir:
 * ./tests/e2e). Run via:
 *   npx playwright test --config=tests/visual/phase-14/playwright.config.ts
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
