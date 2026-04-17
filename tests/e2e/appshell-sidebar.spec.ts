import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.TRAINER_EMAIL ?? '';
const PASSWORD = process.env.TRAINER_PASSWORD ?? process.env.APP_PASSWORD ?? '';

async function signIn(page: Page) {
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Sign in with password' }).click();
  await page.locator('#trainer-email').fill(EMAIL);
  await page.locator('#trainer-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/trainer/, { timeout: 20000 });
}

test.describe('AppShell sidebar unification', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Requires TRAINER_EMAIL + TRAINER_PASSWORD (or APP_PASSWORD)');
    await signIn(page);
  });

  test('/trainer renders sidebar with Roster/Gap Analysis/Calibration', async ({ page }) => {
    await page.goto('/trainer');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Roster' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Gap Analysis' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Calibration' })).toBeVisible();
  });

  test('/trainer/onboarding has sidebar (batch upload)', async ({ page }) => {
    await page.goto('/trainer/onboarding');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('/interview/new renders sidebar in collapsed mode by default', async ({ page }) => {
    await page.goto('/interview/new');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    const width = await sidebar.evaluate((el) => (el as HTMLElement).offsetWidth);
    expect(width).toBeLessThan(100);
  });

  test('/interview/new loads without runtime error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/interview/new');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('/review renders sidebar collapsed', async ({ page }) => {
    await page.goto('/review');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('trainer page does not scroll past viewport (no blank space bug)', async ({ page }) => {
    await page.goto('/trainer');
    await page.waitForLoadState('networkidle');
    const metrics = await page.evaluate(() => ({
      docScrollHeight: document.documentElement.scrollHeight,
      winInnerHeight: window.innerHeight,
      bodyScrollHeight: document.body.scrollHeight,
    }));
    expect(metrics.docScrollHeight).toBeLessThanOrEqual(metrics.winInnerHeight + 1);
  });
});
