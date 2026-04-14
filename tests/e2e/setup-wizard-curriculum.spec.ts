/**
 * setup-wizard-curriculum.spec.ts
 *
 * E2E tests for curriculum-filtered setup wizard behavior.
 *
 * Specs:
 *  1. No cohort → full tech list, no badge (v1.0 behavior preserved)
 *  2. Cohort with curriculum → filters to taught skillSlugs, badge shows count
 *  3. Substring-like slugs are NOT matched (react excluded from react-native) — Codex #9
 *  4. Wizard load time is logged — <2000ms sanity ceiling, advisory <400ms target (Codex #7)
 *
 * Approach: Playwright route mocking for gap-scores and curriculum APIs.
 * The GitHub tech list is also mocked to return deterministic fixtures.
 * This ensures tests are fast, deterministic, and don't require a live DB.
 *
 * Auth: Tests mock the auth cookie or assume the dev server is running with
 * APP_PASSWORD set. If running against a real server, set TRAINER_PASSWORD env var.
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APP_PASSWORD = process.env.TRAINER_PASSWORD ?? process.env.APP_PASSWORD ?? 'test';

/**
 * Log in to the trainer dashboard. Sets the nlm_session cookie via the login page.
 */
async function login(page: Page) {
  await page.goto('/login');
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(APP_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {
      // May redirect elsewhere — that's ok
    });
  }
}

/**
 * Mock GitHub API to return a deterministic tech list with specific first-path-segments.
 * Paths include: react/, react-native/, typescript/, rust/ folders.
 */
function mockGitHubTechs(page: Page, techs: string[]) {
  return page.route('**/api/github**', async route => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get('type');
    if (type === 'list') {
      const items = techs.map(path => ({
        name: path.split('/').pop() ?? path,
        path,
        sha: 'abc',
        size: 100,
        url: '',
        html_url: '',
        git_url: '',
        download_url: '',
        type: 'file',
      }));
      await route.fulfill({ json: items });
    } else {
      await route.fulfill({ body: '# Mock Question\n\n**Q1:** Test question\n\n**Keywords:** test' });
    }
  });
}

/**
 * Mock gap-scores API response for a given slug.
 * Returns found:true with 3+ sessions if scores provided, or no-cohort if cohortId is null.
 */
function mockGapScores(
  page: Page,
  slug: string,
  opts: { cohortId: number | null; scores?: Array<{ skill: string; weightedScore: number }> }
) {
  return page.route(`**/api/associates/${slug}/gap-scores`, async route => {
    await route.fulfill({
      json: {
        found: true,
        sessionCount: 3,
        scores: opts.scores ?? [],
        cohortId: opts.cohortId,
      },
    });
  });
}

/**
 * Mock curriculum endpoint for a given cohortId.
 * Returns the provided taught weeks (startDate <= now).
 */
function mockCurriculum(
  page: Page,
  cohortId: number,
  weeks: Array<{ weekNumber: number; skillName: string; skillSlug: string }>
) {
  return page.route(`**/api/cohorts/${cohortId}/curriculum?taught=true`, async route => {
    const items = weeks.map(w => ({
      weekNumber: w.weekNumber,
      skillName: w.skillName,
      skillSlug: w.skillSlug,
      startDate: new Date(Date.now() - 86400000).toISOString(), // yesterday = taught
    }));
    await route.fulfill({ json: items });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Setup wizard curriculum filter', () => {
  test.beforeEach(async ({ page }) => {
    // Also mock the trainer roster for typeahead (returns empty list is fine)
    await page.route('**/api/trainer', async route => {
      await route.fulfill({ json: [] });
    });
  });

  // -------------------------------------------------------------------------
  // Spec 1: No cohort → full tech list, no badge
  // -------------------------------------------------------------------------
  test('no cohort shows full tech list without badge', async ({ page }) => {
    const techs = [
      'react/question-bank-v1.md',
      'typescript/question-bank-v1.md',
      'node/question-bank-v1.md',
    ];

    await mockGitHubTechs(page, techs);
    await mockGapScores(page, 'no-cohort-associate', { cohortId: null });

    await login(page);
    await page.goto('/dashboard');

    // Trigger slug lookup
    const slugInput = page.locator('input[placeholder*="Search by name or slug"]');
    await slugInput.fill('no-cohort-associate');
    await slugInput.blur();

    // Wait for tech list to load
    await page.waitForTimeout(500);

    // Badge should NOT be visible (no curriculum filter active)
    const badge = page.getByTestId('curriculum-filter-badge');
    await expect(badge).not.toBeVisible();

    // All 3 techs should appear in the list
    for (const tech of ['react', 'typescript', 'node']) {
      await expect(page.locator(`text=${tech}`).first()).toBeVisible();
    }
  });

  // -------------------------------------------------------------------------
  // Spec 2: Cohort with curriculum filters to taught slugs only + badge shows count
  // -------------------------------------------------------------------------
  test('cohort with curriculum filters to taught skillSlugs and shows badge', async ({ page }) => {
    const COHORT_ID = 999;
    const allTechs = [
      'react/question-bank-v1.md',
      'typescript/question-bank-v1.md',
      'rust/question-bank-v1.md',      // future week — should be excluded
    ];
    const taughtWeeks = [
      { weekNumber: 1, skillName: 'React', skillSlug: 'react' },
      { weekNumber: 2, skillName: 'TypeScript', skillSlug: 'typescript' },
    ];

    await mockGitHubTechs(page, allTechs);
    await mockGapScores(page, 'cohort-associate', { cohortId: COHORT_ID });
    await mockCurriculum(page, COHORT_ID, taughtWeeks);

    await login(page);
    await page.goto('/dashboard');

    const slugInput = page.locator('input[placeholder*="Search by name or slug"]');
    await slugInput.fill('cohort-associate');
    await slugInput.blur();

    // Wait for curriculum fetch to resolve
    await page.waitForTimeout(800);

    // Badge should be visible with count "2"
    const badge = page.getByTestId('curriculum-filter-badge');
    await expect(badge).toBeVisible();
    const count = page.getByTestId('curriculum-filter-count');
    await expect(count).toHaveText('2');

    // react and typescript should be visible in the tech list
    await expect(page.locator('text=react').first()).toBeVisible();
    await expect(page.locator('text=typescript').first()).toBeVisible();

    // rust should NOT be visible (future week, not in curriculum filter)
    const rustItems = page.locator('text=rust');
    await expect(rustItems).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // Spec 3: Substring-like slugs are NOT matched (Codex finding #9)
  // react-native EXCLUDED when only "react" is taught
  // -------------------------------------------------------------------------
  test('substring-like slugs are not matched — react-native excluded when react taught (Codex #9)', async ({ page }) => {
    const COHORT_ID = 998;
    const allTechs = [
      'react/question-bank-v1.md',
      'react-native/question-bank-v1.md',  // must be EXCLUDED when only react is taught
    ];
    const taughtWeeks = [
      { weekNumber: 1, skillName: 'React', skillSlug: 'react' },
    ];

    await mockGitHubTechs(page, allTechs);
    await mockGapScores(page, 'substring-test-associate', { cohortId: COHORT_ID });
    await mockCurriculum(page, COHORT_ID, taughtWeeks);

    await login(page);
    await page.goto('/dashboard');

    const slugInput = page.locator('input[placeholder*="Search by name or slug"]');
    await slugInput.fill('substring-test-associate');
    await slugInput.blur();

    await page.waitForTimeout(800);

    // react/ should be visible
    await expect(page.locator('button', { hasText: 'react' }).first()).toBeVisible();

    // react-native/ must NOT be visible — exact match excludes it
    const reactNativeItems = page.locator('button', { hasText: 'react-native' });
    await expect(reactNativeItems).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // Spec 4: Wizard load time is logged — <2000ms sanity ceiling (Codex #7)
  // Per Codex finding #7: <400ms is advisory target, not a release gate.
  // This assertion is a loose sanity ceiling only.
  // -------------------------------------------------------------------------
  test('wizard load time is within sanity ceiling of 2000ms (advisory per Codex #7)', async ({ page }) => {
    await mockGitHubTechs(page, ['react/question-bank-v1.md', 'typescript/question-bank-v1.md']);
    await mockGapScores(page, 'perf-test-associate', { cohortId: null });

    await login(page);

    // Mark mount time before navigation
    const mountStart = Date.now();
    await page.goto('/dashboard');

    // Wait for tech list to be rendered (first tech item visible)
    await page.waitForSelector('text=react', { timeout: 5000 });
    const elapsed = Date.now() - mountStart;

    // Log advisory metric — not a hard gate
    console.log(`[perf] Dashboard wizard mount → tech list render: ${elapsed}ms`);
    console.log(`[perf] Note: <400ms is a future target (Codex #7), not a current gate.`);
    console.log(`[perf] Real bottleneck is recursive GitHub discovery, not curriculum DB fetch.`);

    // Sanity ceiling only — not a perf gate
    // Per Codex finding #7: assert <2000ms, NOT <400ms
    expect(elapsed, `Wizard load took ${elapsed}ms (sanity ceiling: 2000ms)`).toBeLessThan(2000);
  });
});
