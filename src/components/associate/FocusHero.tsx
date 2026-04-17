'use client';

import { getScoreColor, getTrajectoryNarrative } from '@/lib/vizUtils';

interface FocusHeroProps {
  skillName: string | null;
  score: number | null;       // 0-1 scale (GapScore.weightedScore)
  slope: number;              // pts/session trend slope
  pointsDelta: number;        // signed change in points
  sessionCount: number;       // sessions for this skill
}

export function FocusHero({
  skillName,
  score,
  slope,
  pointsDelta,
  sessionCount,
}: FocusHeroProps) {
  const percent = score !== null ? Math.round(score * 100) : null;
  const scoreColor = percent !== null ? getScoreColor(percent) : 'var(--muted)';

  // Empty state: no skill identified yet
  if (!skillName) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px 24px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
            fontSize: '14px',
            color: 'var(--muted)',
            margin: 0,
          }}
        >
          Complete 3+ mock interviews to see your focus area
        </p>
      </div>
    );
  }

  // Trajectory narrative — show insufficient data message when < 3 sessions
  const narrativeText =
    sessionCount >= 3
      ? getTrajectoryNarrative(slope, pointsDelta, sessionCount)
      : `Needs more data — ${sessionCount} of 3 sessions completed`;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
      }}
    >
      {/* Left side: label + skill name + narrative */}
      <div style={{ minWidth: 0 }}>
        {/* "Focus Area" label — JetBrains Mono 11px 500 uppercase */}
        <p
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--muted)',
            margin: '0 0 6px 0',
          }}
        >
          Focus Area
        </p>

        {/* Skill name — Clash Display 22px 600 */}
        <h2
          style={{
            fontFamily: 'var(--font-clash-display), Clash Display, DM Sans, system-ui, sans-serif',
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 6px 0',
            lineHeight: 1.2,
          }}
        >
          {skillName}
        </h2>

        {/* Trajectory narrative — DM Sans 14px 400 */}
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            color: 'var(--muted)',
            margin: 0,
          }}
        >
          {narrativeText}
        </p>
      </div>

      {/* Right side: score display — Clash Display 28px 700 */}
      {percent !== null && (
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <span
            style={{
              fontFamily: 'var(--font-clash-display), Clash Display, DM Sans, system-ui, sans-serif',
              fontSize: '28px',
              fontWeight: 700,
              color: scoreColor,
              lineHeight: 1,
            }}
          >
            {percent}%
          </span>
        </div>
      )}
    </div>
  );
}
