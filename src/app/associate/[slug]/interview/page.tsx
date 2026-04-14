import { redirect, notFound } from 'next/navigation';
import { isAuthenticatedSession, getAssociateIdentity } from '@/lib/auth-server';
import { getAssociateIdBySlug } from '@/lib/associateService';
import { validateSlug } from '@/lib/slug-validation';
import { AuthenticatedInterviewClient } from '@/components/interview/AuthenticatedInterviewClient';

/**
 * Authenticated automated-interview entry (Plan 09-03, D-26).
 *
 * Guard matrix identical to /associate/[slug]:
 *   - trainer              → allow
 *   - associate match      → allow
 *   - associate mismatch   → 403 element
 *   - associate stale ver  → redirect to /associate/login (getAssociateIdentity returns null)
 *   - anonymous            → redirect to /associate/login?next=…
 *
 * Identity is resolved server-side and passed as props to the client component.
 * The client NEVER re-derives identity from cookies (Codex #2 mitigation).
 */

const tokens = {
  bg: '#F5F0E8',
  ink: '#1A1A1A',
  muted: '#7A7267',
} as const;

interface PageProps {
  params: Promise<{ slug: string }>;
}

function renderForbidden() {
  return (
    <div
      data-testid="associate-interview-forbidden"
      data-http-status="403"
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        color: tokens.ink,
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '420px', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: '28px',
            fontWeight: 600,
            margin: '0 0 8px 0',
          }}
        >
          Access denied
        </h1>
        <p style={{ fontSize: '14px', color: tokens.muted, margin: 0 }}>
          You are signed in as a different associate. You cannot start an
          interview on someone else&apos;s profile.
        </p>
      </div>
    </div>
  );
}

export default async function AssociateInterviewPage({ params }: PageProps) {
  const { slug } = await params;
  const slugValidation = validateSlug(slug);
  if (!slugValidation.success) {
    notFound();
  }

  const trainer = await isAuthenticatedSession();
  const associateIdentity = trainer ? null : await getAssociateIdentity();

  if (!trainer && !associateIdentity) {
    redirect(
      '/associate/login?next=' +
        encodeURIComponent('/associate/' + slugValidation.slug + '/interview')
    );
  }

  const targetId = await getAssociateIdBySlug(slugValidation.slug);
  if (targetId === null) {
    notFound();
  }

  if (!trainer && associateIdentity && associateIdentity.associateId !== targetId) {
    return renderForbidden();
  }

  // Server-resolved identity passed as props — NEVER trusted from client.
  return (
    <AuthenticatedInterviewClient
      associateSlug={slugValidation.slug}
      associateId={targetId}
    />
  );
}
