import { test, expect } from '@playwright/test';

/**
 * Phase 15-04 route regression spec — advisory full-page screenshots of
 * every public-reachable route after the --nlm-* / legacy-utility deletion.
 *
 * Auth-gated routes (/interview/new, /interview, /review, /history, /pdf,
 * /question-banks, /trainer, /trainer/cohorts, /associate/[slug]) are
 * best-effort: we navigate and capture whatever renders (server redirect
 * to /signin is the expected outcome for unauthenticated runs).
 *
 * Post-15-02 route map:
 *   - /dashboard  → server redirect to /interview/new
 *   - /login      → server redirect to /signin?as=trainer
 *   - /associate/login → server redirect to /signin?as=associate
 *   - /signin     → unified Trainer | Associate tabs
 *   - /interview/new → setup wizard (was /dashboard)
 */

const PUBLIC_ROUTES: Array<{ name: string; path: string }> = [
  { name: 'root', path: '/' },
  { name: 'signin', path: '/signin' },
  { name: 'signin-trainer', path: '/signin?as=trainer' },
  { name: 'signin-associate', path: '/signin?as=associate' },
  { name: 'login-legacy-redirect', path: '/login' },
  { name: 'associate-login-legacy-redirect', path: '/associate/login' },
  { name: 'dashboard-legacy-redirect', path: '/dashboard' },
];

const AUTH_GATED_ROUTES: Array<{ name: string; path: string }> = [
  { name: 'interview-new', path: '/interview/new' },
  { name: 'interview', path: '/interview' },
  { name: 'review', path: '/review' },
  { name: 'history', path: '/history' },
  { name: 'pdf', path: '/pdf' },
  { name: 'question-banks', path: '/question-banks' },
  { name: 'trainer', path: '/trainer' },
  { name: 'trainer-cohorts', path: '/trainer/cohorts' },
];

for (const route of PUBLIC_ROUTES) {
  test(`route (public): ${route.path}`, async ({ page }) => {
    const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    // Redirects follow automatically; final status should be < 400
    expect(res?.status() ?? 0).toBeLessThan(400);
    await page.screenshot({
      path: `tests/visual/phase-15/screenshots/route-${route.name}.png`,
      fullPage: true,
    });
  });
}

for (const route of AUTH_GATED_ROUTES) {
  test(`route (auth-gated, advisory): ${route.path}`, async ({ page }) => {
    const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    // Expect either success, a redirect to /signin, or an explicit 401/403.
    // We treat anything under 500 as acceptable for advisory capture.
    expect(res?.status() ?? 0).toBeLessThan(500);
    await page.screenshot({
      path: `tests/visual/phase-15/screenshots/route-${route.name}.png`,
      fullPage: true,
    });
  });
}
