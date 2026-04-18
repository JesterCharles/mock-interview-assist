/**
 * ChallengeCard — Phase 40 Plan 02 Task 2
 *
 * Mirrors CohortCard surface: var(--surface) bg, 12px radius, 24px padding,
 * 1px var(--border) border, borderColor → var(--accent) on hover.
 *
 * Uses DESIGN.md semantic badge colors for the difficulty + status pills.
 * The badge background tokens (--success-bg / --warning-bg / --danger-bg) are
 * defined in globals.css and used directly here.
 */
'use client';

import Link from 'next/link';
import type { ChallengeListItem } from '@/hooks/useChallengeList';
import { SQL_DIALECT_LABEL, isSqlDialectChallenge } from '@/lib/codingLabels';

export interface ChallengeCardProps {
  challenge: ChallengeListItem;
}

type StatusLabel = 'Unstarted' | 'Attempted' | 'Passed';

function deriveStatus(
  latestAttempt: ChallengeListItem['latestAttempt'],
): StatusLabel {
  if (!latestAttempt) return 'Unstarted';
  if (latestAttempt.verdict === 'pass') return 'Passed';
  return 'Attempted';
}

function difficultyLabel(d: string): string {
  if (d === 'easy') return 'Easy';
  if (d === 'medium') return 'Medium';
  if (d === 'hard') return 'Hard';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

interface PillStyle {
  bg: string;
  fg: string;
}

function difficultyPill(d: string): PillStyle {
  if (d === 'easy') return { bg: 'var(--success-bg)', fg: 'var(--success)' };
  if (d === 'medium') return { bg: 'var(--warning-bg)', fg: 'var(--warning)' };
  if (d === 'hard') return { bg: 'var(--danger-bg)', fg: 'var(--danger)' };
  return { bg: 'var(--surface-muted)', fg: 'var(--muted)' };
}

function statusPill(s: StatusLabel): PillStyle {
  if (s === 'Passed') return { bg: 'var(--success-bg)', fg: 'var(--success)' };
  if (s === 'Attempted')
    return { bg: 'var(--warning-bg)', fg: 'var(--warning)' };
  return { bg: 'var(--surface-muted)', fg: 'var(--muted)' };
}

const pillBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '9999px',
  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: '12px',
  lineHeight: 1.2,
};

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const status = deriveStatus(challenge.latestAttempt);
  const diffP = difficultyPill(challenge.difficulty);
  const statP = statusPill(status);
  const href = `/coding/${challenge.slug || challenge.id}`;

  return (
    <Link
      href={href}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <article
        data-testid="challenge-card"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
          transition: 'border-color 150ms ease-out',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontFamily: "var(--font-display), 'Clash Display', sans-serif",
                fontWeight: 600,
                fontSize: '22px',
                lineHeight: 1.25,
                color: 'var(--ink)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {challenge.title}
            </h3>
            {isSqlDialectChallenge(challenge) && (
              <p
                style={{
                  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: 'var(--muted)',
                  margin: '4px 0 0 0',
                }}
              >
                {SQL_DIALECT_LABEL}
              </p>
            )}
          </div>
          <span
            style={{
              ...pillBase,
              background: statP.bg,
              color: statP.fg,
              flexShrink: 0,
            }}
          >
            {status}
          </span>
        </header>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontWeight: 500,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
            }}
          >
            {challenge.language}
          </span>
          <span
            style={{
              ...pillBase,
              background: diffP.bg,
              color: diffP.fg,
              padding: '3px 10px',
              fontSize: '11px',
            }}
          >
            {difficultyLabel(challenge.difficulty)}
          </span>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'var(--surface-muted)',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--muted)',
            }}
          >
            {challenge.skillSlug}
          </span>
        </div>
      </article>
    </Link>
  );
}

export default ChallengeCard;
