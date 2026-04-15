import type { ReactNode } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AssociateNav } from '@/components/layout/AssociateNav';
import { getAssociateIdentity } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

/**
 * PublicShell — shared chrome for NEW public/auth/associate routes.
 *
 * Per Phase 14 D-16: explicitly applies warm parchment background on its root
 * div so we do NOT need to mutate the global `body` style (legacy /, /interview,
 * /review depend on the existing `body { background: var(--nlm-bg-primary) }`).
 *
 * Visual contract (DESIGN.md):
 *   - bg: var(--bg) warm parchment #F5F0E8
 *   - typography: DM Sans body, Clash Display wordmark
 *   - max content width 1120px
 *   - subtle warm border-subtle divider on header/footer
 *   - no nav, no theme toggle (deferred)
 */

interface PublicShellProps {
  children: ReactNode;
  title?: string;
  /**
   * Optional data-* passthrough surfaced on the root element. Used by the
   * 403/404 render paths so guard-matrix tests can inspect the returned
   * React element's `props['data-http-status']` directly.
   */
  ['data-http-status']?: string;
  ['data-testid']?: string;
}

export async function PublicShell(props: PublicShellProps) {
  const { children } = props;

  // Look up associate identity (cookie-only) and resolve slug for the nav.
  // No-op for anonymous + trainer-only callers.
  const identity = await getAssociateIdentity();
  let associateSlug: string | null = null;
  if (identity) {
    const me = await prisma.associate.findUnique({
      where: { id: identity.associateId },
      select: { slug: true },
    });
    associateSlug = me?.slug ?? null;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      data-http-status={props['data-http-status']}
      data-testid={props['data-testid']}
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Header — wordmark only, no nav */}
      <header
        className="w-full"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="mx-auto px-6 py-6 flex items-center justify-between"
          style={{ maxWidth: '1120px' }}
        >
          <Link
            href="/"
            aria-label="Back to Next Level Mock home"
            style={{
              fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: '22px',
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            Next Level Mock
          </Link>
          <div className="flex items-center gap-3">
            {associateSlug && <AssociateNav slug={associateSlug} />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex-1 mx-auto w-full px-6 py-12"
        style={{ maxWidth: '1120px' }}
      >
        {children}
      </main>

      {/* Footer — muted metadata */}
      <footer
        className="w-full"
        style={{
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="mx-auto px-6 py-6"
          style={{
            maxWidth: '1120px',
            color: 'var(--muted)',
            fontSize: '12px',
          }}
        >
          Next Level Mock &middot; Readiness engine
        </div>
      </footer>
    </div>
  );
}

export default PublicShell;
