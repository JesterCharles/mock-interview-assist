import Link from 'next/link';

export function LandingHeader() {
  return (
    <header
      style={{
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--surface-muted)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      {/* Wordmark */}
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-clash-display), 'Clash Display', sans-serif",
          fontWeight: 500,
          fontSize: 16,
          color: 'var(--ink)',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}
      >
        Next Level Mock
      </Link>

      {/* Sign In */}
      <Link
        href="/signin"
        className="btn-accent-flat"
        style={{ fontSize: 13, padding: '6px 16px' }}
      >
        Sign In
      </Link>
    </header>
  );
}
