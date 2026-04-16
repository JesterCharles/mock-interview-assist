'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { GapDrillThroughRow } from '@/lib/trainer-types'

function gapColor(score: number): string {
  if (score < 50) return 'var(--danger)'
  if (score < 75) return 'var(--warning)'
  return 'var(--success)'
}

function GapScoreCell({ score }: { score: number }) {
  const color = gapColor(score)
  const barWidth = Math.round((score / 100) * 60)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color, minWidth: '32px', fontWeight: 500 }}>{Math.round(score)}</span>
      <div
        style={{
          width: `${barWidth}px`,
          height: '6px',
          borderRadius: '3px',
          background: color,
          flexShrink: 0,
        }}
      />
    </div>
  )
}

function relativeDate(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function SkeletonRow() {
  return (
    <tr>
      {[40, 20, 20].map((w, i) => (
        <td key={i} style={{ padding: '12px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              width: `${w * 0.8}%`,
              height: '14px',
              borderRadius: '3px',
              background: 'var(--surface-muted)',
            }}
          />
        </td>
      ))}
    </tr>
  )
}

interface PageProps {
  params: Promise<{ skill: string }>
}

export default function GapDrillThroughPage({ params }: PageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const topic = searchParams.get('topic') ?? ''
  const cohortId = searchParams.get('cohort')

  const [skillDecoded, setSkillDecoded] = useState('')
  const [rows, setRows] = useState<GapDrillThroughRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Resolve async params
  useEffect(() => {
    params.then((p) => setSkillDecoded(decodeURIComponent(p.skill)))
  }, [params])

  const fetchData = useCallback(async () => {
    if (!skillDecoded || !topic) return
    setLoading(true)
    setError(false)
    try {
      const qs = new URLSearchParams({ skill: skillDecoded, topic })
      if (cohortId) qs.set('cohort', cohortId)
      const res = await fetch(`/api/trainer/gap-analysis?${qs.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: GapDrillThroughRow[] = await res.json()
      setRows(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [skillDecoded, topic, cohortId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const backHref =
    '/trainer/gap-analysis' + (cohortId ? `?cohort=${cohortId}` : '')

  const topicDecoded = decodeURIComponent(topic)

  return (
    <div style={{ padding: '32px 24px' }}>
      {/* Back link */}
      <Link
        href={backHref}
        style={{
          fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--accent)',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '20px',
        }}
      >
        ← Back to Gap Analysis
      </Link>

      {/* Heading */}
      <h1
        style={{
          fontFamily: 'var(--font-display), "Clash Display", sans-serif',
          fontWeight: 500,
          fontSize: '28px',
          color: 'var(--ink)',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
        }}
      >
        {skillDecoded} — {topicDecoded}
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--muted)',
          margin: '0 0 24px',
        }}
      >
        Associates with this gap · sorted by score ascending
      </p>

      {/* Error state */}
      {error && !loading && (
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
            fontSize: '14px',
            color: 'var(--danger)',
          }}
        >
          Couldn&apos;t load gap data. Refresh to try again.
        </p>
      )}

      {/* Table */}
      {!error && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '25%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Associate Name', 'Gap Score', 'Last Session'].map((label) => (
                <th
                  key={label}
                  style={{
                    fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '8px 8px 10px',
                    textAlign: 'left',
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={3} style={{ padding: '48px 8px', textAlign: 'center' }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                        fontSize: '14px',
                        color: 'var(--muted)',
                        margin: 0,
                      }}
                    >
                      No associates with this gap in the selected cohort.
                    </p>
                  </td>
                </tr>
              )
              : rows.map((row) => (
                <tr
                  key={row.slug}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 150ms ease-out',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background =
                      'var(--highlight)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = ''
                  }}
                >
                  <td
                    style={{
                      padding: '0 8px',
                      height: '48px',
                      verticalAlign: 'middle',
                    }}
                  >
                    <button
                      onClick={() => router.push(`/trainer/${row.slug}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'var(--ink)',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
                        ;(e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'
                        ;(e.currentTarget as HTMLButtonElement).style.textDecoration = 'none'
                      }}
                    >
                      {row.displayName}
                    </button>
                  </td>
                  <td
                    style={{
                      padding: '0 8px',
                      height: '48px',
                      verticalAlign: 'middle',
                    }}
                  >
                    <GapScoreCell score={row.gapScore} />
                  </td>
                  <td
                    style={{
                      fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'var(--muted)',
                      padding: '0 8px',
                      height: '48px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {relativeDate(row.lastSessionDate)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
