'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { CodingSkillScore } from '@/lib/trainer-types'

interface Props {
  scores: CodingSkillScore[]
}

/**
 * CodingSkillBars — recharts bar chart of per-skill coding-only weighted
 * gap scores. Uses `var(--chart-4)` (warm taupe) per DESIGN §Chart Palette
 * — distinct from interview trend which uses `var(--accent)`.
 *
 * Phase 41 Plan 02 Task 2. Zero hardcoded hex; tokens resolve at runtime.
 */
export function CodingSkillBars({ scores }: Props) {
  if (scores.length === 0) {
    return (
      <p
        style={{
          color: 'var(--muted)',
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
          margin: '16px 0 0 0',
        }}
      >
        No coding skill data yet.
      </p>
    )
  }

  // Sort by score ascending — weakest skills surface first (matches gap-focus UX).
  const data = [...scores].sort((a, b) => a.score - b.score)

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 12, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--border-subtle)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="skillSlug"
            tick={{
              fontSize: 12,
              fontFamily: 'DM Sans, sans-serif',
              fill: 'var(--muted)',
            }}
            stroke="var(--border)"
          />
          <YAxis
            domain={[0, 100]}
            tick={{
              fontSize: 12,
              fontFamily: 'DM Sans, sans-serif',
              fill: 'var(--muted)',
            }}
            stroke="var(--border)"
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-muted)' }}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--ink)',
            }}
          />
          <Bar dataKey="score" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
