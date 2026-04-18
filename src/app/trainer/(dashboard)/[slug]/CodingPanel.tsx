'use client'

import { useEffect, useMemo, useState } from 'react'
import { CodingAttemptsTable } from './CodingAttemptsTable'
import { CodingSkillBars } from './CodingSkillBars'
import type { AssociateCodingPayload } from '@/lib/trainer-types'

interface Props {
  slug: string
}

/**
 * CodingPanel — fetches /api/trainer/[slug]/coding and renders table + bars
 * with language + skill filter state. Lives BELOW the existing
 * <AssociateDashboardClient /> per DESIGN.md (panel, not tab) so trainer
 * can keep interview + coding context visible simultaneously.
 *
 * Phase 41 Plan 02 Task 3.
 */
export function CodingPanel({ slug }: Props) {
  const [data, setData] = useState<AssociateCodingPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [skillFilter, setSkillFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch(`/api/trainer/${encodeURIComponent(slug)}/coding`)
        if (!res.ok) {
          throw new Error(`Coding fetch failed (${res.status})`)
        }
        const json: AssociateCodingPayload = await res.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load coding data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [slug])

  const filteredAttempts = useMemo(() => {
    if (!data) return []
    return data.attempts.filter((a) => {
      if (languageFilter !== 'all' && a.language !== languageFilter) return false
      return true
    })
  }, [data, languageFilter])

  const filteredSkillScores = useMemo(() => {
    if (!data) return []
    return data.codingSkillScores.filter((s) => {
      if (skillFilter !== 'all' && s.skillSlug !== skillFilter) return false
      return true
    })
  }, [data, skillFilter])

  const languageOptions = useMemo(() => {
    const set = new Set<string>()
    data?.attempts.forEach((a) => set.add(a.language))
    return ['all', ...Array.from(set).sort()]
  }, [data])

  const skillOptions = useMemo(() => {
    const set = new Set<string>()
    data?.codingSkillScores.forEach((s) => set.add(s.skillSlug))
    return ['all', ...Array.from(set).sort()]
  }, [data])

  return (
    <section
      style={{
        marginTop: '48px',
        padding: '32px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
      }}
    >
      <h2
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--ink)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        Coding practice
      </h2>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: 'var(--muted)',
          margin: '4px 0 24px 0',
        }}
      >
        Difficulty-weighted coding signals from this associate&rsquo;s recent attempts.
      </p>

      {loading && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: 'var(--muted)',
          }}
        >
          Loading coding data&hellip;
        </p>
      )}

      {error && !loading && (
        <div
          style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            padding: '16px',
            color: 'var(--danger)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Filter row */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '24px',
            }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Language
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: 'var(--ink)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  minWidth: '140px',
                }}
              >
                {languageOptions.map((l) => (
                  <option key={l} value={l}>
                    {l === 'all' ? 'All languages' : l}
                  </option>
                ))}
              </select>
            </label>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Skill
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: 'var(--ink)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  minWidth: '200px',
                }}
              >
                {skillOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All skills' : s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <CodingSkillBars scores={filteredSkillScores} />
          <CodingAttemptsTable attempts={filteredAttempts} />
        </>
      )}
    </section>
  )
}
