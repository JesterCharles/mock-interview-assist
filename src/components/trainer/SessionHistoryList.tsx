'use client'

import { SessionSummary } from '@/lib/trainer-types'

interface SessionHistoryListProps {
  sessions: SessionSummary[]
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[_-]/g, ' ')
  const isComplete = normalized.includes('complet')
  const isProgress = normalized.includes('progress') || normalized.includes('active')

  const bgColor = isComplete ? '#E8F5EE' : isProgress ? '#FEF3E0' : '#F0EBE2'
  const textColor = isComplete ? '#2D6A4F' : isProgress ? '#B7791F' : '#7A7267'

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500,
        backgroundColor: bgColor,
        color: textColor,
        textTransform: 'capitalize',
      }}
    >
      {normalized}
    </span>
  )
}

export default function SessionHistoryList({ sessions }: SessionHistoryListProps) {
  return (
    <div>
      <p className="trainer-section-label" style={{ marginBottom: '12px' }}>
        session history
      </p>

      {sessions.length === 0 ? (
        <div
          className="trainer-card"
          style={{ padding: '32px', textAlign: 'center' }}
        >
          <p
            style={{
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              color: '#7A7267',
              margin: 0,
            }}
          >
            No sessions recorded yet
          </p>
        </div>
      ) : (
        <div className="trainer-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="trainer-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Technical Score</th>
                <th>Soft Skill Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <span
                      style={{
                        fontSize: '14px',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 400,
                        color: '#1A1A1A',
                      }}
                    >
                      {formatDate(session.date)}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '14px',
                        fontFamily: 'DM Sans, sans-serif',
                        fontVariantNumeric: 'tabular-nums',
                        color: session.overallTechnicalScore !== null ? '#1A1A1A' : '#7A7267',
                      }}
                    >
                      {session.overallTechnicalScore !== null
                        ? Math.round(session.overallTechnicalScore)
                        : '---'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '14px',
                        fontFamily: 'DM Sans, sans-serif',
                        fontVariantNumeric: 'tabular-nums',
                        color: session.overallSoftSkillScore !== null ? '#1A1A1A' : '#7A7267',
                      }}
                    >
                      {session.overallSoftSkillScore !== null
                        ? Math.round(session.overallSoftSkillScore)
                        : '---'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={session.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
