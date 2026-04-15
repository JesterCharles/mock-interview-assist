import { test, expect } from '@playwright/test';

/**
 * Phase 14-01 advisory visual smoke tests.
 *
 * Exercises NEW routes restyled to DESIGN.md tokens AND verifies legacy
 * pages still render with the preserved utilities (Codex finding #8 regression).
 *
 * NOT gated in CI. Run manually:
 *   npx playwright test tests/visual/phase-14 --config=playwright.config.ts
 *
 * Requires the dev server: `npm run dev` (port 3000).
 *
 * Expected DESIGN.md visuals:
 *   - PublicShell root bg: rgb(245, 240, 232)  (warm parchment #F5F0E8)
 *   - btn-accent-flat bg : rgb(200, 90, 46)    (burnt orange  #C85A2E)
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SCREENSHOT_DIR = 'tests/visual/phase-14/screenshots';

test.describe('Phase 14 — new public flow on DESIGN.md tokens', () => {
  test('trainer login renders DESIGN.md tokens', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();

    // Warm parchment bg on the PublicShell root
    const bg = await page.evaluate(() => {
      const el = document.querySelector('div.min-h-screen') as HTMLElement;
      return el ? getComputedStyle(el).backgroundColor : '';
    });
    expect(bg).toBe('rgb(245, 240, 232)');

    // Burnt orange flat accent on submit button
    const btnBg = await page.evaluate(() => {
      const btn = document.querySelector('.btn-accent-flat') as HTMLElement;
      return btn ? getComputedStyle(btn).backgroundColor : '';
    });
    expect(btnBg).toBe('rgb(200, 90, 46)');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/trainer-login.png`,
      fullPage: true,
    });
  });

  test('PIN entry renders with numeric inputmode', async ({ page }) => {
    await page.goto(`${BASE}/associate/login`);
    await expect(page.getByRole('heading', { name: /Enter your PIN/i })).toBeVisible();

    const inputmode = await page.locator('#associate-pin').getAttribute('inputmode');
    expect(inputmode).toBe('numeric');

    const bg = await page.evaluate(() => {
      const el = document.querySelector('div.min-h-screen') as HTMLElement;
      return el ? getComputedStyle(el).backgroundColor : '';
    });
    expect(bg).toBe('rgb(245, 240, 232)');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/associate-login.png`,
      fullPage: true,
    });
  });

  test('associate profile renders readiness signal (best-effort)', async ({ page }) => {
    // Try a known seeded slug; skip cleanly if not present.
    const slug = process.env.E2E_ASSOCIATE_SLUG ?? 'demo';
    const res = await page.goto(`${BASE}/associate/${slug}`, { waitUntil: 'domcontentloaded' });
    if (!res || res.status() === 404 || res.status() === 401 || res.status() >= 500) {
      test.skip(true, `No seeded associate at /associate/${slug} (status ${res?.status()})`);
      return;
    }
    // If we got redirected to the login wall, also skip (anonymous test runner).
    if (page.url().includes('/associate/login')) {
      test.skip(true, 'Redirected to login wall — no auth cookie present');
      return;
    }

    const bg = await page.evaluate(() => {
      const el = document.querySelector('div.min-h-screen') as HTMLElement;
      return el ? getComputedStyle(el).backgroundColor : '';
    });
    expect(bg).toBe('rgb(245, 240, 232)');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/associate-profile.png`,
      fullPage: true,
    });
  });

  test('authenticated interview entry renders PublicShell + identity tag (best-effort)', async ({ page }) => {
    const slug = process.env.E2E_ASSOCIATE_SLUG ?? 'demo';
    const res = await page.goto(`${BASE}/associate/${slug}/interview`, { waitUntil: 'domcontentloaded' });
    if (!res || res.status() === 404 || res.status() >= 500) {
      test.skip(true, `No seeded associate at /associate/${slug}/interview`);
      return;
    }
    if (page.url().includes('/associate/login')) {
      test.skip(true, 'Redirected to login — no auth cookie present');
      return;
    }

    await expect(page.getByText(/Signed in as/i)).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/associate-interview.png`,
      fullPage: true,
    });
  });
});

test.describe('Phase 14 — legacy regression (Codex finding #8)', () => {
  test('anonymous root / still renders with .nlm-bg legacy utility', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    // Legacy class must still be present somewhere in the DOM.
    const hasNlmBg = await page.evaluate(
      () => document.querySelector('.nlm-bg') !== null,
    );
    expect(hasNlmBg).toBe(true);

    // No fatal console errors from missing utility classes.
    const fatal = consoleErrors.filter((e) =>
      /undefined|missing|nlm-|glass-card/i.test(e),
    );
    expect(fatal).toEqual([]);
  });

  test('/interview still renders legacy chrome (route-level smoke)', async ({ page }) => {
    const res = await page.goto(`${BASE}/interview`, { waitUntil: 'domcontentloaded' });
    if (res && (res.status() === 401 || res.status() === 302)) {
      test.skip(true, 'Trainer auth required — skip in unauthenticated runner');
      return;
    }
    const hasNlmBg = await page.evaluate(
      () => document.querySelector('.nlm-bg') !== null,
    );
    // Either the page rendered with .nlm-bg OR we got bounced to /login by middleware.
    if (page.url().includes('/login')) {
      test.skip(true, 'Middleware redirected to /login');
      return;
    }
    expect(hasNlmBg).toBe(true);
  });
});
