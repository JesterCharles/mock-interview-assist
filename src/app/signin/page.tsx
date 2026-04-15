import { redirect } from 'next/navigation';
import { isAuthenticatedSession, getAssociateIdentity } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { isAssociateAuthEnabled } from '@/lib/featureFlags';
import { SignInTabs } from './SignInTabs';
import { PublicShell } from '@/components/layout/PublicShell';

/**
 * Unified sign-in. Two tabs — Trainer (password) and Associate (PIN-only).
 * Already-authenticated callers are forwarded to their natural landing.
 */

interface PageProps {
  searchParams: Promise<{ as?: string; next?: string }>;
}

function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { as, next } = await searchParams;
  const nextPath = safeNext(next);
  const associateEnabled = isAssociateAuthEnabled();
  // Initial tab: respect ?as= only when associate auth is enabled; otherwise
  // always land on Trainer (the only available path).
  const initialTab: 'trainer' | 'associate' =
    associateEnabled && as === 'associate' ? 'associate' : 'trainer';

  // Bounce if already signed in.
  const trainer = await isAuthenticatedSession();
  if (trainer) {
    redirect(nextPath ?? '/trainer');
  }
  if (associateEnabled) {
    const identity = await getAssociateIdentity();
    if (identity) {
      if (nextPath) redirect(nextPath);
      const me = await prisma.associate.findUnique({
        where: { id: identity.associateId },
        select: { slug: true },
      });
      redirect(me ? `/associate/${me.slug}/interview` : '/');
    }
  }

  return (
    <PublicShell>
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
            fontSize: '40px',
            fontWeight: 600,
            margin: '0 0 24px 0',
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}
        >
          Sign in
        </h1>
        <SignInTabs initialTab={initialTab} nextPath={nextPath} showAssociateTab={associateEnabled} />
      </div>
    </PublicShell>
  );
}
