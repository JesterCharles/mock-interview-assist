'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import AssociatesBackfillTable from './AssociatesBackfillTable'
import DryRunPreviewCard from './DryRunPreviewCard'

export default function AssociatesBackfillPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin')
    }
  }, [isLoading, isAuthenticated, router])

  // Match /trainer/[slug] pattern: render nothing while auth resolves
  if (isLoading || !isAuthenticated) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 24px' }}>
        <h1
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontWeight: 600,
            fontSize: 48,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            margin: '0 0 8px 0',
          }}
        >
          Email Backfill
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: 'var(--muted)',
            margin: '0 0 32px 0',
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          Attach an email to each associate before Supabase auth cutover. Slug-only rows with no sessions can be deleted.
        </p>

        <DryRunPreviewCard />
        <div style={{ height: 24 }} />
        <AssociatesBackfillTable />
      </div>
    </div>
  )
}
