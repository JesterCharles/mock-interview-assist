'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { CohortTrendPoint } from '@/lib/trainer-types'

interface CohortTrendsProps {
  data: CohortTrendPoint[] | null
  loading: boolean
}

interface TooltipPayloadItem {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const avg = Math.round(payload[0].value)
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '6px 10px',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '12px',
        color: 'var(--ink)',
      }}
    >
      {label} · {avg}% avg
    </div>
  )
}

export function CohortTrends({ data, loading }: CohortTrendsProps) {
  const hasEnoughData = data && data.length >= 2

  return (
    <div
      style={{
        background: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px 16px 8px',
      }}
    >
      <h2
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          fontSize: '16px',
          color: 'var(--ink)',
          margin: '0 0 12px 0',
        }}
      >
        Cohort Readiness — Last 12 Weeks
      </h2>

      {loading && (
        <div
          style={{
            height: '120px',
            background: 'var(--border)',
            borderRadius: '4px',
            opacity: 0.5,
          }}
        />
      )}

      {!loading && !hasEnoughData && (
        <div
          style={{
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--muted)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Not enough data yet — check back after more mocks.
          </p>
        </div>
      )}

      {!loading && hasEnoughData && (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="var(--border)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="weekLabel"
              tick={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                fill: 'var(--muted)',
              }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12,
                fill: 'var(--muted)',
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="avgScore"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
