import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticatedSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import CurriculumManager from './CurriculumManager'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

function formatDate(d: Date | null): string {
  if (!d) return 'ongoing'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
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

  const dateRange = `${formatDate(cohort.startDate)} – ${formatDate(cohort.endDate)}`

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            marginBottom: '24px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <Link
            href="/trainer"
            style={{ color: 'var(--muted)', textDecoration: 'none' }}
          >
            Trainer
          </Link>
          <span aria-hidden>›</span>
          <Link
            href="/trainer/cohorts"
            style={{ color: 'var(--muted)', textDecoration: 'none' }}
          >
            Cohorts
          </Link>
          <span aria-hidden>›</span>
          <Link
            href={`/trainer/cohorts/${cohort.id}`}
            style={{ color: 'var(--muted)', textDecoration: 'none' }}
          >
            {cohort.name}
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: 'var(--ink)' }}>Curriculum</span>
        </nav>

        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: "var(--font-display), 'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: '48px',
              color: 'var(--ink)',
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Curriculum — {cohort.name}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '14px',
              color: 'var(--muted)',
              margin: '8px 0 0 0',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {dateRange}
            {cohort.description ? ` · ${cohort.description}` : ''}
          </p>
        </div>

        {/* Client manager: list + add form */}
        <CurriculumManager cohortId={cohortId} />
      </div>
    </div>
  )
}
