'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { AssociateDetail } from '@/lib/trainer-types'
import ReadinessDisplay from '@/components/trainer/ReadinessDisplay'
import SessionHistoryList from '@/components/trainer/SessionHistoryList'
import EmptyGapState from '@/components/trainer/EmptyGapState'
import GapTrendChart from '@/components/trainer/GapTrendChart'
import CalibrationView from '@/components/trainer/CalibrationView'
import { GeneratePinButton } from '@/app/trainer/components/GeneratePinButton'
import '../trainer.css'

export default function AssociateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [detail, setDetail] = useState<AssociateDetail | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auth guard — matching existing /trainer and /dashboard pattern exactly (D-06, T-06-02)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch associate detail after auth confirmed
  useEffect(() => {
    if (authLoading || !isAuthenticated || !slug) return

    async function fetchDetail() {
      try {
        setDataLoading(true)
        setError(null)
        const res = await fetch(`/api/trainer/${slug}`)
        if (res.status === 404) {
          // Associate not found — redirect back to roster
          router.push('/trainer')
          return
        }
        if (!res.ok) {
          throw new Error(`Failed to load associate (${res.status})`)
        }
        const data: AssociateDetail = await res.json()
        setDetail(data)
      } catch (err) {
        console.error('[AssociateDetailPage] fetch failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to load associate')
      } finally {
        setDataLoading(false)
      }
    }

    fetchDetail()
  }, [authLoading, isAuthenticated, slug, router])

  // While auth is resolving, render nothing to avoid flash
  if (authLoading) {
    return null
  }

  // After auth resolves, if not authenticated let the redirect above take effect
  if (!isAuthenticated) {
    return null
  }

  const hasGapData = detail
    ? detail.gapScores.length > 0 && detail.sessionCount >= 3
    : false

  const hasCalibrationData = detail
    ? detail.sessions.some((s) => Object.keys(s.assessments).length > 0)
    : false

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
            color: '#7A7267',
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
                backgroundColor: '#E8E2D9',
                marginBottom: '12px',
              }}
            />
            <div
              className="animate-pulse"
              style={{
                height: '16px',
                width: '160px',
                borderRadius: '4px',
                backgroundColor: '#F0EBE2',
              }}
            />
          </div>
        )}

        {error && !dataLoading && (
          <div
            style={{
              backgroundColor: '#FDECEB',
              border: '1px solid #B83B2E',
              borderRadius: '8px',
              padding: '16px',
              color: '#B83B2E',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {!dataLoading && !error && detail && (
          <>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
              <h1
                style={{
                  fontFamily: 'Clash Display, sans-serif',
                  fontWeight: 600,
                  fontSize: '48px',
                  color: '#1A1A1A',
                  lineHeight: 1.1,
                  marginBottom: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                {detail.displayName}
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  fontFamily: 'DM Sans, sans-serif',
                  color: '#7A7267',
                  marginBottom: '12px',
                }}
              >
                {detail.slug}
              </p>
              <ReadinessDisplay
                score={detail.readinessScore}
                status={detail.readinessStatus}
              />
              <div style={{ marginTop: '16px' }}>
                <GeneratePinButton
                  associateId={detail.id}
                  associateName={detail.displayName}
                />
              </div>
            </div>

            {/* Asymmetric layout: 60% session history / 40% chart + calibration */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '3fr 2fr',
                gap: '24px',
                alignItems: 'start',
              }}
              className="detail-grid"
            >
              {/* Left column — session history (60%) */}
              <div>
                <SessionHistoryList sessions={detail.sessions} />
              </div>

              {/* Right column — gap chart + calibration (40%) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Gap trend chart section */}
                <div className="trainer-card">
                  <p className="trainer-section-label" style={{ marginBottom: '12px' }}>
                    gap trends
                  </p>
                  {hasGapData ? (
                    <GapTrendChart
                      gapScores={detail.gapScores}
                      sessions={detail.sessions}
                    />
                  ) : (
                    <EmptyGapState sessionCount={detail.sessionCount} />
                  )}
                </div>

                {/* Score calibration section */}
                <div className="trainer-card">
                  <p className="trainer-section-label" style={{ marginBottom: '12px' }}>
                    score calibration
                  </p>
                  {hasCalibrationData ? (
                    <CalibrationView sessions={detail.sessions} />
                  ) : (
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
                      Select a session to view score calibration
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
