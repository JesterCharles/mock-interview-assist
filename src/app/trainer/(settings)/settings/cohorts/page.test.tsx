import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Behavioral tests for the /trainer/settings/cohorts server component shell.
 *
 * Covers the auth + server-seed truths from Plan 11-02 that currently
 * only have manual-checkpoint coverage:
 *  - Unauthenticated trainer is redirected to /login
 *  - Authenticated trainer: prisma.cohort.findMany is ordered by startDate desc
 *    and includes associate count
 *  - Server serializes rows into CohortDTO[] with ISO strings and
 *    nullable endDate before handing off to the client component
 */

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  redirectMock: vi.fn((_url: string) => {
    throw new Error('NEXT_REDIRECT')
  }),
  getCallerIdentityMock: vi.fn(),
  findManyMock: vi.fn(),
  cohortsClientMock: vi.fn((_props: unknown) => null),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirectMock,
}))

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: mocks.getCallerIdentityMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cohort: {
      findMany: mocks.findManyMock,
    },
  },
}))

vi.mock('./CohortsClient', () => {
  const Component = (props: unknown) => {
    mocks.cohortsClientMock(props)
    return null
  }
  return { default: Component }
})

import CohortsPage from './page'

describe('/trainer/settings/cohorts server page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated requests to /signin', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'anonymous' })

    await expect(CohortsPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.redirectMock).toHaveBeenCalledWith('/signin')
    expect(mocks.findManyMock).not.toHaveBeenCalled()
  })

  it('fetches cohorts ordered by startDate desc with associate count for authenticated trainer', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    mocks.findManyMock.mockResolvedValue([])

    await CohortsPage()

    expect(mocks.findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startDate: 'desc' },
        include: expect.objectContaining({
          _count: { select: { associates: true } },
        }),
      }),
    )
  })

  it('serializes Cohort rows with readiness counts (ISO strings, nullable endDate) for client', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    mocks.findManyMock.mockResolvedValue([
      {
        id: 2,
        name: 'Summer 2026',
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-09-01T00:00:00.000Z'),
        description: 'Summer cohort',
        _count: { associates: 4 },
        associates: [
          { readinessStatus: 'ready' },
          { readinessStatus: 'ready' },
          { readinessStatus: 'improving' },
          { readinessStatus: 'not_ready' },
        ],
      },
      {
        id: 1,
        name: 'Rolling',
        startDate: new Date('2026-03-01T00:00:00.000Z'),
        endDate: null,
        description: null,
        _count: { associates: 0 },
        associates: [],
      },
    ])

    const element = (await CohortsPage()) as {
      props: { initialCohorts: unknown[] }
    }

    expect(element.props.initialCohorts).toEqual([
      {
        id: 2,
        name: 'Summer 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-09-01T00:00:00.000Z',
        description: 'Summer cohort',
        associateCount: 4,
        readyCount: 2,
        improvingCount: 1,
        notReadyCount: 1,
      },
      {
        id: 1,
        name: 'Rolling',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: null,
        description: null,
        associateCount: 0,
        readyCount: 0,
        improvingCount: 0,
        notReadyCount: 0,
      },
    ])
  })
})
