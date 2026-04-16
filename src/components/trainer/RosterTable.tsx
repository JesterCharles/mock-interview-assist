'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReadinessDisplay from './ReadinessDisplay'
import { RosterSparkline } from './RosterSparkline'
import { RosterAssociate, RosterSparklineData } from '@/lib/trainer-types'

interface RosterTableProps {
  associates: RosterAssociate[]
  sparklineData?: RosterSparklineData[]
}

type SortField = 'readinessStatus' | 'displayName' | 'sessionCount' | 'lastSessionDate' | 'trend' | 'topGap'
type SortDir = 'asc' | 'desc'

const READINESS_ORDER = { not_ready: 0, improving: 1, ready: 2 }
const TREND_ORDER = { new: 0, declining: 1, steady: 2, improving: 3 }

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1d ago'
  return `${diffDays}d ago`
}

function trendColor(word: 'improving' | 'declining' | 'steady' | 'new'): string {
  switch (word) {
    case 'improving': return 'var(--success)'
    case 'declining': return 'var(--danger)'
    case 'steady': return 'var(--warning)'
    case 'new': return 'var(--muted)'
  }
}

export default function RosterTable({ associates, sparklineData }: RosterTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('readinessStatus')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Build sparkline lookup by slug for O(1) access in render
  const sparklineBySlug = new Map<string, RosterSparklineData>()
  if (sparklineData) {
    for (const s of sparklineData) {
      sparklineBySlug.set(s.slug, s)
    }
  }

  const sorted = [...associates].sort((a, b) => {
    let cmp = 0
    if (sortField === 'readinessStatus') {
      cmp = READINESS_ORDER[a.readinessStatus] - READINESS_ORDER[b.readinessStatus]
    } else if (sortField === 'displayName') {
      cmp = a.displayName.localeCompare(b.displayName)
    } else if (sortField === 'sessionCount') {
      cmp = a.sessionCount - b.sessionCount
    } else if (sortField === 'lastSessionDate') {
      const da = a.lastSessionDate ? new Date(a.lastSessionDate).getTime() : 0
      const db = b.lastSessionDate ? new Date(b.lastSessionDate).getTime() : 0
      cmp = da - db
    } else if (sortField === 'trend') {
      const sa = sparklineBySlug.get(a.slug)
      const sb = sparklineBySlug.get(b.slug)
      const ta = sa ? TREND_ORDER[sa.trendWord] : 0
      const tb = sb ? TREND_ORDER[sb.trendWord] : 0
      cmp = ta - tb
    } else if (sortField === 'topGap') {
      const ga = sparklineBySlug.get(a.slug)?.topGap ?? ''
      const gb = sparklineBySlug.get(b.slug)?.topGap ?? ''
      cmp = ga.localeCompare(gb)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  function sortIndicator(field: SortField) {
    if (sortField !== field) return null
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div>
      <p className="trainer-section-label" style={{ marginBottom: '12px' }}>
        roster
      </p>
      <div className="trainer-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="trainer-table">
          <thead>
            <tr>
              <th>
                <button onClick={() => handleSort('displayName')}>
                  Name{sortIndicator('displayName')}
                </button>
              </th>
              <th>Slug</th>
              <th>
                <button onClick={() => handleSort('readinessStatus')}>
                  Readiness{sortIndicator('readinessStatus')}
                </button>
              </th>
              <th>
                <button onClick={() => handleSort('sessionCount')}>
                  Sessions{sortIndicator('sessionCount')}
                </button>
              </th>
              <th>
                <button onClick={() => handleSort('lastSessionDate')}>
                  Last Session{sortIndicator('lastSessionDate')}
                </button>
              </th>
              <th>Recommended Area</th>
              <th>Trend</th>
              <th>
                <button onClick={() => handleSort('topGap')}>
                  Top Gap{sortIndicator('topGap')}
                </button>
              </th>
              <th style={{ width: '56px' }}>Sparkline</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#7A7267',
                    fontStyle: 'italic',
                  }}
                >
                  No associates found. Add associates to get started.
                </td>
              </tr>
            )}
            {sorted.map((associate) => (
              <tr
                key={associate.slug}
                onClick={() => router.push(`/trainer/${associate.slug}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push(`/trainer/${associate.slug}`)
                  }
                }}
                aria-label={`View ${associate.displayName} detail`}
              >
                <td style={{ fontWeight: 500 }}>{associate.displayName}</td>
                <td>
                  <span className="trainer-meta" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                    {associate.slug}
                  </span>
                </td>
                <td>
                  <ReadinessDisplay
                    score={associate.readinessScore}
                    status={associate.readinessStatus}
                  />
                </td>
                <td>{associate.sessionCount}</td>
                <td className="trainer-meta">{formatDate(associate.lastSessionDate)}</td>
                <td className="trainer-meta">
                  {associate.recommendedArea ?? (
                    <span style={{ color: '#DDD5C8' }}>—</span>
                  )}
                </td>
                {(() => {
                  const sp = sparklineBySlug.get(associate.slug)
                  return (
                    <>
                      <td style={{ verticalAlign: 'middle' }}>
                        {sp ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontWeight: 500,
                                fontSize: '12px',
                                color: trendColor(sp.trendWord),
                                lineHeight: 1.4,
                              }}
                            >
                              {sp.trendWord}
                            </span>
                            {sp.lastMockDate && (
                              <span
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontSize: '12px',
                                  color: 'var(--muted)',
                                  lineHeight: 1.4,
                                }}
                              >
                                {relativeTime(sp.lastMockDate)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        {sp?.topGap ? (
                          <span
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontWeight: 500,
                              fontSize: '12px',
                              background: 'var(--surface-muted)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sp.topGap}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'middle', width: '56px' }}>
                        <RosterSparkline data={sp?.sparkline ?? []} />
                      </td>
                    </>
                  )
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
