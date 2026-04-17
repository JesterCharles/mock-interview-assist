import { test, expect } from '@playwright/test';

test.describe('Sign-in page (Phase 28 accordion UI)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
  });

  test('renders both accordion buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Continue with email link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with password' })).toBeVisible();
  });

  test('password accordion expands to show email and password fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in with password' }).click();
    await expect(page.locator('#trainer-email')).toBeVisible();
    await expect(page.locator('#trainer-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('Sign in button enables when email and password filled', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in with password' }).click();
    await page.locator('#trainer-email').fill('test@example.com');
    await page.locator('#trainer-password').fill('password123');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  });

  test('invalid credentials show error message', async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Requires live Supabase connection');
    await page.getByRole('button', { name: 'Sign in with password' }).click();
    await page.locator('#trainer-email').fill('bad@example.com');
    await page.locator('#trainer-password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('[role="alert"]').filter({ hasText: /invalid email or password/i })).toBeVisible({ timeout: 15000 });
  });

  test('Forgot password toggles inline reset form', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in with password' }).click();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByText("Enter your email and we'll send a reset link")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to sign in/i })).toBeVisible();
  });

  test('Back to sign in returns from reset form', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in with password' }).click();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByRole('button', { name: /Back to sign in/i }).click();
    await expect(page.locator('#trainer-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('email link accordion expands to show email field and send button', async ({ page }) => {
    await page.getByRole('button', { name: 'Continue with email link' }).click();
    await expect(page.getByText('Enter your email to receive a sign-in link')).toBeVisible();
    await expect(page.locator('#assoc-email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
  });

  test('email link shows check-your-email confirmation after submit', async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Requires live Supabase connection');
    await page.getByRole('button', { name: 'Continue with email link' }).click();
    await page.locator('#assoc-email').fill('test@example.com');
    await page.getByRole('button', { name: 'Send sign-in link' }).click();
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('switching accordions collapses the other', async ({ page }) => {
    // Expand password
    await page.getByRole('button', { name: 'Sign in with password' }).click();
    await expect(page.locator('#trainer-password')).toBeVisible();
    // Expand email link — password panel should collapse
    await page.getByRole('button', { name: 'Continue with email link' }).click();
    await expect(page.locator('#assoc-email')).toBeVisible();
    // Password button should appear dimmed (opacity < 1)
    const pwButton = page.getByRole('button', { name: 'Sign in with password' });
    await expect(pwButton).toHaveCSS('opacity', '0.7');
  });
});
