import { redirect } from 'next/navigation';
import { isAssociateAuthenticated } from '@/lib/auth-server';
import { PinEntryForm } from './PinEntryForm';
import { PublicShell } from '@/components/layout/PublicShell';

/**
 * Dedicated associate PIN entry route (D-18). Separate namespace from trainer
 * `/login`. If the caller is already authenticated (as trainer OR as an
 * associate with a valid non-revoked cookie), skip the form and forward to
 * `next` (or `/`).
 *
 * Phase 14 restyle: wrapped in PublicShell, all hex literals replaced with
 * DESIGN.md CSS vars (Codex finding #8 scope).
 */

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default async function AssociateLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const nextPath = safeNext(next);

  const associate = await isAssociateAuthenticated();

  // Only bounce already-authenticated associates. Trainers can view the page
  // (e.g., to demo the flow or generate-then-test a PIN) without being redirected
  // back to the public root, which causes an apparent "click does nothing" bug
  // when the trainer cookie is present.
  if (associate) {
    redirect(nextPath ?? '/');
  }

  return (
    <PublicShell title="Associate sign-in">
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          margin: '0 auto',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '40px',
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
            fontSize: '48px',
            fontWeight: 600,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}
        >
          Enter your PIN
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--muted)',
            margin: '0 0 28px 0',
            lineHeight: 1.5,
          }}
        >
          Enter the 6-digit PIN your trainer gave you.
        </p>
        <PinEntryForm nextPath={nextPath} />
      </div>
    </PublicShell>
  );
}
