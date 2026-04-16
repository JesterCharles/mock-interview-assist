import { test, expect } from '@playwright/test';

test.describe('Sign-in page (Phase 18)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
  });

  test('renders both Trainer and Associate tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Trainer' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Associate' })).toBeVisible();
  });

  test('Trainer tab has email and password fields', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Trainer' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('Sign in button enables when email and password filled', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('bad@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  });

  test('Forgot password toggles inline reset form', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByText('Enter your email and we\'ll send a reset link')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
    await expect(page.getByRole('button', { name: '← Back to sign in' })).toBeVisible();
  });

  test('Back to sign in returns from reset form', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByRole('button', { name: '← Back to sign in' }).click();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('Associate tab has email field and send link button', async ({ page }) => {
    await page.getByRole('tab', { name: 'Associate' }).click();
    await expect(page.getByRole('tab', { name: 'Associate' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Enter your email to receive a sign-in link')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeDisabled();
  });

  test('Associate tab shows check-your-email confirmation after submit', async ({ page }) => {
    await page.getByRole('tab', { name: 'Associate' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
    await page.getByRole('button', { name: 'Send sign-in link' }).click();
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('tab switching preserves state correctly', async ({ page }) => {
    // Fill trainer email
    await page.getByRole('textbox', { name: 'Email' }).fill('trainer@test.com');
    // Switch to associate
    await page.getByRole('tab', { name: 'Associate' }).click();
    await expect(page.getByText('Enter your email to receive a sign-in link')).toBeVisible();
    // Switch back to trainer
    await page.getByRole('tab', { name: 'Trainer' }).click();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  });
});
