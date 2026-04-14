import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticatedSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import CurriculumManager from './CurriculumManager'
import '../../cohorts.css'
import '../../../trainer.css'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(d)
  } catch {
    return iso
  }
}

export default async function CurriculumPage({ params }: Props) {
  const authed = await isAuthenticatedSession()
  if (!authed) {
    redirect('/login')
  }

  const { id } = await params
  const cohortId = parseInt(id, 10)
  if (!Number.isInteger(cohortId) || cohortId <= 0) {
    notFound()
  }

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { id: true, name: true, startDate: true, endDate: true, description: true },
  })

  if (!cohort) {
    notFound()
  }

  const dateRange = [
    formatDate(cohort.startDate.toISOString()),
    cohort.endDate ? formatDate(cohort.endDate.toISOString()) : 'ongoing',
  ].join(' – ')

  return (
    <div className="trainer-shell" style={{ padding: '40px 32px', maxWidth: '1120px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav
        style={{
          fontSize: '13px',
          fontFamily: "'DM Sans', sans-serif",
          color: '#7A7267',
          marginBottom: '24px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <Link href="/trainer" style={{ color: '#7A7267', textDecoration: 'none' }}>
          Trainer
        </Link>
        <span>›</span>
        <Link href="/trainer/cohorts" style={{ color: '#7A7267', textDecoration: 'none' }}>
          Cohorts
        </Link>
        <span>›</span>
        <span style={{ color: '#1A1A1A' }}>{cohort.name}</span>
        <span>›</span>
        <span style={{ color: '#1A1A1A' }}>Curriculum</span>
      </nav>

      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          className="cohorts-title"
          style={{ marginBottom: '8px' }}
        >
          {cohort.name} — Curriculum
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            color: '#7A7267',
            margin: 0,
          }}
        >
          {dateRange}
          {cohort.description ? ` · ${cohort.description}` : ''}
        </p>
      </div>

      {/* Section label */}
      <p className="trainer-section-label" style={{ marginBottom: '12px' }}>
        curriculum weeks
      </p>

      {/* Client component handles table + add form + state */}
      <CurriculumManager cohortId={cohortId} />
    </div>
  )
}
