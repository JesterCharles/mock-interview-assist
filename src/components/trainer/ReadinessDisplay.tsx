'use client'

interface ReadinessDisplayProps {
  score: number | null
  status: 'ready' | 'improving' | 'not_ready'
}

const STATUS_CONFIG = {
  ready: {
    trendWord: 'ascending',
    colorClass: 'readiness-ready',
    color: 'var(--success)',
  },
  improving: {
    trendWord: 'climbing',
    colorClass: 'readiness-improving',
    color: 'var(--accent)',
  },
  not_ready: {
    trendWord: 'stalling',
    colorClass: 'readiness-not-ready',
    color: 'var(--danger)',
  },
} as const

export default function ReadinessDisplay({ score, status }: ReadinessDisplayProps) {
  const config = STATUS_CONFIG[status]

  if (score === null) {
    return (
      <span style={{ color: 'var(--muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
        -- pending
      </span>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
      {/* Score — Clash Display 700 */}
      <span
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 700,
          fontSize: '22px',
          color: config.color,
          lineHeight: 1,
        }}
      >
        {Math.round(score)}
      </span>
      {/* Trend word — 11px DM Sans 600 lowercase */}
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
          fontSize: '11px',
          color: config.color,
          textTransform: 'lowercase',
        }}
      >
        {config.trendWord}
      </span>
    </span>
  )
}
