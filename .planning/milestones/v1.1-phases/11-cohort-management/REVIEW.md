# Phase 11: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Scope:** Phase 11 cohort-management (Plans 11-01, 11-02, 11-03)
**Files Reviewed:** 10 source + 3 test + 1 CSS
**Findings Summary:** 0 BLOCKER / 0 HIGH / 4 MEDIUM / 8 LOW / 4 INFO
**Status:** issues_found (none blocking merge)
**Recommendation:** Ship. Address MD-01 before adding more PATCH clients; MD-03 belongs in a future CSRF-hardening phase.

## Summary

Phase 11 is tight, well-tested work. Auth guards are consistently applied on every new route handler, zod validation is present at both create and patch surfaces, and the non-cascading delete uses an explicit `$transaction` as specified in D-06. Tests mock both Prisma and auth cleanly and cover happy paths plus relevant error codes (P2002, P2025, P2003).

No BLOCKER or HIGH severity findings.

---

## Medium Issues

### MD-01: PATCH refine fails to validate endDate < existing startDate
**File:** `src/app/api/cohorts/[id]/route.ts:16-22`

The refine on `UpdateCohortSchema` only validates when `startDate` is present AND `endDate` is truthy. A client sending only `{ endDate }` against a cohort with stored `startDate` bypasses the check.

**Fix:** Fetch existing row pre-update and run cross-field check against merged state, OR add server-side post-merge guard before `prisma.cohort.update`.

### MD-02: DELETE transaction PgBouncer assumption undocumented
**File:** `src/app/api/cohorts/[id]/route.ts:184-190`

`prisma.$transaction(async ...)` (interactive) requires session-scoped connection. Works with Supabase transaction pooler but no timeout set and pooler assumption undocumented.

**Fix:** Add `{ timeout: 10_000 }` and a brief comment. Acceptable for MVP.

### MD-03: AssociateCohortSelect PATCH has no CSRF protection
**File:** `src/app/trainer/[slug]/AssociateCohortSelect.tsx:55-59`

`nlm_session` cookie has no SameSite attribute and no CSRF token. Pre-existing pattern; Phase 11 widens the mutation surface.

**Fix:** Out of Phase 11 scope. Future CSRF-hardening phase — minimum: set `SameSite=Lax` on login cookie.

### MD-04: GET /api/trainer/[slug] assessments cast loses per-entry type safety
**File:** `src/app/api/trainer/[slug]/route.ts:70-84`

`s.assessments as Record<...>` assumes JSON shape. If stored as array/string, `Object.entries` throws or produces bogus output.

**Fix:** Add defensive guard:
```ts
const rawAssessments =
  s.assessments && typeof s.assessments === 'object' && !Array.isArray(s.assessments)
    ? (s.assessments as Record<string, { /*...*/ }>)
    : {};
```

---

## Low Issues

### LO-01: AssociateCohortSelect revert-on-error drops rapid changes
File: `src/app/trainer/[slug]/AssociateCohortSelect.tsx:44-76`
Already mitigated by disabled-on-save. Possible non-issue.

### LO-02: CohortsClient optimistic update masks server drift
File: `src/app/trainer/cohorts/CohortsClient.tsx:194-201`
Trust server `associateCount`: drop the override.

### LO-03: Native window.confirm blocks automation and screen readers
File: `src/app/trainer/cohorts/CohortsClient.tsx:216-219`
Approved by D-11 for MVP; flag for design-pass phase.

### LO-04: `formatDate` treats ISO as local, off-by-one day
File: `src/app/trainer/cohorts/CohortsClient.tsx:38-50`
`new Date('2026-09-01')` parses UTC midnight, local-tz formats → "Aug 31" west of UTC.

**Fix:** Add `timeZone: 'UTC'` to `Intl.DateTimeFormat` options.

### LO-05: Redundant prisma-mock-exposure test
File: `src/app/api/cohorts/[id]/route.test.ts:266-272`
Exists only to silence lint. Remove.

### LO-06: CohortDTO.associateCount typed optional but always populated
File: `src/lib/cohort-types.ts:12`
Change to required.

### LO-07: PATCH /api/cohorts/[id] accepts empty body as 200 no-op
File: `src/app/api/cohorts/[id]/route.ts:120-139`

**Fix:** `.refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })` or 400 short-circuit.

### LO-08: Slug regex allows leading/trailing/double hyphens
File: `src/app/api/trainer/[slug]/route.ts:16`
Pre-existing pattern. Low priority.

---

## Info

- IN-01: Inline styles vs CSS classes mixed — matches existing file conventions; D-18 targets Phase 14.
- IN-02: Semicolon inconsistency between `cohort-types.ts` and `trainer-types.ts`.
- IN-03: 204 DELETE response idiomatic. Good.
- IN-04: `z.coerce.date()` normalizes `"2026-02-30"` to March 2 silently.

---

## Test Coverage Assessment

**Good:**
- 401 paths covered on all mutating routes
- Prisma error codes P2002 / P2025 / P2003 covered
- DELETE transaction ordering asserted
- PATCH validation cases cover cohortId edge cases

**Gaps (non-blocking):**
- No test for PATCH with `{}` empty body (LO-07)
- No test for MD-01 (endDate without startDate against existing cohort)
- No test for MD-04 (assessments being non-object JSON)

---

## Files Reviewed

- src/app/api/cohorts/route.ts + .test.ts
- src/app/api/cohorts/[id]/route.ts + .test.ts
- src/app/api/trainer/[slug]/route.ts + .test.ts
- src/app/trainer/[slug]/AssociateCohortSelect.tsx
- src/app/trainer/[slug]/page.tsx
- src/app/trainer/cohorts/CohortsClient.tsx
- src/app/trainer/cohorts/page.tsx
- src/app/trainer/cohorts/cohorts.css
- src/app/trainer/page.tsx
- src/lib/cohort-types.ts
- src/lib/trainer-types.ts
