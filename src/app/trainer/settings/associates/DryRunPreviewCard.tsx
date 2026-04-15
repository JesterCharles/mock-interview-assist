'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { BackfillPreview } from './types'

export default function DryRunPreviewCard() {
  const [data, setData] = useState<BackfillPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/trainer/associates/preview', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as BackfillPreview
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cellStyle: CSSProperties = {
    flex: 1,
    padding: '20px 24px',
    borderRight: '1px solid var(--border-subtle)',
  }
  const valueStyle: CSSProperties = {
    fontFamily: "'Clash Display', sans-serif",
    fontSize: 32,
    fontWeight: 600,
    color: 'var(--ink)',
    display: 'block',
    letterSpacing: '-0.01em',
    fontVariantNumeric: 'tabular-nums',
  }
  const labelStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--muted)',
    marginTop: 6,
    display: 'block',
  }
  const headerStyle: CSSProperties = {
    padding: '12px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--muted)',
    background: 'var(--surface-muted)',
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={headerStyle}>dry-run preview</div>

      {loading && (
        <div
          style={{
            padding: 24,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: 'var(--muted)',
          }}
        >
          Loading preview…
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            padding: 20,
            color: 'var(--danger)',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
          }}
        >
          Failed to load preview: {error}
        </div>
      )}

      {data && !loading && (
        <div style={{ display: 'flex' }}>
          <div style={cellStyle}>
            <span style={valueStyle}>{data.total}</span>
            <span style={labelStyle}>total</span>
          </div>
          <div style={cellStyle}>
            <span style={valueStyle}>{data.withEmail}</span>
            <span style={labelStyle}>with email</span>
          </div>
          <div style={cellStyle}>
            <span style={valueStyle}>{data.withoutEmail}</span>
            <span style={labelStyle}>missing email</span>
          </div>
          <div style={{ ...cellStyle, borderRight: 'none' }}>
            <span style={valueStyle}>{data.slugOnlyZeroSessions}</span>
            <span style={labelStyle}>deletable</span>
          </div>
        </div>
      )}
    </div>
  )
}
