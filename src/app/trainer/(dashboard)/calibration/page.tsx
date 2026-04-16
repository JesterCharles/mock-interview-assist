'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { CalibrationData } from '@/lib/trainer-types'

// Recharts custom tooltip
interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { bucket: string } }>
}

function DeltaTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload.length) return null
  const { value, payload: entry } = payload[0]
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '6px 10px',
        fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
        fontSize: '12px',
        color: 'var(--ink)',
      }}
    >
      {value} override{value !== 1 ? 's' : ''} at delta {entry.bucket}
    </div>
  )
}

// Determine bar fill per bucket
function bucketFill(bucket: string): string {
  const n = Number(bucket)
  if (n < 0) return 'var(--danger)'
  if (n > 0) return 'var(--success)'
  return 'var(--surface-muted)'
}

function CalibrationPageInner() {
  const searchParams = useSearchParams()
  const cohort = searchParams.get('cohort')

  const [data, setData] = useState<CalibrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    const url = cohort
      ? `/api/trainer/calibration?cohort=${encodeURIComponent(cohort)}`
      : '/api/trainer/calibration'
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: CalibrationData) => {
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [cohort])

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ maxWidth: '800px', padding: '24px 0' }}>
        {/* Heading skeleton */}
        <div
          style={{
            width: '160px',
            height: '34px',
            background: 'var(--surface-muted)',
            borderRadius: '4px',
            marginBottom: '24px',
          }}
        />
        {/* Card skeleton */}
        <div
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '32px',
            height: '96px',
          }}
        />
        {/* Chart skeleton */}
        <div
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            height: '200px',
          }}
        />
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div style={{ maxWidth: '800px', padding: '24px 0' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display), "Clash Display", sans-serif',
            fontWeight: 500,
            fontSize: '28px',
            color: 'var(--ink)',
            marginBottom: '24px',
            letterSpacing: '-0.01em',
          }}
        >
          Calibration
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
            fontSize: '16px',
            color: 'var(--muted)',
          }}
        >
          Couldn&apos;t load calibration data. Refresh to try again.
        </p>
      </div>
    )
  }

  const hasData = data !== null && data.totalScoredQuestions > 0

  // Build Recharts data array from deltaBuckets
  const deltaChartData = ['-3', '-2', '-1', '0', '1', '2', '3'].map((bucket) => ({
    bucket,
    count: data?.deltaBuckets[bucket] ?? 0,
    fill: bucketFill(bucket),
  }))

  return (
    <div style={{ maxWidth: '800px', padding: '24px 0' }}>
      {/* Page heading */}
      <h1
        style={{
          fontFamily: 'var(--font-display), "Clash Display", sans-serif',
          fontWeight: 500,
          fontSize: '28px',
          color: 'var(--ink)',
          marginBottom: '24px',
          letterSpacing: '-0.01em',
        }}
      >
        Calibration
      </h1>

      {/* Empty state */}
      {!hasData ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display), "Clash Display", sans-serif',
              fontWeight: 500,
              fontSize: '20px',
              color: 'var(--ink)',
              marginBottom: '12px',
            }}
          >
            No override data yet
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
              fontSize: '16px',
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Override data appears after trainers adjust AI scores in the review step.
          </p>
        </div>
      ) : (
        <>
          {/* Section 1 — Override Frequency */}
          <div
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display), "Clash Display", sans-serif',
                fontWeight: 500,
                fontSize: '28px',
                color: 'var(--ink)',
                lineHeight: 1.2,
                marginBottom: '4px',
              }}
            >
              {data?.overrideRate != null
                ? `${Math.round(data.overrideRate)}%`
                : '--'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                fontWeight: 500,
                fontSize: '12px',
                color: 'var(--muted)',
                marginBottom: '6px',
              }}
            >
              of questions overridden by trainer
            </div>
            <div
              style={{
                fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                fontWeight: 400,
                fontSize: '13px',
                color: 'var(--muted)',
              }}
            >
              {data?.overrideCount} overrides out of {data?.totalScoredQuestions} scored questions
            </div>
          </div>

          {/* Section 2 — Delta Distribution */}
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                color: 'var(--ink)',
                marginBottom: '16px',
              }}
            >
              Score Delta Distribution (AI &#x2192; Trainer)
            </h2>

            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={deltaChartData}
                margin={{ top: 4, right: 8, bottom: 4, left: -8 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="var(--border)"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="bucket"
                  tick={{
                    fill: 'var(--muted)',
                    fontSize: 12,
                    fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                    fontWeight: 500,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: 'var(--muted)',
                    fontSize: 12,
                    fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickCount={4}
                  allowDecimals={false}
                />
                <Tooltip content={<DeltaTooltip />} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {deltaChartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.bucket}`}
                      fill={entry.fill}
                      stroke={entry.bucket === '0' ? 'var(--border)' : 'none'}
                      strokeWidth={entry.bucket === '0' ? 1 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <p
              style={{
                fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                fontSize: '12px',
                color: 'var(--muted)',
                marginTop: '8px',
                margin: '8px 0 0',
              }}
            >
              Positive delta = trainer raised AI score. Negative = trainer lowered.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default function CalibrationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: '800px', padding: '24px 0' }}>
          <div
            style={{
              width: '160px',
              height: '34px',
              background: 'var(--surface-muted)',
              borderRadius: '4px',
              marginBottom: '24px',
            }}
          />
          <div
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              height: '200px',
            }}
          />
        </div>
      }
    >
      <CalibrationPageInner />
    </Suspense>
  )
}
