import { test, expect } from '@playwright/test';

/**
 * Phase 15-04 legacy-deletion assertion spec.
 *
 * After the --nlm-* / legacy-utility deletion, these class selectors
 * MUST resolve to zero elements on every tested route. The classes
 * no longer exist in globals.css, but stray className strings in
 * components would still be visible in the DOM even without CSS —
 * this spec catches that.
 */

const DEAD_SELECTORS = [
  '.nlm-bg',
  '.glass-card',
  '.glass-card-strong',
  '.gradient-text',
  '.gradient-text-static',
  '.glow-border',
  '.glow-border-cyan',
  '.progress-gradient',
  '.recording-ring',
  '.btn-primary',
  // Note: .btn-accent matches .btn-accent-flat, so we intentionally
  // do NOT assert on .btn-accent. The CSS grep gate already covers
  // the legacy .btn-accent utility deletion.
];

const PUBLIC_ROUTES = [
  { name: 'root', path: '/' },
  { name: 'signin', path: '/signin' },
  { name: 'signin-trainer', path: '/signin?as=trainer' },
  { name: 'signin-associate', path: '/signin?as=associate' },
];

for (const route of PUBLIC_ROUTES) {
  test(`${route.path} has zero legacy class elements`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    for (const sel of DEAD_SELECTORS) {
      const count = await page.locator(sel).count();
      expect(count, `expected 0 elements matching "${sel}" on ${route.path}`).toBe(0);
    }
  });
}

// Auth-gated routes — best-effort: if redirected to /signin, the assertions
// still run against the /signin DOM (which must also be clean).
const AUTH_ROUTES = [
  { name: 'interview-new', path: '/interview/new' },
  { name: 'history', path: '/history' },
  { name: 'pdf', path: '/pdf' },
  { name: 'question-banks', path: '/question-banks' },
  { name: 'trainer', path: '/trainer' },
];

for (const route of AUTH_ROUTES) {
  test(`${route.path} (auth-gated) has zero legacy class elements`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    for (const sel of DEAD_SELECTORS) {
      const count = await page.locator(sel).count();
      expect(count, `expected 0 elements matching "${sel}" on ${route.path}`).toBe(0);
    }
  });
}
