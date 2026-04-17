'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  RosterAssociate,
  RosterResponse,
  KpiData,
  RosterSparklineData,
  CohortTrendPoint,
} from '@/lib/trainer-types'
import RosterTable from '@/components/trainer/RosterTable'
import { KpiStrip } from '@/components/trainer/KpiStrip'
import { CohortTrends } from '@/components/trainer/CohortTrends'
import './trainer.css'

// Inner component that uses useSearchParams — must be wrapped in Suspense
function TrainerDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const cohortParam = searchParams.get('cohort')

  const [associates, setAssociates] = useState<RosterAssociate[]>([])
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [sparklineData, setSparklineData] = useState<RosterSparklineData[]>([])
  const [cohortTrends, setCohortTrends] = useState<CohortTrendPoint[]>([])

  const [rosterLoading, setRosterLoading] = useState(true)
  const [kpiLoading, setKpiLoading] = useState(true)
  const [sparklineLoading, setSparklineLoading] = useState(true)
  const [trendsLoading, setTrendsLoading] = useState(true)

  const [rosterError, setRosterError] = useState<string | null>(null)

  // Build scoped query param suffix
  const cohortQuery = cohortParam ? `?cohort=${encodeURIComponent(cohortParam)}` : ''
  const cohortIdQuery = cohortParam ? `?cohortId=${encodeURIComponent(cohortParam)}` : ''

  // Fetch roster data
  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    async function fetchRoster() {
      try {
        setRosterLoading(true)
        setRosterError(null)
        // Use legacy cohortId param for the existing roster endpoint
        const url = cohortParam
          ? `/api/trainer${cohortIdQuery}&includeSummary=true`
          : '/api/trainer'
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to load roster (${res.status})`)
        const raw: RosterAssociate[] | RosterResponse = await res.json()
        if (Array.isArray(raw)) {
          setAssociates(raw)
        } else {
          setAssociates(raw.associates)
        }
      } catch (err) {
        console.error('[TrainerPage] roster fetch failed:', err)
        setRosterError(err instanceof Error ? err.message : 'Failed to load roster')
      } finally {
        setRosterLoading(false)
      }
    }

    fetchRoster()
  }, [authLoading, isAuthenticated, cohortParam, cohortIdQuery])

  // Fetch KPI data
  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    async function fetchKpis() {
      try {
        setKpiLoading(true)
        const res = await fetch(`/api/trainer/kpis${cohortQuery}`)
        if (!res.ok) throw new Error(`KPI fetch failed (${res.status})`)
        const data: KpiData = await res.json()
        setKpiData(data)
      } catch (err) {
        console.error('[TrainerPage] KPI fetch failed:', err)
        setKpiData(null)
      } finally {
        setKpiLoading(false)
      }
    }

    fetchKpis()
  }, [authLoading, isAuthenticated, cohortParam, cohortQuery])

  // Fetch sparkline data
  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    async function fetchSparklines() {
      try {
        setSparklineLoading(true)
        const res = await fetch(`/api/trainer/sparklines${cohortQuery}`)
        if (!res.ok) throw new Error(`Sparkline fetch failed (${res.status})`)
        const data: RosterSparklineData[] = await res.json()
        setSparklineData(data)
      } catch (err) {
        console.error('[TrainerPage] sparkline fetch failed:', err)
        setSparklineData([])
      } finally {
        setSparklineLoading(false)
      }
    }

    fetchSparklines()
  }, [authLoading, isAuthenticated, cohortParam, cohortQuery])

  // Fetch cohort trends (only meaningful when cohort is selected)
  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    async function fetchTrends() {
      try {
        setTrendsLoading(true)
        if (!cohortParam) {
          setCohortTrends([])
          return
        }
        const res = await fetch(`/api/trainer/cohort-trends${cohortQuery}`)
        if (!res.ok) throw new Error(`Trends fetch failed (${res.status})`)
        const data: CohortTrendPoint[] = await res.json()
        setCohortTrends(data)
      } catch (err) {
        console.error('[TrainerPage] cohort trends fetch failed:', err)
        setCohortTrends([])
      } finally {
        setTrendsLoading(false)
      }
    }

    fetchTrends()
  }, [authLoading, isAuthenticated, cohortParam, cohortQuery])

  // While auth is resolving, render nothing to avoid flash
  if (authLoading) return null
  if (!isAuthenticated) return null

  return (
    <div className="trainer-shell">
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        {/* Page title */}
        <h1
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: '48px',
            color: 'var(--ink)',
            lineHeight: 1.1,
            marginBottom: '40px',
            letterSpacing: '-0.02em',
          }}
        >
          Trainer Dashboard
        </h1>

        {/* Cohort Trends — full width, shown when cohort selected */}
        {cohortParam && (
          <div style={{ marginBottom: '32px' }}>
            <CohortTrends data={cohortTrends} loading={trendsLoading} />
          </div>
        )}

        {/* KPI Strip — 4-card grid */}
        <div style={{ marginBottom: '32px' }}>
          <KpiStrip data={kpiData} loading={kpiLoading} />
        </div>

        {/* Roster Table */}
        {rosterLoading && (
          <div>
            <p className="trainer-section-label" style={{ marginBottom: '12px' }}>
              roster
            </p>
            <div className="trainer-card" style={{ padding: 0, overflow: 'hidden' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    height: '48px',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-muted)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {rosterError && !rosterLoading && (
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
            <strong>Error:</strong> {rosterError}
          </div>
        )}

        {!rosterLoading && !rosterError && (
          <RosterTable
            associates={associates}
            sparklineData={sparklineLoading ? undefined : sparklineData}
          />
        )}
      </div>
    </div>
  )
}

export default function TrainerPage() {
  return (
    <Suspense fallback={null}>
      <TrainerDashboard />
    </Suspense>
  )
}
