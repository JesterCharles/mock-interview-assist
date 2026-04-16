import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'

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

export default async function CohortDetailPage({ params }: Props) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    redirect('/signin')
  }

  const { id } = await params
  const cohortId = parseInt(id, 10)
  if (!Number.isInteger(cohortId) || cohortId <= 0) {
    notFound()
  }

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      associates: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          readinessStatus: true,
        },
        orderBy: { displayName: 'asc' },
      },
    },
  })

  if (!cohort) {
    notFound()
  }

  const dateRange = `${formatDate(cohort.startDate)} – ${formatDate(cohort.endDate)}`

  const readyCount = cohort.associates.filter(
    (a) => a.readinessStatus === 'ready',
  ).length
  const improvingCount = cohort.associates.filter(
    (a) => a.readinessStatus === 'improving',
  ).length
  const notReadyCount = cohort.associates.length - readyCount - improvingCount

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
            href="/trainer/settings/cohorts"
            style={{ color: 'var(--muted)', textDecoration: 'none' }}
          >
            Cohorts
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: 'var(--ink)' }}>{cohort.name}</span>
        </nav>

        {/* Page title — 48px Clash Display */}
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
          {cohort.name}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '18px',
            color: 'var(--muted)',
            margin: '8px 0 0 0',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {dateRange}
        </p>
        {cohort.description && (
          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '16px',
              color: 'var(--ink)',
              margin: '16px 0 0 0',
              lineHeight: 1.5,
            }}
          >
            {cohort.description}
          </p>
        )}

        {/* Stats strip */}
        <div
          style={{
            marginTop: '32px',
            padding: '20px 24px',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            display: 'flex',
            gap: '48px',
            flexWrap: 'wrap',
          }}
        >
          <Stat value={cohort.associates.length} label="Associates" />
          <Stat value={readyCount} label="Ready" color="var(--success)" />
          <Stat
            value={improvingCount}
            label="Improving"
            color="var(--accent)"
          />
          <Stat
            value={notReadyCount}
            label="Not Ready"
            color="var(--danger)"
          />
        </div>

        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <Link
            href={`/trainer/settings/cohorts/${cohort.id}/curriculum`}
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: '14px',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            Manage curriculum →
          </Link>
        </div>

        {/* Associate list */}
        <section style={{ marginTop: '40px' }}>
          <h2
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontWeight: 500,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              margin: '0 0 12px 0',
            }}
          >
            Associates
          </h2>
          {cohort.associates.length === 0 ? (
            <div
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                border: '1px dashed var(--border)',
                borderRadius: '12px',
                color: 'var(--muted)',
                fontSize: '14px',
              }}
            >
              No associates assigned to this cohort yet.
            </div>
          ) : (
            <ul
              role="list"
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {cohort.associates.map((a) => (
                <li
                  key={a.id}
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <Link
                    href={`/trainer/${a.slug}`}
                    style={{
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: 500,
                    }}
                  >
                    {a.displayName || a.slug}
                  </Link>
                  <span
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                      fontWeight: 500,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color:
                        a.readinessStatus === 'ready'
                          ? 'var(--success)'
                          : a.readinessStatus === 'improving'
                            ? 'var(--accent)'
                            : 'var(--danger)',
                    }}
                  >
                    {a.readinessStatus?.replace('_', ' ') ?? 'unknown'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span
        style={{
          fontFamily: "var(--font-display), 'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: '32px',
          lineHeight: 1,
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily:
            "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontWeight: 500,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: color ?? 'var(--muted)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
