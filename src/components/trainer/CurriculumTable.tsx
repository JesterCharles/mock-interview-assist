'use client'

import { useState, useEffect, useCallback } from 'react'
import CurriculumWeekRow, { CurriculumWeekData } from './CurriculumWeekRow'
import '../../../app/trainer/trainer.css'

interface CurriculumTableProps {
  cohortId: number
  refreshSignal?: number // increment to trigger a refetch
}

export default function CurriculumTable({ cohortId, refreshSignal }: CurriculumTableProps) {
  const [weeks, setWeeks] = useState<CurriculumWeekData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeeks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/curriculum`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to load curriculum (${res.status})`)
      }
      const data: CurriculumWeekData[] = await res.json()
      setWeeks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load curriculum')
    } finally {
      setLoading(false)
    }
  }, [cohortId])

  useEffect(() => {
    fetchWeeks()
  }, [fetchWeeks, refreshSignal])

  function handleUpdated(updated: CurriculumWeekData) {
    setWeeks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
  }

  function handleDeleted(id: number) {
    setWeeks((prev) => prev.filter((w) => w.id !== id))
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '32px 0',
          textAlign: 'center',
          color: '#7A7267',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14px',
        }}
      >
        Loading curriculum…
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          background: '#FDECEB',
          border: '1px solid #B83B2E',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#B83B2E',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '13px',
        }}
      >
        {error}
      </div>
    )
  }

  return (
    <div className="trainer-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="trainer-table">
        <thead>
          <tr>
            <th style={{ width: '80px' }}>Week #</th>
            <th>Skill Name</th>
            <th>Skill Slug</th>
            <th>Topic Tags</th>
            <th style={{ width: '120px' }}>Start Date</th>
            <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {weeks.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                style={{
                  textAlign: 'center',
                  padding: '48px 16px',
                  color: '#7A7267',
                  fontStyle: 'italic',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                }}
              >
                No curriculum weeks yet. Add one below.
              </td>
            </tr>
          ) : (
            weeks.map((week) => (
              <CurriculumWeekRow
                key={week.id}
                week={week}
                cohortId={cohortId}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
