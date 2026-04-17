import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

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
      {/* Wordmark — matches TopBar */}
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
        NLM
      </Link>

      {/* Right zone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ThemeToggle />
        <Link
          href="/signin"
          className="btn-accent-flat"
          style={{ fontSize: 13, textDecoration: 'none' }}
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}
