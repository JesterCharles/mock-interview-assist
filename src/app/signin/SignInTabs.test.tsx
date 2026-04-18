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

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

import { SignInTabs } from './SignInTabs';

/**
 * Phase 33 / SIGNIN-02: Trainer first-login password gate.
 * After a successful password login, handleTrainerSubmit must call
 * supabase.auth.getUser() and inspect user_metadata.password_set.
 * Falsy → /auth/set-password. Truthy → nextPath ?? /trainer.
 * On getUser error → fail-open to nextPath ?? /trainer (per D-07).
 */

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

describe('SignInTabs — trainer first-login gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /trainer when login succeeds and password_set is true', async () => {
    mockLogin.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { password_set: true } } },
      error: null,
    });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/trainer'));
  });

  it('redirects to /auth/set-password when login succeeds and password_set is falsy', async () => {
    mockLogin.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } }, // no password_set
      error: null,
    });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/set-password'));
  });

  it('redirects to /auth/set-password when password_set is explicitly false', async () => {
    mockLogin.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { password_set: false } } },
      error: null,
    });
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

  it('fails open to /trainer when getUser returns an error (per D-07)', async () => {
    mockLogin.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('network'),
    });
    render(<SignInTabs nextPath={null} />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/trainer'));
  });

  it('uses nextPath when provided and password_set is true', async () => {
    mockLogin.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { password_set: true } } },
      error: null,
    });
    render(<SignInTabs nextPath="/trainer/dashboard" />);
    expandPasswordAccordionAndFill();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/trainer/dashboard'));
  });
});
