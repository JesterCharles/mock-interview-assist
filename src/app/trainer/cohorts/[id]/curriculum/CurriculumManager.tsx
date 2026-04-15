'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CurriculumWeekList,
  type CurriculumWeekItem,
} from '@/components/curriculum/CurriculumWeekList'
import {
  CurriculumWeekForm,
  type CurriculumWeekInput,
} from '@/components/curriculum/CurriculumWeekForm'

interface ApiWeek {
  id: number
  cohortId: number
  weekNumber: number
  skillName: string
  skillSlug: string
  topicTags: string[]
  startDate: string
}

interface CurriculumManagerProps {
  cohortId: number
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

export default function CurriculumManager({ cohortId }: CurriculumManagerProps) {
  const [weeks, setWeeks] = useState<ApiWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const fetchWeeks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/curriculum`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          body?.error ?? `Failed to load curriculum (${res.status})`,
        )
      }
      const data: ApiWeek[] = await res.json()
      setWeeks(
        [...data].sort((a, b) => a.weekNumber - b.weekNumber),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load curriculum')
    } finally {
      setLoading(false)
    }
  }, [cohortId])

  useEffect(() => {
    fetchWeeks()
  }, [fetchWeeks])

  async function handleCreate(input: CurriculumWeekInput) {
    const res = await fetch(`/api/cohorts/${cohortId}/curriculum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekNumber: input.weekNumber,
        skillName: input.skillName,
        skillSlug: slugify(input.skillName),
        topicTags: input.topicTags,
        startDate: input.startDate,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error ?? `Create failed (${res.status})`)
    }
    const created: ApiWeek = await res.json()
    setWeeks((prev) =>
      [...prev, created].sort((a, b) => a.weekNumber - b.weekNumber),
    )
    setFormOpen(false)
  }

  async function handleDelete(id: string | number) {
    const week = weeks.find((w) => w.id === Number(id))
    if (!week) return
    const ok = window.confirm(
      `Delete Week ${week.weekNumber} — ${week.skillName}?`,
    )
    if (!ok) return
    try {
      const res = await fetch(
        `/api/cohorts/${cohortId}/curriculum/${week.id}`,
        { method: 'DELETE' },
      )
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Delete failed (${res.status})`)
      }
      setWeeks((prev) => prev.filter((w) => w.id !== week.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const listItems: CurriculumWeekItem[] = weeks.map((w) => ({
    id: w.id,
    weekNumber: w.weekNumber,
    skillName: w.skillName,
    topicTags: w.topicTags,
    startDate: w.startDate,
  }))

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '16px',
        }}
      >
        {!formOpen && (
          <button
            type="button"
            className="btn-accent-flat"
            onClick={() => setFormOpen(true)}
          >
            Add Week
          </button>
        )}
      </div>

      {formOpen && (
        <div style={{ marginBottom: '24px' }}>
          <CurriculumWeekForm
            onSubmit={handleCreate}
            onCancel={() => setFormOpen(false)}
            submitLabel="Add Week"
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'var(--danger)',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            padding: '32px 0',
            textAlign: 'center',
            color: 'var(--muted)',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
          }}
        >
          Loading curriculum…
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <CurriculumWeekList weeks={listItems} onDelete={handleDelete} />
        </div>
      )}
    </>
  )
}
