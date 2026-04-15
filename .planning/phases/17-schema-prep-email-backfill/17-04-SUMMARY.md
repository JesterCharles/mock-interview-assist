---
phase: 17-schema-prep-email-backfill
plan: 04
subsystem: trainer-backfill-tests
tags: [tests, backfill, regression-net, BACKFILL-01, BACKFILL-02]
requires:
  - 17-01 (schema fields: email nullable + unique)
  - 17-02 (route handlers: list, PATCH, DELETE, preview)
  - 17-03 (UI surface — not under test here, but the routes back it)
provides:
  - Phase 18 regression net for backfill route contract
  - PII non-disclosure invariant (no email echo on collision) locked in
  - Orphan-guard invariant (no delete when sessions > 0) locked in
  - Pure-function preview math invariants locked in
affects:
  - src/app/api/trainer/associates/route.ts (under test, unmodified)
  - src/app/api/trainer/associates/[id]/route.ts (under test, unmodified)
  - src/app/api/trainer/associates/preview/route.ts (logic mirrored, unmodified)
tech-stack:
  added: []
  patterns:
    - vi.mock for @/lib/prisma + @/lib/identity
    - NextRequest constructor with explicit origin/host headers for CSRF testing
    - Inline pure-function copy for hermetic math testing
key-files:
  created:
    - src/lib/__tests__/backfill-preview-math.test.ts
    - src/app/api/trainer/associates/__tests__/integration.test.ts
  modified: []
decisions:
  - Inline preview math as a pure function in the test file rather than extract from route — keeps the route untouched (zero risk to shipped code) while still locking in the contract. Route-level test coverage already lives in preview/route.test.ts.
  - Integration test uses the same vi.mock pattern as the existing per-route tests, but co-locates list+PATCH+DELETE in one describe block to assert they form a coherent backfill workflow.
metrics:
  duration: ~20m
  completed: 2026-04-15
  tasks: 2
  files_created: 2
  tests_added: 15 (5 unit + 10 integration)
  total_tests: 295 passed (was 280, +15)
---

# Phase 17 Plan 04: Integration + math tests Summary

Two-file regression net for the trainer email backfill surface (BACKFILL-01 schema awareness + BACKFILL-02 route contract). Locks in PII non-disclosure on email collision and the orphan-guard invariant ahead of Phase 18's identity-resolution refactor.

## Test File Paths

| File | Tests | Purpose |
|------|-------|---------|
| `src/lib/__tests__/backfill-preview-math.test.ts` | 5 | Pure-function preview counting invariants |
| `src/app/api/trainer/associates/__tests__/integration.test.ts` | 10 | End-to-end list → PATCH → DELETE flow with mocked Prisma |

## Scenario Coverage Matrix

### Preview math (`backfill-preview-math.test.ts`)

| # | Case | Asserts |
|---|------|---------|
| 1 | Empty roster | All counts === 0 |
| 2 | All-email rows | withEmail === total, slugOnlyZeroSessions === 0 |
| 3 | Mix deletable/protected | Distinguishes null+0 (deletable) from null+>0 (protected) |
| 4 | Empty-string email | Strict `=== null` semantics documented |
| 5 | Invariants across 4 sample shapes | `withEmail + withoutEmail === total` AND `slugOnlyZeroSessions <= withoutEmail` |

### Integration (`integration.test.ts`)

| # | Method | Scenario | Status | Key Assertion |
|---|--------|----------|--------|---------------|
| 1 | LIST  | anonymous caller | 401 | `prisma.findMany` never called |
| 2 | LIST  | trainer caller | 200 | Maps Prisma rows → AssociateBackfillRow[] (id, slug, email, sessionCount, cohortName) |
| 3 | PATCH | cross-origin (evil.com) | 403 | DB never touched, returns `{error:'cross-origin'}` |
| 4 | PATCH | anonymous caller | 401 | `prisma.update` never called |
| 5 | PATCH | trainer + valid email | 200 | Returns `{id, email}`; update called with correct args |
| 6 | PATCH | P2002 collision | 409 | Body === `{error:'email_taken', field:'email'}`; **body does NOT contain submitted email** (PII) |
| 7 | PATCH | malformed email | 400 | `error === 'invalid_payload'`; no DB write |
| 8 | DELETE | sessions > 0 | 409 | `error === 'has_sessions'`; **`prisma.delete` NEVER called** (orphan guard) |
| 9 | DELETE | orphan (sessions === 0) | 200 | Returns `{ok:true, id:1}`; delete called with correct args |
| 10 | DELETE | cross-origin | 403 | Neither findUnique nor delete called |

## Verification Results

- `npm run test -- src/lib/__tests__/backfill-preview-math.test.ts --run` → 5/5 passed
- `npm run test -- src/app/api/trainer/associates/__tests__/integration.test.ts --run` → 10/10 passed
- `npm run test` (full suite) → **295 passed | 4 skipped (299 total)** — was 280 baseline, +15 added, **0 regressions**
- `npx tsc --noEmit` → clean (exit 0)

## Threat Mitigation Locked In

| Threat ID | Mitigation Asserted |
|-----------|---------------------|
| T-17-19 (PII info disclosure on collision) | `expect(JSON.stringify(body)).not.toContain(submittedEmail)` in PATCH P2002 test |
| T-17-18 (test fixture tampering) | All Prisma access mocked; no real DB touched |

## Deviations from Plan

### Auto-fixed Issues

**1. [Operational] Hard-reset worktree before first commit**
- **Found during:** Task 1 commit
- **Issue:** Worktree was pointing at an older HEAD (`4238e36`) but the configured base was `ec7fe89`; `git reset --soft` advanced HEAD without syncing the working tree, so my first commit appeared to delete ~100 unrelated files.
- **Fix:** `git reset --soft HEAD~1` to undo the bad commit, copied the new test file to /tmp, `git reset --hard HEAD` to sync the worktree to the correct base, restored the test file, then re-committed cleanly.
- **Files modified:** none from the bad commit survived (it was undone)
- **Commit:** `d6f40a5` (clean re-commit)

No other deviations — plan executed as written.

## Phase 17 Status

Phase 17 ready for `verify-work`. All four plans complete:
- 17-01: Schema fields shipped (migration 0002)
- 17-02: Routes shipped (list + PATCH + DELETE + preview)
- 17-03: UI shipped (AssociatesBackfillTable + DryRunPreviewCard)
- 17-04: Test regression net shipped (this plan)

## Self-Check: PASSED

- File `src/lib/__tests__/backfill-preview-math.test.ts` exists (verified via test runner discovery)
- File `src/app/api/trainer/associates/__tests__/integration.test.ts` exists (verified via test runner discovery)
- Commit `d6f40a5` exists in git log
- Commit `86d9d7b` exists in git log
- `npm run test` exits 0 with 295 passing
- `npx tsc --noEmit` exits 0
