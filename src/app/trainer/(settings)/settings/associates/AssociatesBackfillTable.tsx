'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { AssociateBackfillRow } from '@/lib/trainer-types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface RowState {
  emailDraft: string
  saveStatus: SaveStatus
  errorMsg: string | null
}

const UNIQUE_EMAIL_ERROR = 'Email already in use'
const GENERIC_SAVE_ERROR = 'Save failed'

export default function AssociatesBackfillTable() {
  const [rows, setRows] = useState<AssociateBackfillRow[]>([])
  const [rowState, setRowState] = useState<Record<number, RowState>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/trainer/associates', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as AssociateBackfillRow[]
        if (cancelled) return
        setRows(data)
        const initial: Record<number, RowState> = {}
        for (const r of data) {
          initial[r.id] = {
            emailDraft: r.email ?? '',
            saveStatus: 'idle',
            errorMsg: null,
          }
        }
        setRowState(initial)
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function updateRowState(id: number, patch: Partial<RowState>) {
    setRowState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { emailDraft: '', saveStatus: 'idle', errorMsg: null }), ...patch },
    }))
  }

  async function handleSave(row: AssociateBackfillRow) {
    const state = rowState[row.id]
    if (!state) return
    updateRowState(row.id, { saveStatus: 'saving', errorMsg: null })
    try {
      const res = await fetch(`/api/trainer/associates/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.emailDraft || '' }),
      })

      if (res.status === 409) {
        // email_taken — static message, do NOT echo submitted value
        let body: { error?: string } = {}
        try {
          body = await res.json()
        } catch {
          /* ignore parse errors */
        }
        const isTaken = body?.error === 'email_taken'
        updateRowState(row.id, {
          saveStatus: 'error',
          errorMsg: isTaken ? UNIQUE_EMAIL_ERROR : GENERIC_SAVE_ERROR,
        })
        return
      }

      if (!res.ok) {
        updateRowState(row.id, { saveStatus: 'error', errorMsg: GENERIC_SAVE_ERROR })
        return
      }

      const json = (await res.json()) as { id: number; email: string | null }
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, email: json.email ?? null } : r)),
      )
      updateRowState(row.id, { saveStatus: 'saved', errorMsg: null })
      setTimeout(() => {
        setRowState((prev) => {
          const cur = prev[row.id]
          if (!cur || cur.saveStatus !== 'saved') return prev
          return { ...prev, [row.id]: { ...cur, saveStatus: 'idle' } }
        })
      }, 2000)
    } catch {
      updateRowState(row.id, { saveStatus: 'error', errorMsg: GENERIC_SAVE_ERROR })
    }
  }

  async function handleConfirmDelete() {
    if (confirmDeleteId == null) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/trainer/associates/${confirmDeleteId}`, {
        method: 'DELETE',
      })
      if (res.status === 409) {
        setDeleteError('Cannot delete: associate has sessions.')
        return
      }
      if (!res.ok) {
        setDeleteError(`Delete failed (${res.status})`)
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== confirmDeleteId))
      setConfirmDeleteId(null)
    } catch (e) {
      setDeleteError((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  // ---- styles (DESIGN tokens only) ----
  const tableWrap: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
  }
  const tableHeader: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.2fr 2fr 0.8fr 1fr 1.2fr',
    gap: 0,
    padding: '12px 20px',
    background: 'var(--surface-muted)',
    borderBottom: '1px solid var(--border-subtle)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--muted)',
  }
  const tableRow: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1.2fr 2fr 0.8fr 1fr 1.2fr',
    gap: 0,
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    alignItems: 'center',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: 'var(--ink)',
  }
  const cellSlug: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    color: 'var(--ink)',
  }
  const cellMuted: CSSProperties = { color: 'var(--muted)' }
  const input: CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--ink)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    outline: 'none',
  }
  const saveBtn: CSSProperties = {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: 'white',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  }
  const deleteBtn: CSSProperties = {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid var(--danger)',
    background: 'transparent',
    color: 'var(--danger)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  }
  const protectedChip: CSSProperties = {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 9999,
    border: '1px solid var(--border)',
    background: 'var(--surface-muted)',
    color: 'var(--muted)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }
  const statusText = (status: SaveStatus, msg: string | null): CSSProperties => ({
    marginTop: 4,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color:
      status === 'error'
        ? 'var(--danger)'
        : status === 'saved'
        ? 'var(--success)'
        : 'var(--muted)',
    minHeight: 14,
    display: msg || status === 'saved' || status === 'saving' ? 'block' : 'none',
  })

  // ---- render ----
  if (loading) {
    return (
      <div style={tableWrap}>
        <div style={tableHeader}>
          <div>slug</div>
          <div>name</div>
          <div>email</div>
          <div>sessions</div>
          <div>cohort</div>
          <div>actions</div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...tableRow, opacity: 0.5 }}>
            <div style={{ height: 14, background: 'var(--surface-muted)', borderRadius: 4 }} />
            <div style={{ height: 14, background: 'var(--surface-muted)', borderRadius: 4, marginRight: 16 }} />
            <div style={{ height: 32, background: 'var(--surface-muted)', borderRadius: 8, marginRight: 16 }} />
            <div style={{ height: 14, background: 'var(--surface-muted)', borderRadius: 4 }} />
            <div style={{ height: 14, background: 'var(--surface-muted)', borderRadius: 4 }} />
            <div style={{ height: 28, background: 'var(--surface-muted)', borderRadius: 8 }} />
          </div>
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        style={{
          ...tableWrap,
          padding: 24,
          fontFamily: "'DM Sans', sans-serif",
          color: 'var(--danger)',
          fontSize: 14,
        }}
      >
        Failed to load associates: {loadError}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          ...tableWrap,
          padding: 32,
          textAlign: 'center',
          fontFamily: "'DM Sans', sans-serif",
          color: 'var(--muted)',
          fontSize: 14,
        }}
      >
        No associates yet.
      </div>
    )
  }

  return (
    <>
      <div style={tableWrap}>
        <div style={tableHeader}>
          <div>slug</div>
          <div>name</div>
          <div>email</div>
          <div>sessions</div>
          <div>cohort</div>
          <div style={{ textAlign: 'right' }}>actions</div>
        </div>
        {rows.map((row) => {
          const state = rowState[row.id] ?? {
            emailDraft: row.email ?? '',
            saveStatus: 'idle' as SaveStatus,
            errorMsg: null,
          }
          const canDelete = row.sessionCount === 0
          return (
            <div key={row.id} style={tableRow}>
              <div style={cellSlug}>{row.slug}</div>
              <div style={row.displayName ? undefined : cellMuted}>
                {row.displayName ?? '—'}
              </div>
              <div style={{ paddingRight: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={state.emailDraft}
                    onChange={(e) =>
                      updateRowState(row.id, {
                        emailDraft: e.target.value,
                        saveStatus: 'idle',
                        errorMsg: null,
                      })
                    }
                    placeholder="email@example.com"
                    style={input}
                    aria-label={`Email for ${row.slug}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSave(row)}
                    disabled={state.saveStatus === 'saving'}
                    style={{
                      ...saveBtn,
                      opacity: state.saveStatus === 'saving' ? 0.6 : 1,
                    }}
                  >
                    {state.saveStatus === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <div style={statusText(state.saveStatus, state.errorMsg)}>
                  {state.saveStatus === 'saved' && 'Saved'}
                  {state.saveStatus === 'error' && state.errorMsg}
                  {state.saveStatus === 'saving' && ' '}
                </div>
              </div>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>{row.sessionCount}</div>
              <div style={row.cohortName ? undefined : cellMuted}>{row.cohortName ?? '—'}</div>
              <div style={{ textAlign: 'right' }}>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setConfirmDeleteId(row.id)
                    }}
                    style={deleteBtn}
                  >
                    Delete
                  </button>
                ) : (
                  <span style={protectedChip} title="Cannot delete: associate has sessions">
                    has sessions
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {confirmDeleteId != null && (
        <DeleteConfirmModal
          slug={rows.find((r) => r.id === confirmDeleteId)?.slug ?? ''}
          deleting={deleting}
          error={deleteError}
          onCancel={() => {
            if (!deleting) {
              setConfirmDeleteId(null)
              setDeleteError(null)
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}

function DeleteConfirmModal({
  slug,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  slug: string
  deleting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const backdrop: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  }
  const modal: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  }
  const title: CSSProperties = {
    fontFamily: "'Clash Display', sans-serif",
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--ink)',
    margin: '0 0 12px 0',
  }
  const body: CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: 'var(--muted)',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
  }
  const actions: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  }
  const cancelBtn: CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    cursor: 'pointer',
  }
  const confirmBtn: CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid var(--danger)',
    background: 'var(--danger)',
    color: 'white',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    opacity: deleting ? 0.6 : 1,
  }
  const errorBox: CSSProperties = {
    marginBottom: 16,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--danger)',
    background: 'var(--surface-muted)',
    color: 'var(--danger)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
  }

  return (
    <div
      style={backdrop}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2 id="delete-confirm-title" style={title}>
          Delete {slug}?
        </h2>
        <p style={body}>
          This cannot be undone. The associate record will be removed permanently.
        </p>
        {error && <div style={errorBox}>{error}</div>}
        <div style={actions}>
          <button type="button" style={cancelBtn} onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="button" style={confirmBtn} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
