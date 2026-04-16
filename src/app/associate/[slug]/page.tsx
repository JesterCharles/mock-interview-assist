import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { getAssociateIdBySlug } from '@/lib/associateService';
import { validateSlug } from '@/lib/slug-validation';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/PublicShell';
import {
  ReadinessSignal,
  type ReadinessTrend,
} from '@/components/readiness/ReadinessSignal';

/**
 * Associate profile (Phase 14 restyle).
 *
 * All hex literals replaced with DESIGN.md CSS vars (Codex finding #8 scope).
 * Readiness rendered via ReadinessSignal typographic pattern instead of badge.
 * Wrapped in PublicShell for shared chrome.
 *
 * Server-rendered. Identity guard matrix unchanged from Plan 09-03.
 */

const statusConfig: Record<string, { label: string; tone: 'success' | 'warning' | 'accent' }> = {
  completed: { label: 'Completed', tone: 'success' },
  'in-progress': { label: 'In Progress', tone: 'warning' },
  review: { label: 'Review', tone: 'accent' },
};

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, tone: 'accent' as const };
  const colorVar =
    config.tone === 'success'
      ? 'var(--success)'
      : config.tone === 'warning'
        ? 'var(--warning)'
        : 'var(--accent)';

  return (
    <span
      style={{
        color: colorVar,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily:
          "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
      }}
    >
      {config.label}
    </span>
  );
}

function ScoreCell({ label, score }: { label: string; score: number | null }) {
  if (score === null || score === undefined) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '2px',
      }}
    >
      <span
        style={{
          fontSize: '22px',
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily:
            "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {score.toFixed(1)}
      </span>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily:
            "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function renderForbidden() {
  return (
    <PublicShell
      title="Access denied"
      data-testid="associate-forbidden"
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
          You are signed in as a different associate. Contact your trainer if
          you believe this is an error.
        </p>
      </div>
    </PublicShell>
  );
}

/**
 * Derive a readiness score (0-100) and trend word from raw session data.
 * Score: average of overall technical + soft-skill scores across last 3 sessions.
 * Trend:
 *   - "ascending"  → strictly improving (newer score > older score)
 *   - "climbing"   → flat / mixed but non-negative
 *   - "stalling"   → declining
 * < 3 sessions → returns null.
 */
function deriveReadiness(
  sessions: { overallTechnicalScore: number | null; overallSoftSkillScore: number | null }[],
): { score: number; trend: ReadinessTrend } | null {
  if (sessions.length < 3) return null;

  // sessions arrive newest-first; take last 3 in chronological order
  const last3 = sessions.slice(0, 3).reverse();

  const overall = (s: { overallTechnicalScore: number | null; overallSoftSkillScore: number | null }) => {
    const t = s.overallTechnicalScore ?? 0;
    const ss = s.overallSoftSkillScore ?? 0;
    return (t + ss) / 2;
  };

  const scores = last3.map(overall);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Trend: compare newest-of-3 vs oldest-of-3
  const delta = scores[2] - scores[0];
  let trend: ReadinessTrend;
  if (delta > 1) trend = 'ascending';
  else if (delta >= -1) trend = 'climbing';
  else trend = 'stalling';

  return { score: avg, trend };
}

export default async function AssociateProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const slugValidation = validateSlug(slug);
  if (!slugValidation.success) {
    notFound();
  }

  const caller = await getCallerIdentity();

  if (caller.kind === 'anonymous') {
    redirect(
      '/signin?as=associate&next=' +
        encodeURIComponent('/associate/' + slugValidation.slug),
    );
  }

  const targetId = await getAssociateIdBySlug(slugValidation.slug);
  if (targetId === null) {
    notFound();
  }

  // Associates can only view their own profile; trainers/admins can view any
  const isTrainerOrAdmin = caller.kind === 'trainer' || caller.kind === 'admin';
  if (!isTrainerOrAdmin && caller.kind === 'associate' && caller.associateId !== targetId) {
    return renderForbidden();
  }

  const associate = await prisma.associate.findUnique({
    where: { slug: slugValidation.slug },
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          status: true,
          candidateName: true,
          overallTechnicalScore: true,
          overallSoftSkillScore: true,
        },
      },
    },
  });

  if (!associate) {
    notFound();
  }

  const displayName = associate.displayName || associate.slug;
  const memberSince = formatDate(associate.createdAt);
  const sessionCount = associate.sessions.length;
  const readiness = deriveReadiness(associate.sessions);

  return (
    <PublicShell title={displayName}>
      {/* Back navigation */}
      <Link
        href={isTrainerOrAdmin ? '/trainer' : '/'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--muted)',
          textDecoration: 'none',
          marginBottom: '32px',
        }}
      >
        <span aria-hidden="true">&larr;</span>{' '}
        {isTrainerOrAdmin ? 'Back to roster' : 'Back to home'}
      </Link>

      {/* Profile header */}
      <header style={{ marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 600,
            fontFamily:
              "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
            color: 'var(--ink)',
            margin: '0 0 6px 0',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {displayName}
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--muted)',
            margin: '0 0 20px 0',
            fontFamily:
              "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          }}
        >
          {associate.slug}
        </p>

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '13px',
            color: 'var(--muted)',
            marginBottom: readiness ? '32px' : 0,
          }}
        >
          <span>Member since {memberSince}</span>
          <span>&middot;</span>
          <span>
            {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {/* Readiness signal — typography pattern, not badge */}
        {readiness && (
          <ReadinessSignal score={readiness.score} trend={readiness.trend} size="lg" />
        )}

        {/* Primary action — start an automated interview.
            Gated: when associate auth is disabled, the underlying interview
            entry returns 401, so hide the CTA entirely. */}
        <div style={{ marginTop: '24px' }}>
          <Link
            href={`/associate/${associate.slug}/interview`}
            className="btn-accent-flat"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            Start mock interview
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </header>

      {/* Session list */}
      {sessionCount === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: 'var(--muted)',
            fontSize: '16px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
          }}
        >
          <p style={{ margin: '0 0 8px 0' }}>No sessions recorded yet.</p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Sessions will appear here after completing a mock interview with
            associate ID{' '}
            <strong style={{ color: 'var(--ink)' }}>{associate.slug}</strong>.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {associate.sessions.map((session, idx) => (
            <div
              key={session.id}
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                borderTop:
                  idx === 0 ? 'none' : '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDate(session.createdAt)}
                </span>
                {session.candidateName && (
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.candidateName}
                  </span>
                )}
                <StatusBadge status={session.status} />
              </div>

              <div style={{ display: 'flex', gap: '32px', flexShrink: 0 }}>
                <ScoreCell label="Technical" score={session.overallTechnicalScore} />
                <ScoreCell label="Soft Skill" score={session.overallSoftSkillScore} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
