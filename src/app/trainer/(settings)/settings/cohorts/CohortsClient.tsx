'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CohortCard } from '@/components/cohort/CohortCard'
import { CohortForm, type CohortInput } from '@/components/cohort/CohortForm'

export interface CohortWithCounts {
  id: number
  name: string
  startDate: string
  endDate: string | null
  description: string | null
  associateCount: number
  readyCount: number
  improvingCount: number
  notReadyCount: number
}

interface Props {
  initialCohorts: CohortWithCounts[]
}

interface ZodIssue {
  path: (string | number)[]
  message: string
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export default function CohortsClient({ initialCohorts }: Props) {
  const [cohorts, setCohorts] = useState<CohortWithCounts[]>(initialCohorts)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCohortId, setEditingCohortId] = useState<number | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [formInitial, setFormInitial] = useState<CohortInput | undefined>()

  const isEditing = editingCohortId !== null

  function openCreateForm() {
    setEditingCohortId(null)
    setFormInitial(undefined)
    setRowError(null)
    setFormOpen(true)
  }

  function openEditForm(c: CohortWithCounts) {
    setEditingCohortId(c.id)
    setFormInitial({
      name: c.name,
      startDate: toDateInputValue(c.startDate),
      endDate: toDateInputValue(c.endDate),
      description: c.description ?? '',
    })
    setRowError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingCohortId(null)
    setFormInitial(undefined)
  }

  async function handleSubmit(input: CohortInput) {
    const payload: Record<string, unknown> = {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate || null,
      description: input.description || null,
    }

    const url = isEditing
      ? `/api/cohorts/${editingCohortId}`
      : '/api/cohorts'
    const method = isEditing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.status === 400) {
      const body = await res.json().catch(() => ({}))
      const issues = Array.isArray(body?.issues)
        ? (body.issues as ZodIssue[]).map((i) => i.message).join('; ')
        : null
      throw new Error(issues || body?.error || 'Invalid input')
    }
    if (res.status === 409) {
      throw new Error('A cohort with that name already exists')
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error ?? `Request failed (${res.status})`)
    }

    const saved = await res.json()
    if (isEditing) {
      setCohorts((prev) =>
        prev.map((c) =>
          c.id === saved.id
            ? {
                ...saved,
                associateCount: c.associateCount,
                readyCount: c.readyCount,
                improvingCount: c.improvingCount,
                notReadyCount: c.notReadyCount,
              }
            : c,
        ),
      )
    } else {
      setCohorts((prev) => [
        {
          ...saved,
          associateCount: 0,
          readyCount: 0,
          improvingCount: 0,
          notReadyCount: 0,
        },
        ...prev,
      ])
    }
    closeForm()
  }

  async function handleDelete(c: CohortWithCounts) {
    setRowError(null)
    const ok = window.confirm(
      `Delete cohort "${c.name}"? Associates will be unassigned but kept.`,
    )
    if (!ok) return

    try {
      const res = await fetch(`/api/cohorts/${c.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.status === 204) {
        setCohorts((prev) => prev.filter((row) => row.id !== c.id))
        if (editingCohortId === c.id) closeForm()
        return
      }
      const body = await res.json().catch(() => ({}))
      setRowError(body?.error ?? `Delete failed (${res.status})`)
    } catch (err) {
      console.error('[CohortsClient] delete failed', err)
      setRowError('Network error deleting cohort')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '32px',
            gap: '16px',
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display), 'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: '48px',
              color: 'var(--ink)',
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Cohorts
          </h1>
          {!formOpen && (
            <button
              type="button"
              className="btn-accent-flat"
              onClick={openCreateForm}
            >
              New Cohort
            </button>
          )}
        </div>

        {formOpen && (
          <div style={{ marginBottom: '32px' }}>
            <CohortForm
              initial={formInitial}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              submitLabel={isEditing ? 'Update' : 'Create'}
              title={isEditing ? 'Edit Cohort' : 'New Cohort'}
            />
          </div>
        )}

        {rowError && (
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
              marginBottom: '24px',
            }}
          >
            {rowError}
          </div>
        )}

        {cohorts.length === 0 ? (
          <div
            style={{
              padding: '64px 24px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '14px',
              border: '1px dashed var(--border)',
              borderRadius: '12px',
              backgroundColor: 'var(--surface)',
            }}
          >
            No cohorts yet. Click &ldquo;New Cohort&rdquo; to create the first one.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
              gap: '24px',
            }}
          >
            {cohorts.map((c) => (
              <div key={c.id}>
                <CohortCard
                  cohort={{
                    id: c.id,
                    name: c.name,
                    startDate: c.startDate,
                    endDate: c.endDate,
                    description: c.description,
                    associateCount: c.associateCount,
                    readyCount: c.readyCount,
                    improvingCount: c.improvingCount,
                    notReadyCount: c.notReadyCount,
                  }}
                  onEdit={() => openEditForm(c)}
                  onDelete={() => handleDelete(c)}
                />
                <div
                  style={{
                    marginTop: '8px',
                    textAlign: 'right',
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    fontSize: '13px',
                  }}
                >
                  <Link
                    href={`/trainer/settings/cohorts/${c.id}`}
                    style={{
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    View cohort →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
