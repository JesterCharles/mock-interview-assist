'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/lib/auth-context';

export function AvatarMenu() {
  const { user, logout } = useAuth();

  const email = user?.email ?? '';
  const initial = email[0]?.toUpperCase() ?? '?';
  const role = (user?.user_metadata?.role as string | undefined) ?? 'trainer';

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/signin';
  };

  return (
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
            style={{ height: 1, background: 'var(--border)', margin: '0 0 4px' }}
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
  );
}
