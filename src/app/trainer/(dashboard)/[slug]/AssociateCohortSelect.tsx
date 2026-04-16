'use client'

import { useEffect, useState } from 'react'
import type { CohortDTO } from '@/lib/cohort-types'

interface Props {
  slug: string
  initialCohortId: number | null
  initialCohortName: string | null
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

export default function AssociateCohortSelect({
  slug,
  initialCohortId,
}: Props) {
  const [cohorts, setCohorts] = useState<CohortDTO[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(initialCohortId)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/cohorts')
        if (!res.ok) throw new Error(`Failed to load cohorts (${res.status})`)
        const data: CohortDTO[] = await res.json()
        if (!cancelled) setCohorts(data)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load cohorts')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value
    const next: number | null = raw === '' ? null : Number(raw)
    const previous = selectedId

    // Optimistic update
    setSelectedId(next)
    setStatus('saving')
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/trainer/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId: next }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Request failed (${res.status})`)
      }

      setStatus('saved')
      setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s))
      }, 2000)
    } catch (err) {
      // Revert
      setSelectedId(previous)
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update cohort')
    }
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#7A7267',
    display: 'block',
    marginBottom: '8px',
  }

  const selectStyle: React.CSSProperties = {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '14px',
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #DDD5C8',
    borderRadius: '6px',
    padding: '8px 12px',
    minWidth: '240px',
    cursor: 'pointer',
  }

  const statusTextStyle: React.CSSProperties = {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    marginLeft: '12px',
  }

  return (
    <div>
      <label style={labelStyle} htmlFor={`cohort-select-${slug}`}>
        cohort
      </label>

      {cohorts === null && !loadError && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: '#7A7267',
            margin: 0,
          }}
        >
          Loading cohorts…
        </p>
      )}

      {loadError && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: '#B83B2E',
            margin: 0,
          }}
        >
          {loadError}
        </p>
      )}

      {cohorts !== null && !loadError && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            id={`cohort-select-${slug}`}
            value={selectedId ?? ''}
            onChange={handleChange}
            disabled={status === 'saving'}
            style={selectStyle}
          >
            <option value="">Unassigned</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {status === 'saving' && (
            <span style={{ ...statusTextStyle, color: '#7A7267' }}>Saving…</span>
          )}
          {status === 'saved' && (
            <span style={{ ...statusTextStyle, color: '#2D6A4F' }}>Saved</span>
          )}
          {status === 'error' && errorMsg && (
            <span style={{ ...statusTextStyle, color: '#B83B2E' }}>{errorMsg}</span>
          )}
        </div>
      )}
    </div>
  )
}
