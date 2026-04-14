'use client'

import { useState } from 'react'

export interface CurriculumWeekData {
  id: number
  cohortId: number
  weekNumber: number
  skillName: string
  skillSlug: string
  topicTags: string[]
  startDate: string // ISO string from API
}

interface CurriculumWeekRowProps {
  week: CurriculumWeekData
  cohortId: number
  onUpdated: (updated: CurriculumWeekData) => void
  onDeleted: (id: number) => void
}

interface EditState {
  weekNumber: string
  skillName: string
  skillSlug: string
  topicTags: string
  startDate: string
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch {
    return iso
  }
}

export default function CurriculumWeekRow({
  week,
  cohortId,
  onUpdated,
  onDeleted,
}: CurriculumWeekRowProps) {
  const [mode, setMode] = useState<'display' | 'edit'>('display')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({
    weekNumber: String(week.weekNumber),
    skillName: week.skillName,
    skillSlug: week.skillSlug,
    topicTags: week.topicTags.join(', '),
    startDate: formatDate(week.startDate),
  })

  function enterEdit() {
    setEditState({
      weekNumber: String(week.weekNumber),
      skillName: week.skillName,
      skillSlug: week.skillSlug,
      topicTags: week.topicTags.join(', '),
      startDate: formatDate(week.startDate),
    })
    setError(null)
    setMode('edit')
  }

  function cancelEdit() {
    setError(null)
    setMode('display')
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/curriculum/${week.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber: parseInt(editState.weekNumber, 10),
          skillName: editState.skillName.trim(),
          skillSlug: editState.skillSlug.trim(),
          topicTags: editState.topicTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          startDate: editState.startDate,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Save failed (${res.status})`)
      }
      const updated: CurriculumWeekData = await res.json()
      onUpdated(updated)
      setMode('display')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete Week ${week.weekNumber} — ${week.skillName}? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/curriculum/${week.id}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Delete failed (${res.status})`)
      }
      onDeleted(week.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #DDD5C8',
    borderRadius: '6px',
    padding: '6px 8px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    color: '#1A1A1A',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  if (mode === 'edit') {
    return (
      <>
        <tr style={{ background: '#FFF8F0' }}>
          <td>
            <input
              type="number"
              min={1}
              value={editState.weekNumber}
              onChange={(e) => setEditState((s) => ({ ...s, weekNumber: e.target.value }))}
              style={{ ...inputStyle, width: '72px' }}
              aria-label="Week number"
            />
          </td>
          <td>
            <input
              type="text"
              value={editState.skillName}
              onChange={(e) => setEditState((s) => ({ ...s, skillName: e.target.value }))}
              placeholder="e.g. React"
              style={inputStyle}
              aria-label="Skill name"
            />
          </td>
          <td>
            <input
              type="text"
              value={editState.skillSlug}
              onChange={(e) =>
                setEditState((s) => ({
                  ...s,
                  skillSlug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                }))
              }
              placeholder="e.g. react"
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
              aria-label="Skill slug"
            />
          </td>
          <td>
            <input
              type="text"
              value={editState.topicTags}
              onChange={(e) => setEditState((s) => ({ ...s, topicTags: e.target.value }))}
              placeholder="hooks, state, effects"
              style={inputStyle}
              aria-label="Topic tags (comma-separated)"
            />
          </td>
          <td>
            <input
              type="date"
              value={editState.startDate}
              onChange={(e) => setEditState((s) => ({ ...s, startDate: e.target.value }))}
              style={inputStyle}
              aria-label="Start date"
            />
          </td>
          <td>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#C85A2E',
                  color: '#FFFFFF',
                  border: '1px solid #C85A2E',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{
                  background: 'transparent',
                  color: '#1A1A1A',
                  border: '1px solid #DDD5C8',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
        {error && (
          <tr>
            <td
              colSpan={6}
              style={{
                padding: '6px 12px',
                background: '#FDECEB',
                color: '#B83B2E',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
              }}
            >
              {error}
            </td>
          </tr>
        )}
      </>
    )
  }

  return (
    <tr>
      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{week.weekNumber}</td>
      <td>{week.skillName}</td>
      <td>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            color: '#7A7267',
          }}
        >
          {week.skillSlug}
        </span>
      </td>
      <td>
        <span style={{ fontSize: '13px', color: '#7A7267' }}>
          {week.topicTags.length > 0 ? week.topicTags.join(', ') : '—'}
        </span>
      </td>
      <td className="trainer-meta">{formatDate(week.startDate)}</td>
      <td>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {error && (
            <span style={{ fontSize: '12px', color: '#B83B2E', alignSelf: 'center' }}>
              {error}
            </span>
          )}
          <button
            onClick={enterEdit}
            title="Edit week"
            style={{
              background: 'none',
              border: 'none',
              color: '#C85A2E',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete week"
            style={{
              background: 'none',
              border: 'none',
              color: '#B83B2E',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              cursor: deleting ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  )
}
