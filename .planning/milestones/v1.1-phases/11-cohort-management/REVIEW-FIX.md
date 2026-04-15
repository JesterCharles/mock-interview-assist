---
phase: 11
fixed_at: 2026-04-14
review_path: .planning/phases/11-cohort-management/REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-04-14
**Source review:** `.planning/phases/11-cohort-management/REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### MD-01: PATCH refine fails to validate endDate < existing startDate

**Files modified:** `src/app/api/cohorts/[id]/route.ts`, `src/app/api/cohorts/[id]/route.test.ts`
**Commit:** e915720 (combined with LO-07)
**Applied fix:** In PATCH, when `endDate` is present and non-null, fetch existing cohort's `startDate` and compare against merged state (payload `startDate` if provided, else existing). Returns 400 on violation, 404 if cohort missing. Added two tests: (a) endDate-only payload earlier than stored startDate -> 400, (b) endDate-only patch against missing cohort -> 404.

### MD-02: DELETE transaction PgBouncer assumption undocumented

**Files modified:** `src/app/api/cohorts/[id]/route.ts`
**Commit:** 3d1fa0a
**Applied fix:** Added `{ timeout: 10_000 }` as second argument to `prisma.$transaction` and inline comment noting the interactive transaction requires a session-scoped connection (Supabase transaction pooler handles this).

### MD-04: GET /api/trainer/[slug] assessments cast loses per-entry type safety

**Files modified:** `src/app/api/trainer/[slug]/route.ts`
**Commit:** 41ae4c5
**Applied fix:** Replaced bare cast `s.assessments as Record<...>` with a defensive guard: `s.assessments && typeof s.assessments === 'object' && !Array.isArray(s.assessments)`. Non-object JSON shapes (array/string/null) now fall back to `{}`, preventing `Object.entries` from throwing or producing bogus output.

### LO-04: `formatDate` treats ISO as local, off-by-one day

**Files modified:** `src/app/trainer/cohorts/CohortsClient.tsx`
**Commit:** a560072
**Applied fix:** Added `timeZone: 'UTC'` to `Intl.DateTimeFormat` options. Displayed dates now match the `yyyy-mm-dd` input value produced by `toDateInputValue` regardless of the user's local timezone.

### LO-05: Redundant prisma-mock-exposure test

**Files modified:** `src/app/api/cohorts/[id]/route.test.ts`
**Commit:** 1d5652b
**Applied fix:** Removed the `it('exposes top-level prisma mocks for completeness', ...)` test. Also dropped the now-unused `mockDelete` and `mockUpdateMany` handles from the top of the file to avoid lint errors.

### LO-06: CohortDTO.associateCount typed optional but always populated

**Files modified:** `src/lib/cohort-types.ts`
**Commit:** 3da3a63
**Applied fix:** Changed `associateCount?: number` to `associateCount: number`. Verified all producers already populate: server `toDTO` (both list and detail routes) uses `row._count?.associates ?? 0`, and client optimistic updates in `CohortsClient.tsx` (create at line 203, edit at line 198) always set the field explicitly.

### LO-07: PATCH /api/cohorts/[id] accepts empty body as 200 no-op

**Files modified:** `src/app/api/cohorts/[id]/route.ts`, `src/app/api/cohorts/[id]/route.test.ts`
**Commit:** e915720 (combined with MD-01)
**Applied fix:** Added `.refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })` to `UpdateCohortSchema`. Added test for empty-body PATCH -> 400 (no prisma call).

## Skipped Issues

None in this iteration. All findings documented as out-of-scope in the review prompt (MD-03, LO-01, LO-02, LO-03, LO-08, IN-*) were deliberately not attempted per the fix instructions.

## Verification

- `npx tsc --noEmit`: clean for all touched files. One pre-existing error remains at `src/app/trainer/cohorts/page.test.tsx:44` (unrelated to Phase 11 scope; confirmed present on `HEAD~7` before any fix).
- `npm run test -- --run src/app/api/cohorts src/app/api/trainer`: **38 passed / 38 total** across 3 test files.
- Per-commit test runs all passed (cohort tests: 27-28 tests; trainer tests: 11 tests).

## Commit Sequence

```
3da3a63 fix(11-6): LO-06 make CohortDTO.associateCount required
1d5652b fix(11-5): LO-05 remove redundant prisma-mock-exposure test
a560072 fix(11-4): LO-04 force UTC in CohortsClient formatDate
41ae4c5 fix(11-3): MD-04 guard against non-object assessments JSON
3d1fa0a fix(11-2): MD-02 add timeout to DELETE cohort interactive transaction
e915720 fix(11-1): MD-01, LO-07 validate endDate vs merged state, reject empty body
```

All commits used `--no-verify` per instructions.

---

_Fixed: 2026-04-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
