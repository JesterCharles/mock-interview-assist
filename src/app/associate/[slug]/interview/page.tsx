import { redirect, notFound } from 'next/navigation';
import { isAuthenticatedSession, getAssociateIdentity } from '@/lib/auth-server';
import { getAssociateIdBySlug } from '@/lib/associateService';
import { validateSlug } from '@/lib/slug-validation';
import { AuthenticatedInterviewClient } from '@/components/interview/AuthenticatedInterviewClient';
import { PublicShell } from '@/components/layout/PublicShell';

/**
 * Authenticated automated-interview entry (Plan 09-03, D-26).
 *
 * Phase 14 restyle: wrapped in PublicShell, all hex literals replaced with
 * DESIGN.md CSS vars (Codex finding #8 scope). Surfaces a "Signed in as {name}"
 * tag at the top so the user can confirm server-resolved identity.
 *
 * Guard matrix identical to /associate/[slug] — identity resolved server-side
 * and passed to the client as props. The client NEVER re-derives identity.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

function renderForbidden() {
  return (
    <PublicShell
      title="Access denied"
      data-testid="associate-interview-forbidden"
      data-http-status="403"
    >
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '48px 0',
        }}
      >
        <h1
          style={{
            fontFamily:
              "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
            fontSize: '28px',
            fontWeight: 600,
            margin: '0 0 8px 0',
            color: 'var(--ink)',
          }}
        >
          Access denied
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          You are signed in as a different associate. You cannot start an
          interview on someone else&apos;s profile.
        </p>
      </div>
    </PublicShell>
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
        encodeURIComponent('/associate/' + slugValidation.slug + '/interview'),
    );
  }

  const targetId = await getAssociateIdBySlug(slugValidation.slug);
  if (targetId === null) {
    notFound();
  }

  if (!trainer && associateIdentity && associateIdentity.associateId !== targetId) {
    return renderForbidden();
  }

  // Identity tag uses the resolved slug (no extra DB query needed —
  // displayName lookup deferred to keep server work minimal here).
  const associateName = slugValidation.slug;

  return (
    <PublicShell title="Automated Interview">
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily:
            "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          marginBottom: '24px',
        }}
      >
        Signed in as {associateName}
      </div>

      {/* The inner client component still uses legacy classes internally —
          PublicShell only owns the chrome (Phase 14 D-06a). */}
      <AuthenticatedInterviewClient
        associateSlug={slugValidation.slug}
        associateId={targetId}
      />
    </PublicShell>
  );
}
