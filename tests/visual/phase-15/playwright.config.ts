import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 15-04 advisory visual + legacy-deletion config.
 *
 * Runs two specs:
 *   - route-regression.spec.ts — full-page screenshots per public route
 *   - legacy-deletion.spec.ts  — asserts zero legacy class elements in DOM
 *
 * Standalone config so it does NOT collide with the main e2e config
 * (testDir: ./tests/e2e). Run via:
 *   npx playwright test --config=tests/visual/phase-15/playwright.config.ts
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
