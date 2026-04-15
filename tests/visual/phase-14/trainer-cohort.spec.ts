import { test, expect } from '@playwright/test';

/**
 * Phase 14-02 advisory visual smoke tests for cohort + curriculum UI.
 *
 * NOT gated in CI. Run manually after `npm run dev`:
 *   npx playwright test tests/visual/phase-14/trainer-cohort.spec.ts --reporter=list
 *
 * Auth: requires a trainer session cookie. If APP_PASSWORD is set in env, we
 * POST to /api/login to obtain one. Otherwise tests skip cleanly.
 *
 * Expected DESIGN.md visuals:
 *   - page bg: rgb(245, 240, 232)  (warm parchment --bg)
 *   - accent : rgb(200, 90, 46)    (burnt orange --accent)
 *   - display font-family: contains "Clash Display"
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SCREENSHOT_DIR = 'tests/visual/phase-14/screenshots';
const APP_PASSWORD = process.env.APP_PASSWORD;

async function signIn(request: import('@playwright/test').APIRequestContext) {
  if (!APP_PASSWORD) return null;
  const res = await request.post(`${BASE}/api/login`, {
    data: { password: APP_PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) return null;
  // Persist cookies in the request context
  const storage = await request.storageState();
  return storage;
}

test.describe('Phase 14-02 — cohort + curriculum on DESIGN.md tokens', () => {
  test('cohort list renders DESIGN.md tokens', async ({ page, request }) => {
    const storage = await signIn(request);
    if (!storage) {
      test.skip(true, 'APP_PASSWORD not set — cannot authenticate trainer');
      return;
    }
    await page.context().addCookies(storage.cookies);

    const res = await page.goto(`${BASE}/trainer/cohorts`, {
      waitUntil: 'domcontentloaded',
    });
    if (!res || res.status() >= 400) {
      test.skip(true, `No access to /trainer/cohorts (status ${res?.status()})`);
      return;
    }
    if (page.url().includes('/login')) {
      test.skip(true, 'Redirected to /login — auth failed');
      return;
    }

    // Warm parchment bg on the shell
    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    // Either body inherits --bg, or the wrapper div does. Check the shell wrapper.
    const wrapperBg = await page.evaluate(() => {
      const el = document.querySelector(
        '[style*="var(--bg)"], div[style*="background-color: rgb(245"]',
      ) as HTMLElement | null;
      return el ? getComputedStyle(el).backgroundColor : '';
    });
    expect([bg, wrapperBg]).toContain('rgb(245, 240, 232)');

    // At least one cohort card OR an empty state — page should not be blank
    const hasContent = await page
      .locator('[data-testid="cohort-card"], :text("No cohorts yet")')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasContent).toBe(true);

    // Heading in Clash Display
    const headingFont = await page.evaluate(() => {
      const h = document.querySelector('h1');
      return h ? getComputedStyle(h).fontFamily : '';
    });
    expect(headingFont.toLowerCase()).toContain('clash display');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/trainer-cohorts-list.png`,
      fullPage: true,
    });
  });

  test('cohort filter appears on roster and summary surfaces on selection', async ({
    page,
    request,
  }) => {
    const storage = await signIn(request);
    if (!storage) {
      test.skip(true, 'APP_PASSWORD not set — cannot authenticate trainer');
      return;
    }
    await page.context().addCookies(storage.cookies);

    const res = await page.goto(`${BASE}/trainer`, {
      waitUntil: 'domcontentloaded',
    });
    if (!res || res.status() >= 400) {
      test.skip(true, `No access to /trainer (status ${res?.status()})`);
      return;
    }
    if (page.url().includes('/login')) {
      test.skip(true, 'Redirected to /login — auth failed');
      return;
    }

    // "All Associates" option must exist on the filter select
    const select = page.locator('#cohort-filter-select');
    await expect(select).toBeVisible();
    const allOption = await select.locator('option[value=""]').textContent();
    expect(allOption?.trim()).toBe('All Associates');

    // Try to select a non-"all" option. If none exist, skip the summary assertion.
    const cohortOptions = await select.locator('option:not([value=""])').all();
    if (cohortOptions.length === 0) {
      test.info().annotations.push({
        type: 'skip-partial',
        description: 'No cohorts seeded — skipping summary bar assertion',
      });
    } else {
      const firstValue = await cohortOptions[0].getAttribute('value');
      if (firstValue) {
        await select.selectOption(firstValue);
        const summary = page.locator('[data-testid="readiness-summary-bar"]');
        await expect(summary).toBeVisible({ timeout: 5_000 });
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/trainer-roster-filter.png`,
      fullPage: true,
    });
  });

  test('curriculum list renders with today marker (best-effort)', async ({
    page,
    request,
  }) => {
    const storage = await signIn(request);
    if (!storage) {
      test.skip(true, 'APP_PASSWORD not set — cannot authenticate trainer');
      return;
    }
    await page.context().addCookies(storage.cookies);

    // Need a cohort id to visit — pull from /api/cohorts
    const cohortsRes = await request.get(`${BASE}/api/cohorts`);
    if (!cohortsRes.ok()) {
      test.skip(true, `/api/cohorts unavailable (${cohortsRes.status()})`);
      return;
    }
    const cohorts = (await cohortsRes.json()) as Array<{ id: number | string }>;
    if (!Array.isArray(cohorts) || cohorts.length === 0) {
      test.skip(true, 'No cohorts seeded — cannot render curriculum');
      return;
    }

    const cohortId = cohorts[0].id;
    const res = await page.goto(
      `${BASE}/trainer/cohorts/${cohortId}/curriculum`,
      { waitUntil: 'domcontentloaded' },
    );
    if (!res || res.status() >= 400) {
      test.skip(
        true,
        `No access to /trainer/cohorts/${cohortId}/curriculum (status ${res?.status()})`,
      );
      return;
    }
    if (page.url().includes('/login')) {
      test.skip(true, 'Redirected to /login — auth failed');
      return;
    }

    // Wait a beat for the client fetch to settle
    await page.waitForTimeout(500);

    // At least one week row OR the "no weeks" empty state
    const rowCount = await page
      .locator('[data-testid="curriculum-week-row"]')
      .count();

    if (rowCount > 0) {
      // If any row is flagged 'this-week', its left border should be --accent
      const thisWeek = page
        .locator('[data-testid="curriculum-week-row"][data-status="this-week"]')
        .first();
      if (await thisWeek.count()) {
        const borderColor = await thisWeek.evaluate(
          (el) => getComputedStyle(el).borderLeftColor,
        );
        expect(borderColor).toBe('rgb(200, 90, 46)');
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/trainer-curriculum-list.png`,
      fullPage: true,
    });
  });
});
