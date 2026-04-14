'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReadinessDisplay from './ReadinessDisplay'
import { RosterAssociate } from '@/lib/trainer-types'

interface RosterTableProps {
  associates: RosterAssociate[]
}

type SortField = 'readinessStatus' | 'displayName' | 'sessionCount' | 'lastSessionDate'
type SortDir = 'asc' | 'desc'

const READINESS_ORDER = { not_ready: 0, improving: 1, ready: 2 }

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RosterTable({ associates }: RosterTableProps) {
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
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
