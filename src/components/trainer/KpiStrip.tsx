'use client'

import type { KpiData } from '@/lib/trainer-types'

interface KpiStripProps {
  data: KpiData | null
  loading: boolean
}

interface KpiCardProps {
  label: string
  value: React.ReactNode
  sublabel?: React.ReactNode
  loading: boolean
}

function KpiCard({ label, value, sublabel, loading }: KpiCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {loading ? (
        <div
          style={{
            height: '34px',
            background: 'var(--border)',
            borderRadius: '4px',
            opacity: 0,
            animation: 'kpi-fade-in 150ms ease-out 150ms forwards',
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 500,
            fontSize: '28px',
            lineHeight: 1.2,
            animation: 'kpi-fade-in 150ms ease-out forwards',
          }}
        >
          {value}
        </div>
      )}
      <div
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          fontSize: '12px',
          lineHeight: 1.4,
          color: 'var(--muted)',
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            fontSize: '12px',
            lineHeight: 1.4,
            color: 'var(--muted)',
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  )
}

function formatVariance(v: number | null): { text: string; color: string } {
  if (v === null || v === 0) return { text: '—', color: 'var(--muted)' }
  const sign = v > 0 ? '+' : ''
  const text = `${sign}${v.toFixed(1)}`
  const color = v > 0 ? 'var(--success)' : 'var(--danger)'
  return { text, color }
}

export function KpiStrip({ data, loading }: KpiStripProps) {
  const variance = formatVariance(data?.avgVariance ?? null)

  return (
    <>
      <style>{`
        @keyframes kpi-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
        className="kpi-strip-grid"
      >
        <style>{`
          @media (min-width: 768px) {
            .kpi-strip-grid {
              grid-template-columns: repeat(4, 1fr) !important;
            }
          }
        `}</style>

        {/* Avg Readiness */}
        <KpiCard
          label="avg readiness"
          loading={loading}
          value={
            <span style={{ color: 'var(--ink)' }}>
              {data?.avgReadiness != null ? `${Math.round(data.avgReadiness)}%` : '—'}
            </span>
          }
        />

        {/* Mocks This Week */}
        <KpiCard
          label="mocks this week"
          loading={loading}
          value={
            <span style={{ color: 'var(--ink)' }}>
              {data != null ? data.mocksThisWeek : '—'}
            </span>
          }
        />

        {/* At-Risk Count */}
        <KpiCard
          label="at-risk associates"
          loading={loading}
          value={
            <span
              style={{
                color:
                  data != null && data.atRiskCount > 0 ? 'var(--danger)' : 'var(--ink)',
              }}
            >
              {data != null ? data.atRiskCount : '—'}
            </span>
          }
          sublabel={
            data?.topGapSkill ? `top gap: ${data.topGapSkill}` : undefined
          }
        />

        {/* AI-Trainer Variance */}
        <KpiCard
          label="ai–trainer variance"
          loading={loading}
          value={
            <span style={{ color: variance.color }}>
              {data != null ? variance.text : '—'}
            </span>
          }
        />
      </div>
    </>
  )
}
