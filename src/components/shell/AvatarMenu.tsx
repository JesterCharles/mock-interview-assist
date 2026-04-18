'use client';

import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProfileModal } from './ProfileModal';

type ProfileTab = 'profile' | 'security' | 'learning';

export interface AvatarMenuProps {
  /**
   * P2 fix (shell double-modal): when provided, AvatarMenu delegates
   * profile-modal ownership to the shell. Clicks on Profile / Settings
   * (associate path) call this callback instead of opening an internal
   * modal, AND AvatarMenu skips rendering its own `<ProfileModal>` so the
   * shell's single root modal is the only instance mounted.
   *
   * When undefined (existing trainer callers that do not centralize),
   * AvatarMenu keeps its original self-contained behavior — backwards
   * compatible.
   */
  onOpenProfile?: (initialTab?: ProfileTab) => void;
}

export function AvatarMenu({ onOpenProfile }: AvatarMenuProps = {}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const email = user?.email ?? '';
  const initial = email[0]?.toUpperCase() ?? '?';
  const role = (user?.user_metadata?.role as string | undefined) ?? 'trainer';

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>('profile');

  const controlled = typeof onOpenProfile === 'function';

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/signin';
  };

  const openProfileTab = (tab: ProfileTab) => {
    if (controlled) {
      onOpenProfile!(tab);
      return;
    }
    setProfileInitialTab(tab);
    setProfileOpen(true);
  };

  const handleSettingsSelect = () => {
    if (role === 'trainer' || role === 'admin') {
      router.push('/trainer/settings');
    } else {
      openProfileTab('security');
    }
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            aria-label={`Account menu for ${email || 'user'}`}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              fontSize: 13,
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
            }}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {initial}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="end"
            sideOffset={8}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              minWidth: 200,
              padding: '4px 0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              zIndex: 50,
            }}
          >
            {/* Email — non-interactive label */}
            <div
              style={{
                padding: '8px 12px 4px',
                fontSize: 16,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontWeight: 400,
                color: 'var(--muted)',
                userSelect: 'none',
              }}
            >
              {email || 'No email'}
            </div>

            {/* Role badge */}
            <div style={{ padding: '2px 12px 8px' }}>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  fontWeight: 500,
                  color: role === 'admin' ? 'var(--warning)' : 'var(--success)',
                  padding: '1px 6px',
                  borderRadius: 9999,
                  background: role === 'admin' ? 'rgba(183,121,31,0.1)' : 'rgba(45,106,79,0.1)',
                }}
              >
                {role}
              </span>
            </div>

            <DropdownMenu.Separator
              style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}
            />

            {/* Profile — opens modal */}
            <DropdownMenu.Item
              onSelect={() => openProfileTab('profile')}
              style={{
                padding: '8px 12px',
                fontSize: 16,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontWeight: 400,
                color: 'var(--ink)',
                cursor: 'pointer',
                outline: 'none',
              }}
              className="hover:bg-[var(--highlight)] focus-visible:bg-[var(--highlight)]"
            >
              Profile
            </DropdownMenu.Item>

            {/* Settings */}
            <DropdownMenu.Item
              onSelect={handleSettingsSelect}
              style={{
                padding: '8px 12px',
                fontSize: 16,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontWeight: 400,
                color: 'var(--ink)',
                cursor: 'pointer',
                outline: 'none',
              }}
              className="hover:bg-[var(--highlight)] focus-visible:bg-[var(--highlight)]"
            >
              Settings
            </DropdownMenu.Item>

            <DropdownMenu.Separator
              style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}
            />

            {/* Sign Out */}
            <DropdownMenu.Item
              onSelect={handleSignOut}
              style={{
                padding: '8px 12px',
                fontSize: 16,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontWeight: 400,
                color: 'var(--danger)',
                cursor: 'pointer',
                outline: 'none',
              }}
              className="hover:bg-[var(--highlight)] focus-visible:bg-[var(--highlight)]"
            >
              Sign Out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {!controlled && (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          initialTab={profileInitialTab}
        />
      )}
    </>
  );
}
