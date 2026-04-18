// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mocks MUST be declared before importing the component under test.
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh, push: vi.fn() }),
}));

const mockLogin = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false, login: mockLogin, logout: vi.fn() }),
}));

import { SignInTabs } from './SignInTabs';

/**
 * Phase 33 / SIGNIN-02 (P1 fix): Trainer first-login password gate, FAIL-CLOSED.
 *
 * After a successful password login, handleTrainerSubmit calls
 * GET /api/auth/password-status (Profile-first, same source of truth as the
 * exchange route). Only an explicit `{ passwordSet: true }` permits redirect
 * to /trainer (or nextPath). Any non-200, network error, or falsy response
 * routes to /auth/set-password.
 */

function mockPasswordStatus(
  response: { ok: boolean; status?: number; json?: unknown } | Error,
) {
  if (response instanceof Error) {
    (globalThis as unknown as { fetch: ReturnType<typeof vi.fn> }).fetch = vi
      .fn()
      .mockRejectedValue(response);
    return;
  }
  (globalThis as unknown as { fetch: ReturnType<typeof vi.fn> }).fetch = vi
    .fn()
    .mockResolvedValue({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: async () => response.json ?? {},
    });
}

function expandPasswordAccordionAndFill(email = 't@test.com', password = 'hunter2') {
  fireEvent.click(screen.getByText(/Sign in with password/i));
  const emailInput = screen.getByLabelText(/Email/i, {
    selector: 'input#trainer-email',
  });
  const passwordInput = screen.getByLabelText(/Password/i, {
    selector: 'input#trainer-password',
  });
  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.change(passwordInput, { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));
}

describe('SignInTabs — trainer first-login gate (fail-closed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /trainer when login succeeds and password-status returns { passwordSet: true }', async () => {
    mockLogin.mockResolvedValue(true);
    mockPasswordStatus({ ok: true, json: { passwordSet: true } });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/trainer'));
  });

  it('redirects to /auth/set-password when password-status returns { passwordSet: false }', async () => {
    mockLogin.mockResolvedValue(true);
    mockPasswordStatus({ ok: true, json: { passwordSet: false } });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/set-password'));
  });

  it('redirects to /auth/set-password when passwordSet field is missing from response', async () => {
    mockLogin.mockResolvedValue(true);
    mockPasswordStatus({ ok: true, json: {} });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/set-password'));
  });

  it('stays on page and shows error when login fails', async () => {
    mockLogin.mockResolvedValue(false);
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email or password/i)
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('FAILS-CLOSED to /auth/set-password when password-status returns 500', async () => {
    mockLogin.mockResolvedValue(true);
    mockPasswordStatus({ ok: false, status: 500, json: { error: 'internal' } });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/set-password'));
  });

  it('FAILS-CLOSED to /auth/set-password when password-status returns 401', async () => {
    mockLogin.mockResolvedValue(true);
    mockPasswordStatus({ ok: false, status: 401, json: { error: 'unauthenticated' } });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/set-password'));
  });

  it('FAILS-CLOSED to /auth/set-password on network error', async () => {
    mockLogin.mockResolvedValue(true);
    mockPasswordStatus(new Error('network down'));
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/set-password'));
  });

  it('uses nextPath when provided and passwordSet is true', async () => {
    mockLogin.mockResolvedValue(true);
    mockPasswordStatus({ ok: true, json: { passwordSet: true } });
    render(<SignInTabs nextPath="/trainer/dashboard" />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/trainer/dashboard'));
  });
});
