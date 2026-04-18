// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock auth + router. AvatarMenu renders a dropdown with Profile/Settings/Sign Out.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { email: 'a@b.com', user_metadata: { role: 'associate' } },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock ProfileModal so we can tell whether AvatarMenu rendered one.
vi.mock('./ProfileModal', () => ({
  ProfileModal: ({ open }: { open: boolean }) => (
    <div data-testid="avatar-menu-profile-modal" data-open={String(open)} />
  ),
}));

import { AvatarMenu } from './AvatarMenu';

/**
 * P2 fix (shell double-modal): AvatarMenu accepts an optional onOpenProfile
 * prop. When provided, clicking Profile fires the callback and AvatarMenu
 * skips rendering its own internal <ProfileModal> — the enclosing shell owns
 * the single modal instance. When undefined, AvatarMenu keeps its original
 * self-contained behavior (backwards compat).
 */
describe('AvatarMenu — profile-modal control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uncontrolled (no onOpenProfile): renders its own internal ProfileModal', () => {
    render(<AvatarMenu />);
    expect(screen.getByTestId('avatar-menu-profile-modal')).toBeInTheDocument();
  });

  it('controlled (onOpenProfile provided): does NOT render its own ProfileModal', () => {
    render(<AvatarMenu onOpenProfile={vi.fn()} />);
    expect(screen.queryByTestId('avatar-menu-profile-modal')).not.toBeInTheDocument();
  });

  it('uncontrolled: renders the avatar button regardless', () => {
    render(<AvatarMenu />);
    // Trigger button is labelled with the user's email; verifies the component
    // mounts even when no onOpenProfile handler is provided.
    expect(screen.getByRole('button', { name: /Account menu/i })).toBeInTheDocument();
  });
});
