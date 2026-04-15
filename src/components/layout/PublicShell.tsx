import type { ReactNode } from 'react';

/**
 * PublicShell — content wrapper for public/auth/associate routes.
 *
 * After the navbar unification (Phase 15), the global `Navbar` owns all
 * chrome (brand, theme toggle, role-aware nav, sign in/out). PublicShell
 * is now ONLY responsible for the warm parchment background + content
 * width container. No header, no footer — those belong to Navbar.
 */

interface PublicShellProps {
  children: ReactNode;
  title?: string;
  ['data-http-status']?: string;
  ['data-testid']?: string;
}

export function PublicShell(props: PublicShellProps) {
  const { children } = props;
  return (
    <div
      className="min-h-screen"
      data-http-status={props['data-http-status']}
      data-testid={props['data-testid']}
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
      }}
    >
      <main
        className="mx-auto w-full px-6 py-12"
        style={{ maxWidth: '1120px' }}
      >
        {children}
      </main>
    </div>
  );
}

export default PublicShell;
