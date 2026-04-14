'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { RosterAssociate } from '@/lib/trainer-types'
import RosterTable from '@/components/trainer/RosterTable'
import './trainer.css'

export default function TrainerPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [associates, setAssociates] = useState<RosterAssociate[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auth guard — matching existing /dashboard pattern exactly (D-06, T-06-02)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch roster data after auth confirmed
  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    async function fetchRoster() {
      try {
        setDataLoading(true)
        setError(null)
        const res = await fetch('/api/trainer')
        if (!res.ok) {
          throw new Error(`Failed to load roster (${res.status})`)
        }
        const data: RosterAssociate[] = await res.json()
        setAssociates(data)
      } catch (err) {
        console.error('[TrainerPage] fetch failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to load roster')
      } finally {
        setDataLoading(false)
      }
    }

    fetchRoster()
  }, [authLoading, isAuthenticated])

  // While auth is resolving, render nothing to avoid flash
  if (authLoading) {
    return null
  }

  // After auth resolves, if not authenticated let the redirect above take effect
  if (!isAuthenticated) {
    return null
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
        {/* Sub-nav — links to sibling trainer views (D-12) */}
        <nav
          aria-label="Trainer sections"
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
          }}
        >
          <span
            aria-current="page"
            style={{
              color: '#1A1A1A',
              backgroundColor: '#F0EBE2',
              padding: '6px 10px',
              borderRadius: '6px',
            }}
          >
            Dashboard
          </span>
          <Link
            href="/trainer/cohorts"
            style={{
              color: '#7A7267',
              textDecoration: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
            }}
          >
            Cohorts
          </Link>
        </nav>

        {/* Page title — 48px Clash Display 600 per DESIGN.md Typography */}
        <h1
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: '48px',
            color: '#1A1A1A',
            lineHeight: 1.1,
            marginBottom: '40px',
            letterSpacing: '-0.02em',
          }}
        >
          Trainer Dashboard
        </h1>

        {dataLoading && (
          <div>
            {/* Skeleton rows */}
            <p className="trainer-section-label" style={{ marginBottom: '12px' }}>
              roster
            </p>
            <div className="trainer-card" style={{ padding: 0, overflow: 'hidden' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    height: '44px',
                    borderBottom: '1px solid #E8E2D9',
                    backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F0EBE2',
                  }}
                />
              ))}
            </div>
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

        {!dataLoading && !error && (
          <RosterTable associates={associates} />
        )}
      </div>
    </div>
  )
}
