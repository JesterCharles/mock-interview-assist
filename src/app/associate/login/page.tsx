import { redirect } from 'next/navigation';
import { isAuthenticatedSession, isAssociateAuthenticated } from '@/lib/auth-server';
import { PinEntryForm } from './PinEntryForm';

/**
 * Dedicated associate PIN entry route (D-18). Separate namespace from trainer
 * `/login`. If the caller is already authenticated (as trainer OR as an
 * associate with a valid non-revoked cookie), skip the form and forward to
 * `next` (or `/`).
 *
 * Styling is utilitarian per D-20 — full DESIGN.md cohesion lands in Phase 14.
 */

const tokens = {
  bg: '#F5F0E8',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#7A7267',
  border: '#DDD5C8',
} as const;

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  // Only allow internal same-origin redirects — defense in depth against
  // open-redirect via the ?next= param.
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default async function AssociateLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const nextPath = safeNext(next);

  const [trainer, associate] = await Promise.all([
    isAuthenticatedSession(),
    isAssociateAuthenticated(),
  ]);

  if (trainer || associate) {
    redirect(nextPath ?? '/');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'DM Sans', sans-serif",
        color: tokens.ink,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: '12px',
          padding: '32px',
        }}
      >
        <h1
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: '28px',
            fontWeight: 600,
            margin: '0 0 8px 0',
            letterSpacing: '-0.01em',
          }}
        >
          Associate sign-in
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: tokens.muted,
            margin: '0 0 24px 0',
            lineHeight: 1.5,
          }}
        >
          Enter the slug and 6-digit PIN your trainer provided.
        </p>
        <PinEntryForm nextPath={nextPath} />
      </div>
    </div>
  );
}
