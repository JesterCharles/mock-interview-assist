import type { ReactNode } from 'react';

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
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div
      className="min-h-screen flex flex-col"
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
          <span
            style={{
              fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: '22px',
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
            }}
          >
            Next Level Mock
          </span>
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
