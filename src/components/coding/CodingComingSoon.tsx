/**
 * CodingComingSoon — Phase 50 (JUDGE-INTEG-02 / D-08)
 *
 * Renders a centered card shown in place of the /coding workspace when
 * CODING_CHALLENGES_ENABLED !== 'true'. Uses DESIGN tokens from
 * src/app/globals.css — never hard-codes colors.
 */
'use client';

import Link from 'next/link';

export interface CodingComingSoonProps {
  /** Optional override for the back-link destination. Defaults to /dashboard. */
  backHref?: string;
}

export function CodingComingSoon({ backHref = '/dashboard' }: CodingComingSoonProps) {
  return (
    <main
      role="main"
      aria-labelledby="coding-coming-soon-heading"
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '96px 24px 64px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '56px 40px',
        }}
      >
        <h1
          id="coding-coming-soon-heading"
          style={{
            fontFamily: "var(--font-display), 'Clash Display', sans-serif",
            fontWeight: 600,
            fontSize: '36px',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          Coding Challenges Coming Soon
        </h1>
        <p
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '16px',
            lineHeight: 1.55,
            color: 'var(--muted)',
            marginTop: '16px',
            marginBottom: '32px',
          }}
        >
          We&apos;re building an in-browser coding environment. Check back in a few weeks.
        </p>
        <Link
          href={backHref}
          style={{
            display: 'inline-block',
            background: 'var(--accent)',
            color: 'var(--text-on-accent)',
            borderRadius: '8px',
            padding: '10px 20px',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

export default CodingComingSoon;
