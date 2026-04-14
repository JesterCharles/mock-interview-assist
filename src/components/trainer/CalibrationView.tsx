'use client'

import { useState, useMemo, useEffect } from 'react'
import { SessionSummary } from '@/lib/trainer-types'

interface CalibrationViewProps {
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

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span style={{ color: '#7A7267', fontVariantNumeric: 'tabular-nums' }}>---</span>
    )
  }

  const color =
    delta > 0 ? '#2D6A4F' : delta < 0 ? '#B83B2E' : '#7A7267'
  const prefix = delta > 0 ? '+' : ''

  return (
    <span
      style={{
        color,
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px',
        fontWeight: delta !== 0 ? 500 : 400,
      }}
    >
      {prefix}{delta}
    </span>
  )
}

export default function CalibrationView({ sessions }: CalibrationViewProps) {
  // Only show sessions that have at least one assessment with scores
  const scoredSessions = useMemo(
    () =>
      sessions.filter((s) =>
        Object.values(s.assessments).some(
          (a) => a.llmScore !== undefined || a.finalScore !== undefined
        )
      ),
    [sessions]
  )

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    scoredSessions[0]?.id ?? ''
  )

  // Sync selectedSessionId when sessions prop changes and current selection is stale (WR-02)
  useEffect(() => {
    if (scoredSessions.length > 0 && !scoredSessions.find((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(scoredSessions[0].id)
    }
  }, [scoredSessions, selectedSessionId])

  const selectedSession = useMemo(
    () => scoredSessions.find((s) => s.id === selectedSessionId) ?? null,
    [scoredSessions, selectedSessionId]
  )

  if (scoredSessions.length === 0) {
    return (
      <p
        style={{
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
          color: '#7A7267',
          margin: 0,
          paddingTop: '8px',
          paddingBottom: '8px',
        }}
      >
        No scored sessions available
      </p>
    )
  }

  const assessmentEntries = selectedSession
    ? Object.entries(selectedSession.assessments)
    : []

  return (
    <div>
      {/* Session selector */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          style={{
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: '#7A7267',
          }}
        >
          session
        </label>
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            color: '#1A1A1A',
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDD5C8',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            outline: 'none',
            width: '100%',
          }}
        >
          {scoredSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {formatDate(s.date)}
            </option>
          ))}
        </select>
      </div>

      {/* Calibration table */}
      {assessmentEntries.length === 0 ? (
        <p
          style={{
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
            color: '#7A7267',
            margin: 0,
          }}
        >
          No question assessments for this session
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#7A7267',
                    borderBottom: '1px solid #DDD5C8',
                    padding: '8px 12px 8px 0',
                  }}
                >
                  Question
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#7A7267',
                    borderBottom: '1px solid #DDD5C8',
                    padding: '8px 12px',
                  }}
                >
                  AI Score
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#7A7267',
                    borderBottom: '1px solid #DDD5C8',
                    padding: '8px 12px',
                  }}
                >
                  Trainer Score
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#7A7267',
                    borderBottom: '1px solid #DDD5C8',
                    padding: '8px 0 8px 12px',
                  }}
                >
                  Delta
                </th>
              </tr>
            </thead>
            <tbody>
              {assessmentEntries.map(([key, assessment]) => {
                const llm = assessment.llmScore ?? null
                const trainer = assessment.finalScore ?? null
                const delta =
                  llm !== null && trainer !== null
                    ? Math.round(trainer - llm)
                    : null

                return (
                  <tr
                    key={key}
                    style={{
                      transition: 'background-color 100ms ease-out',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                        '#FFF8F0'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                        'transparent'
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 12px 10px 0',
                        borderBottom: '1px solid #E8E2D9',
                        color: '#7A7267',
                        fontSize: '13px',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {assessment.questionId}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #E8E2D9',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: llm !== null ? '#1A1A1A' : '#7A7267',
                      }}
                    >
                      {llm !== null ? Math.round(llm) : '---'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #E8E2D9',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: trainer !== null ? '#1A1A1A' : '#7A7267',
                      }}
                    >
                      {trainer !== null ? Math.round(trainer) : '---'}
                    </td>
                    <td
                      style={{
                        padding: '10px 0 10px 12px',
                        borderBottom: '1px solid #E8E2D9',
                        textAlign: 'right',
                      }}
                    >
                      <DeltaCell delta={delta} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
