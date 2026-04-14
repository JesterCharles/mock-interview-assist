import { prisma } from '@/lib/prisma';
import { isAuthenticatedSession, getAssociateIdentity } from '@/lib/auth-server';
import { getAssociateIdBySlug } from '@/lib/associateService';
import { validateSlug } from '@/lib/slug-validation';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  DESIGN.MD TOKENS (not yet wired as CSS custom properties)         */
/*  Using literal hex values with token names in comments              */
/* ------------------------------------------------------------------ */
const tokens = {
  bg: '#F5F0E8',           // --bg
  surface: '#FFFFFF',       // --surface
  surfaceMuted: '#F0EBE2',  // --surface-muted
  ink: '#1A1A1A',           // --ink
  muted: '#7A7267',         // --muted
  accent: '#C85A2E',        // --accent
  success: '#2D6A4F',       // --success
  warning: '#B7791F',       // --warning
  danger: '#B83B2E',        // --danger
  border: '#DDD5C8',        // --border
  borderSubtle: '#E8E2D9',  // --border-subtle
  highlight: '#FFF8F0',     // --highlight
} as const;

/* Badge colors per DESIGN.MD semantic badge spec */
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: '#E8F5EE', text: tokens.success, label: 'Completed' },
  'in-progress': { bg: '#FEF3E0', text: tokens.warning, label: 'In Progress' },
  review: { bg: '#FEF3E0', text: tokens.accent, label: 'Review' },
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
  const config = statusConfig[status] ?? {
    bg: tokens.surfaceMuted,
    text: tokens.muted,
    label: status,
  };

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.text,
        fontSize: '12px',
        fontWeight: 600,
        padding: '2px 10px',
        borderRadius: '9999px',
        textTransform: 'capitalize',
      }}
    >
      {config.label}
    </span>
  );
}

function ScoreDisplay({ label, score }: { label: string; score: number | null }) {
  if (score === null || score === undefined) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      {/* Clash Display 22px for score numbers */}
      <span
        style={{
          fontSize: '22px',
          fontWeight: 600,
          color: tokens.ink,
          fontFamily: "'Clash Display', sans-serif",
        }}
      >
        {score.toFixed(1)}
      </span>
      {/* 11px mono label per DESIGN.MD */}
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: tokens.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: "'JetBrains Mono', monospace",
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

/** 403 render — server components cannot return a raw Response; render an element. */
function renderForbidden() {
  return (
    <div
      data-testid="associate-forbidden"
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
      <div
        style={{
          maxWidth: '420px',
          textAlign: 'center',
        }}
      >
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
          You are signed in as a different associate. Contact your trainer if you
          believe this is an error.
        </p>
      </div>
    </div>
  );
}

export default async function AssociateProfilePage({ params }: PageProps) {
  /* ---- Extract and validate slug (Next.js 16 async params) ---- */
  const { slug } = await params;
  const slugValidation = validateSlug(slug);
  if (!slugValidation.success) {
    notFound();
  }

  /* ---- Identity gate (D-21, Plan 09-03) ----
   * Five-way matrix:
   *   - trainer               → allow (any slug)
   *   - associate matching id → allow
   *   - associate mismatch    → 403
   *   - associate stale ver   → getAssociateIdentity returns null → treat anonymous → redirect
   *   - anonymous             → redirect to /associate/login?next=…
   */
  const trainer = await isAuthenticatedSession();
  const associateIdentity = trainer ? null : await getAssociateIdentity();

  if (!trainer && !associateIdentity) {
    redirect(
      '/associate/login?next=' +
        encodeURIComponent('/associate/' + slugValidation.slug)
    );
  }

  const targetId = await getAssociateIdBySlug(slugValidation.slug);
  if (targetId === null) {
    notFound();
  }

  if (!trainer && associateIdentity && associateIdentity.associateId !== targetId) {
    return renderForbidden();
  }

  /* ---- Data query ---- */
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

  /* ---- Not found state ---- */
  if (!associate) {
    notFound();
  }

  const displayName = associate.displayName || associate.slug;
  const memberSince = formatDate(associate.createdAt);
  const sessionCount = associate.sessions.length;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.bg,
        fontFamily: "'DM Sans', sans-serif",
        color: tokens.ink,
      }}
    >
      <div
        style={{
          maxWidth: '768px', /* max-w-3xl */
          margin: '0 auto',
          padding: '48px 16px', /* 3xl top, sm sides */
        }}
      >
        {/* Back navigation */}
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            fontWeight: 500,
            color: tokens.muted,
            textDecoration: 'none',
            marginBottom: '32px',
          }}
        >
          <span aria-hidden="true">&larr;</span> Back to Dashboard
        </Link>

        {/* Profile header */}
        <header style={{ marginBottom: '32px' }}>
          {/* Display name — Clash Display 28px */}
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: "'Clash Display', sans-serif",
              color: tokens.ink,
              margin: '0 0 4px 0',
              lineHeight: 1.2,
            }}
          >
            {displayName}
          </h1>

          {/* Slug — 14px muted */}
          <p
            style={{
              fontSize: '14px',
              color: tokens.muted,
              margin: '0 0 16px 0',
            }}
          >
            {associate.slug}
          </p>

          {/* Meta row: member since + session count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '13px',
              color: tokens.muted,
            }}
          >
            <span>Member since {memberSince}</span>
            <span
              style={{
                backgroundColor: tokens.surfaceMuted,
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
            </span>
          </div>
        </header>

        {/* Horizontal rule */}
        <hr
          style={{
            border: 'none',
            borderTop: `1px solid ${tokens.border}`,
            marginBottom: '24px',
          }}
        />

        {/* Session list or empty state */}
        {sessionCount === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: tokens.muted,
              fontSize: '16px',
            }}
          >
            <p style={{ margin: '0 0 8px 0' }}>No sessions recorded yet.</p>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Sessions will appear here after completing a mock interview
              with the associate ID <strong style={{ color: tokens.ink }}>{associate.slug}</strong>.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {associate.sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '12px', /* xl per DESIGN.MD */
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Left: date, candidate, status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '14px',
                      color: tokens.muted,
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
                        color: tokens.ink,
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

                {/* Right: scores */}
                <div style={{ display: 'flex', gap: '24px', flexShrink: 0 }}>
                  <ScoreDisplay label="Technical" score={session.overallTechnicalScore} />
                  <ScoreDisplay label="Soft Skill" score={session.overallSoftSkillScore} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
