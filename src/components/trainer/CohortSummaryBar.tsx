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
      color: '#2D6A4F', // --success
      background: '#E8F5EE',
    },
    {
      label: 'Improving',
      count: summary.improving,
      color: '#C85A2E', // --accent (matches RosterTable .readiness-improving)
      background: '#FFF1E6',
    },
    {
      label: 'Not Ready',
      count: summary.notReady,
      color: '#B83B2E', // --danger
      background: '#FDECEB',
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
        backgroundColor: '#FFFFFF',
        border: '1px solid #DDD5C8',
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
