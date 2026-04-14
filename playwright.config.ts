import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for NLM E2E tests.
 * Targets a locally running dev server.
 *
 * Run: npx playwright test
 * Run single file: npx playwright test tests/e2e/setup-wizard-curriculum.spec.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Dev server must be running separately: npm run dev
  // webServer is not configured here to avoid starting a second server in CI
});
