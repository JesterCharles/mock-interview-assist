'use client'

import type { CodingAttemptSummary } from '@/lib/trainer-types'

interface Props {
  attempts: CodingAttemptSummary[]
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function verdictStyle(verdict: string): { color: string; bg: string } {
  if (verdict === 'pass') return { color: 'var(--success)', bg: 'var(--success-bg)' }
  if (verdict === 'pending') return { color: 'var(--muted)', bg: 'transparent' }
  // fail / timeout / mle / runtime_error / compile_error — all danger
  return { color: 'var(--danger)', bg: 'var(--danger-bg)' }
}

/**
 * CodingAttemptsTable — renders latest N coding attempts as a plain table.
 * Styling via DESIGN.md tokens only (no hardcoded colors).
 * Phase 41 Plan 02 Task 2.
 */
export function CodingAttemptsTable({ attempts }: Props) {
  if (attempts.length === 0) {
    return (
      <p
        style={{
          color: 'var(--muted)',
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
          margin: '24px 0 0 0',
        }}
      >
        No coding attempts yet.
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: '24px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          color: 'var(--ink)',
        }}
      >
        <thead>
          <tr>
            {['Date', 'Challenge', 'Language', 'Difficulty', 'Verdict', 'Score'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '12px 12px 8px 12px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => {
            const vs = verdictStyle(a.verdict)
            const submittedDate = new Date(a.submittedAt)
            return (
              <tr key={a.id}>
                <td
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--muted)',
                  }}
                >
                  {DATE_FMT.format(submittedDate)}
                </td>
                <td
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {a.challengeTitle}
                </td>
                <td
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--muted)',
                  }}
                >
                  {a.language}
                </td>
                <td
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--border)',
                      color: 'var(--ink)',
                      fontSize: '11px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {a.difficulty}
                  </span>
                </td>
                <td
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      backgroundColor: vs.bg,
                      color: vs.color,
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    {a.verdict}
                  </span>
                </td>
                <td
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {a.score === null ? '—' : `${Math.round(a.score)}%`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
