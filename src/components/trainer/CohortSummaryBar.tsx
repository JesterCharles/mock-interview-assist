'use client'

import type { CohortSummary } from '@/lib/trainer-types'

/**
 * CohortSummaryBar — aggregate readiness counts for the currently selected cohort.
 *
 * Three pills (Ready / Improving / Not Ready) colored per DESIGN.md semantic
 * badge tokens — mirrors the readiness colors used by RosterTable via
 * trainer.css (.readiness-ready / .readiness-improving / .readiness-not-ready).
 *
 * Caller is responsible for conditional render (D-04): pass a non-null summary
 * only when a specific cohort is selected. This component renders
 * unconditionally once mounted.
 */

interface CohortSummaryBarProps {
  summary: CohortSummary
}

interface Pill {
  label: string
  count: number
  color: string
  background: string
}

export default function CohortSummaryBar({ summary }: CohortSummaryBarProps) {
  const pills: Pill[] = [
    {
      label: 'Ready',
      count: summary.ready,
      color: 'var(--success)',
      background: 'var(--success-bg)',
    },
    {
      label: 'Improving',
      count: summary.improving,
      color: 'var(--accent)',
      background: 'var(--warning-bg)',
    },
    {
      label: 'Not Ready',
      count: summary.notReady,
      color: 'var(--danger)',
      background: 'var(--danger-bg)',
    },
  ]

  return (
    <div
      role="group"
      aria-label="Cohort readiness summary"
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        marginBottom: '24px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {pills.map((pill) => (
        <div
          key={pill.label}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: pill.background,
            color: pill.color,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {pill.label}
          </span>
          <span
            style={{
              fontFamily: 'Clash Display, sans-serif',
              fontWeight: 600,
              fontSize: '18px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pill.count}
          </span>
        </div>
      ))}
    </div>
  )
}
