'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { CohortDTO } from '@/lib/cohort-types'
import '../trainer.css'
import './cohorts.css'

interface Props {
  initialCohorts: CohortDTO[]
}

interface FormState {
  name: string
  startDate: string
  endDate: string
  description: string
}

const EMPTY_FORM: FormState = {
  name: '',
  startDate: '',
  endDate: '',
  description: '',
}

interface ZodIssue {
  path: (string | number)[]
  message: string
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  // iso is ISO string — take first 10 chars yyyy-mm-dd
  return iso.slice(0, 10)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}

export default function CohortsClient({ initialCohorts }: Props) {
  const [cohorts, setCohorts] = useState<CohortDTO[]>(initialCohorts)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCohortId, setEditingCohortId] = useState<number | null>(null)
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formTopError, setFormTopError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const isEditing = editingCohortId !== null
  const formTitle = isEditing ? 'Edit Cohort' : 'New Cohort'
  const submitLabel = submitting
    ? isEditing
      ? 'Updating…'
      : 'Creating…'
    : isEditing
    ? 'Update'
    : 'Create'

  const sortedCohorts = useMemo(
    () =>
      [...cohorts].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [cohorts],
  )

  function openCreateForm() {
    setEditingCohortId(null)
    setFormState(EMPTY_FORM)
    setFormErrors({})
    setFormTopError(null)
    setFormOpen(true)
  }

  function openEditForm(c: CohortDTO) {
    setEditingCohortId(c.id)
    setFormState({
      name: c.name,
      startDate: toDateInputValue(c.startDate),
      endDate: toDateInputValue(c.endDate),
      description: c.description ?? '',
    })
    setFormErrors({})
    setFormTopError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingCohortId(null)
    setFormState(EMPTY_FORM)
    setFormErrors({})
    setFormTopError(null)
  }

  function validateLocal(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!formState.name.trim()) {
      errs.name = 'Name is required'
    } else if (formState.name.length > 100) {
      errs.name = 'Name must be 100 characters or fewer'
    }
    if (!formState.startDate) {
      errs.startDate = 'Start date is required'
    }
    if (formState.endDate && formState.startDate) {
      if (new Date(formState.endDate) < new Date(formState.startDate)) {
        errs.endDate = 'End date must be on or after start date'
      }
    }
    if (formState.description.length > 500) {
      errs.description = 'Description must be 500 characters or fewer'
    }
    return errs
  }

  function mapZodIssuesToErrors(issues: ZodIssue[]): Record<string, string> {
    const errs: Record<string, string> = {}
    for (const issue of issues) {
      const field = String(issue.path[0] ?? '')
      if (field && !errs[field]) {
        errs[field] = issue.message
      }
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormTopError(null)

    const localErrs = validateLocal()
    if (Object.keys(localErrs).length > 0) {
      setFormErrors(localErrs)
      return
    }
    setFormErrors({})

    const payload: Record<string, unknown> = {
      name: formState.name.trim(),
      startDate: formState.startDate,
      endDate: formState.endDate || null,
      description: formState.description.trim() || null,
    }

    setSubmitting(true)
    try {
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
        if (Array.isArray(body?.issues)) {
          setFormErrors(mapZodIssuesToErrors(body.issues as ZodIssue[]))
        }
        setFormTopError(body?.error ?? 'Invalid input')
        return
      }
      if (res.status === 409) {
        setFormErrors({ name: 'A cohort with that name already exists' })
        setFormTopError(null)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setFormTopError(body?.error ?? `Request failed (${res.status})`)
        return
      }

      const saved: CohortDTO = await res.json()
      if (isEditing) {
        setCohorts((prev) =>
          prev.map((c) =>
            c.id === saved.id
              ? { ...saved, associateCount: c.associateCount }
              : c,
          ),
        )
      } else {
        setCohorts((prev) => [{ ...saved, associateCount: 0 }, ...prev])
      }
      closeForm()
    } catch (err) {
      console.error('[CohortsClient] submit failed', err)
      setFormTopError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(c: CohortDTO) {
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
    <div className="trainer-shell">
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        <nav className="cohorts-subnav" aria-label="Trainer sections">
          <Link href="/trainer">Dashboard</Link>
          <span className="active" aria-current="page">
            Cohorts
          </span>
        </nav>

        <div className="cohorts-header">
          <h1 className="cohorts-title">Cohorts</h1>
          {!formOpen && (
            <button
              type="button"
              className="cohorts-btn-primary"
              onClick={openCreateForm}
            >
              New Cohort
            </button>
          )}
        </div>

        {formOpen && (
          <form className="cohorts-form" onSubmit={handleSubmit} noValidate>
            <h2 className="cohorts-form-title">{formTitle}</h2>
            {formTopError && (
              <div className="cohorts-form-error" role="alert">
                {formTopError}
              </div>
            )}
            <div className="cohorts-form-grid">
              <div className="cohorts-field full">
                <label htmlFor="cohort-name">Name</label>
                <input
                  id="cohort-name"
                  type="text"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, name: e.target.value }))
                  }
                  maxLength={100}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={
                    formErrors.name ? 'cohort-name-error' : undefined
                  }
                />
                {formErrors.name && (
                  <span id="cohort-name-error" className="error">
                    {formErrors.name}
                  </span>
                )}
              </div>

              <div className="cohorts-field">
                <label htmlFor="cohort-start">Start Date</label>
                <input
                  id="cohort-start"
                  type="date"
                  value={formState.startDate}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, startDate: e.target.value }))
                  }
                  aria-invalid={!!formErrors.startDate}
                />
                {formErrors.startDate && (
                  <span className="error">{formErrors.startDate}</span>
                )}
              </div>

              <div className="cohorts-field">
                <label htmlFor="cohort-end">End Date</label>
                <input
                  id="cohort-end"
                  type="date"
                  value={formState.endDate}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, endDate: e.target.value }))
                  }
                  aria-invalid={!!formErrors.endDate}
                />
                {formErrors.endDate && (
                  <span className="error">{formErrors.endDate}</span>
                )}
              </div>

              <div className="cohorts-field full">
                <label htmlFor="cohort-desc">Description</label>
                <textarea
                  id="cohort-desc"
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      description: e.target.value,
                    }))
                  }
                  maxLength={500}
                  aria-invalid={!!formErrors.description}
                />
                {formErrors.description && (
                  <span className="error">{formErrors.description}</span>
                )}
              </div>
            </div>

            <div className="cohorts-form-actions">
              <button
                type="button"
                className="cohorts-btn-secondary"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cohorts-btn-primary"
                disabled={submitting}
              >
                {submitLabel}
              </button>
            </div>
          </form>
        )}

        {rowError && (
          <div className="cohorts-form-error" role="alert">
            {rowError}
          </div>
        )}

        {sortedCohorts.length === 0 ? (
          <div className="cohorts-empty">
            No cohorts yet. Click &ldquo;New Cohort&rdquo; to create the first one.
          </div>
        ) : (
          <div
            className="trainer-card"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            <table className="trainer-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Associates</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCohorts.map((c) => (
                  <tr key={c.id} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      {c.description && (
                        <div
                          className="trainer-meta"
                          style={{ marginTop: '2px' }}
                        >
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(c.startDate)}</td>
                    <td>{formatDate(c.endDate)}</td>
                    <td>{c.associateCount ?? 0}</td>
                    <td>
                      <div className="cohorts-actions-cell">
                        <button
                          type="button"
                          className="cohorts-btn-ghost"
                          onClick={() => openEditForm(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="cohorts-btn-ghost danger"
                          onClick={() => handleDelete(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
