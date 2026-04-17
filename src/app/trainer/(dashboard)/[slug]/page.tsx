'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { AssociateDetail } from '@/lib/trainer-types'
import ReadinessDisplay from '@/components/trainer/ReadinessDisplay'
import AssociateCohortSelect from './AssociateCohortSelect'
import { AssociateDashboardClient } from '@/app/associate/[slug]/dashboard/AssociateDashboardClient'
import '../trainer.css'

export default function AssociateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [detail, setDetail] = useState<AssociateDetail | null>(null)
  const [threshold, setThreshold] = useState<number>(75)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  async function handleExportPdf() {
    if (!slug) return
    setExportingPdf(true)
    try {
      const res = await fetch(`/api/trainer/reports/associate-pdf?slug=${encodeURIComponent(slug)}`)
      if (!res.ok) {
        console.error('[AssociateDetailPage] Export PDF failed:', res.status)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nlm-${slug}-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingPdf(false)
    }
  }

  // Fetch associate detail and settings in parallel after auth confirmed
  useEffect(() => {
    if (authLoading || !isAuthenticated || !slug) return

    async function fetchData() {
      try {
        setDataLoading(true)
        setError(null)

        const [detailRes, settingsRes] = await Promise.all([
          fetch(`/api/trainer/${slug}`),
          fetch('/api/settings'),
        ])

        if (detailRes.status === 404) {
          router.push('/trainer')
          return
        }
        if (!detailRes.ok) {
          throw new Error(`Failed to load associate (${detailRes.status})`)
        }

        const data: AssociateDetail = await detailRes.json()
        setDetail(data)

        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (typeof settings?.readinessThreshold === 'number') {
            setThreshold(settings.readinessThreshold)
          }
        }
      } catch (err) {
        console.error('[AssociateDetailPage] fetch failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to load associate')
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [authLoading, isAuthenticated, slug, router])

  // While auth is resolving, render nothing to avoid flash
  if (authLoading) {
    return null
  }

  // After auth resolves, if not authenticated middleware handles redirect
  if (!isAuthenticated) {
    return null
  }

  // Derive recommendedArea and lowestScore from gap scores
  const skillLevelGaps = detail
    ? detail.gapScores
        .filter((g) => !g.topic || g.topic === '')
        .sort((a, b) => a.weightedScore - b.weightedScore)
    : []
  const lowestGap = skillLevelGaps[0] ?? null
  const recommendedArea = lowestGap?.skill ?? null
  const lowestScore = lowestGap?.weightedScore ?? null
  const lowestSkillSessionCount = lowestGap?.sessionCount ?? 0

  return (
    <div className="trainer-shell">
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        {/* Back link */}
        <Link
          href="/trainer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            color: 'var(--muted)',
            textDecoration: 'none',
            marginBottom: '24px',
          }}
        >
          ← Back to roster
        </Link>

        {dataLoading && (
          <div>
            <div
              className="animate-pulse"
              style={{
                height: '52px',
                width: '300px',
                borderRadius: '6px',
                backgroundColor: 'var(--border-subtle)',
                marginBottom: '12px',
              }}
            />
            <div
              className="animate-pulse"
              style={{
                height: '16px',
                width: '160px',
                borderRadius: '4px',
                backgroundColor: 'var(--surface-muted)',
              }}
            />
          </div>
        )}

        {error && !dataLoading && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: '8px',
              padding: '16px',
              color: 'var(--danger)',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {!dataLoading && !error && detail && (
          <>
            {/* Header — name left, actions top-right */}
            <div
              style={{
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '24px',
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  fontFamily: 'Clash Display, sans-serif',
                  fontWeight: 600,
                  fontSize: '48px',
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {detail.displayName}
              </h1>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '12px',
                  minWidth: '240px',
                }}
              >
                <AssociateCohortSelect
                  slug={detail.slug}
                  initialCohortId={detail.cohortId}
                  initialCohortName={detail.cohortName}
                />
                <ReadinessDisplay
                  score={detail.readinessScore}
                  status={detail.readinessStatus}
                />
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    background: 'transparent',
                    color: exportingPdf ? 'var(--muted)' : 'var(--ink)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: exportingPdf ? 'not-allowed' : 'pointer',
                    opacity: exportingPdf ? 0.6 : 1,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  {exportingPdf ? 'Exporting…' : 'Export PDF'}
                </button>
              </div>
            </div>

            {/* Associate dashboard view — same component associates see */}
            <AssociateDashboardClient
              displayName={detail.displayName}
              gapScores={detail.gapScores}
              sessions={detail.sessions}
              readinessPercent={detail.readinessScore ?? 0}
              threshold={threshold}
              recommendedArea={recommendedArea}
              lowestScore={lowestScore}
              lowestSkillSessionCount={lowestSkillSessionCount}
            />
          </>
        )}
      </div>
    </div>
  )
}
