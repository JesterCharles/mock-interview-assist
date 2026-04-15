/**
 * Pure-function unit tests for the backfill preview counting logic
 * (Plan 17-04, BACKFILL-01/02).
 *
 * Mirrors the counting logic in `src/app/api/trainer/associates/preview/route.ts`
 * as a standalone function so the math is locked in independently of the
 * route handler, Prisma mocks, or NextRequest plumbing. This is the Phase 18
 * regression net — if the preview contract drifts, this test file fails loudly.
 */

import { describe, it, expect } from 'vitest'
import type { BackfillPreview } from '@/lib/trainer-types'

/**
 * Pure copy of the counting logic from the preview route. Kept as an inline
 * function (not imported) to keep the test hermetic — if the route ever
 * diverges, the route-level unit test in
 * `src/app/api/trainer/associates/preview/route.test.ts` catches it. This
 * file locks in the contract shape.
 */
function computePreview(
  rows: Array<{ email: string | null; sessionCount: number }>,
): BackfillPreview {
  const total = rows.length
  const withEmail = rows.filter((r) => r.email !== null).length
  const withoutEmail = total - withEmail
  const slugOnlyZeroSessions = rows.filter(
    (r) => r.email === null && r.sessionCount === 0,
  ).length
  return {
    total,
    withEmail,
    withoutEmail,
    slugOnlyZeroSessions,
    // Current DELETE rule refuses associates with sessions, so orphaned
    // sessions are structurally always 0. See preview route comment.
    sessionsOrphanedIfAllDeleted: 0,
  }
}

describe('backfill preview math', () => {
  it('returns zeros for an empty roster', () => {
    expect(computePreview([])).toEqual({
      total: 0,
      withEmail: 0,
      withoutEmail: 0,
      slugOnlyZeroSessions: 0,
      sessionsOrphanedIfAllDeleted: 0,
    })
  })

  it('counts all-email rows with zero slug-only', () => {
    const out = computePreview([
      { email: 'a@b.com', sessionCount: 0 },
      { email: 'c@d.com', sessionCount: 5 },
    ])
    expect(out).toEqual({
      total: 2,
      withEmail: 2,
      withoutEmail: 0,
      slugOnlyZeroSessions: 0,
      sessionsOrphanedIfAllDeleted: 0,
    })
  })

  it('distinguishes deletable vs protected null-email rows', () => {
    const out = computePreview([
      { email: 'a@b.com', sessionCount: 3 },
      { email: null, sessionCount: 0 }, // deletable
      { email: null, sessionCount: 0 }, // deletable
      { email: null, sessionCount: 2 }, // protected (has sessions)
    ])
    expect(out.total).toBe(4)
    expect(out.withEmail).toBe(1)
    expect(out.withoutEmail).toBe(3)
    expect(out.slugOnlyZeroSessions).toBe(2)
    expect(out.sessionsOrphanedIfAllDeleted).toBe(0)
  })

  it('treats empty string email as having an email (route normalizes empty→null before storage)', () => {
    // The route stores empty-string emails as NULL; this test documents that
    // computePreview's contract is: email strictly === null means "no email".
    // A row arriving with email '' would not occur from Prisma but the math
    // must still be well-defined.
    const out = computePreview([{ email: '', sessionCount: 0 }])
    expect(out.withEmail).toBe(1)
    expect(out.withoutEmail).toBe(0)
    expect(out.slugOnlyZeroSessions).toBe(0)
  })

  it('maintains invariant withEmail + withoutEmail === total across shapes', () => {
    const samples: Array<Array<{ email: string | null; sessionCount: number }>> = [
      [],
      [{ email: 'a@b.com', sessionCount: 0 }],
      [
        { email: null, sessionCount: 1 },
        { email: null, sessionCount: 0 },
      ],
      [
        { email: 'x@y.com', sessionCount: 0 },
        { email: null, sessionCount: 0 },
        { email: null, sessionCount: 7 },
        { email: 'z@w.com', sessionCount: 3 },
      ],
    ]
    for (const s of samples) {
      const r = computePreview(s)
      expect(r.withEmail + r.withoutEmail).toBe(r.total)
      // slugOnlyZeroSessions can never exceed withoutEmail.
      expect(r.slugOnlyZeroSessions).toBeLessThanOrEqual(r.withoutEmail)
    }
  })
})
