---
phase: 19-bulk-invite
plan: "02"
subsystem: bulk-invite-ui
tags: [bulk-invite, preview-classification, state-machine, tdd, client-component, onboarding]
dependency_graph:
  requires: [19-01, 19-03]
  provides: [INVITE-01, INVITE-02, INVITE-03-client, OnboardingPage, BulkPreviewTable, BulkResultTable, CohortDropdown, bulkInvitePreview]
  affects: [trainer/onboarding]
tech_stack:
  added: []
  patterns: [pure-function-classification, 3-screen-state-machine, tdd-red-green, roster-fetch-preview]
key_files:
  created:
    - src/lib/bulkInvitePreview.ts
    - src/lib/bulkInvitePreview.test.ts
    - src/app/trainer/onboarding/page.tsx
    - src/app/trainer/onboarding/CohortDropdown.tsx
    - src/app/trainer/onboarding/BulkPreviewTable.tsx
    - src/app/trainer/onboarding/BulkResultTable.tsx
  modified:
    - src/app/api/trainer/associates/route.ts
    - src/lib/trainer-types.ts
    - src/app/api/trainer/associates/route.test.ts
decisions:
  - "Roster fetch uses /api/trainer/associates (has email+cohortId) rather than /api/trainer (missing email); lastInvitedAt added to that endpoint for 5-min throttle preview"
  - "classifyEmails excludes duplicates entirely (not shown as skip rows) — consistent with emailParser intent"
  - "recently-invited check runs before reassign check — throttle always wins regardless of cohort change"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-16"
  tasks_completed: 3
  tasks_total: 4
  files_created: 6
  files_modified: 3
  tests_added: 9
---

# Phase 19 Plan 02: Onboarding Page + Preview UI Summary

**One-liner:** Full `/trainer/onboarding` 3-screen state machine (input→preview→results) with pure-function preview classification (new/reassign/skip-same-cohort/skip-recently-invited/skip-invalid), checkable preview table, color-coded result table, and react-hot-toast on completion.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Preview classification logic + unit tests (TDD) | 7db34ec | src/lib/bulkInvitePreview.ts, src/lib/bulkInvitePreview.test.ts |
| 2 | CohortDropdown + BulkPreviewTable + BulkResultTable | b68631d | CohortDropdown.tsx, BulkPreviewTable.tsx, BulkResultTable.tsx |
| 3 | OnboardingPage 3-screen state machine | f5f1ad8 | page.tsx, associates/route.ts, trainer-types.ts, route.test.ts |
| 4 | Human verify (auto-approved) | — | n/a |

## Decisions Made

1. **`/api/trainer/associates` for roster fetch** — This endpoint has `email` + `cohortId` per associate (unlike `/api/trainer` which omits email). Extended it to also return `lastInvitedAt` for the 5-min throttle check.

2. **Duplicates excluded from preview (not shown as skip rows)** — Matches the emailParser intent: duplicate chips are user-facing redundancy already flagged in the chip UI. Including them as preview rows would be confusing.

3. **recently-invited check before reassign check** — If `lastInvitedAt` is within 5 min, the associate gets `skip-recently-invited` even if they'd otherwise be reassigned. Throttle always wins.

4. **`AssociateBackfillRow.lastInvitedAt` field added** — The type and endpoint were extended non-breakingly (nullable field). Existing consumers unaffected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical field] Added `lastInvitedAt` to `/api/trainer/associates` response**
- **Found during:** Task 3 (OnboardingPage wiring)
- **Issue:** `/api/trainer/associates` did not return `lastInvitedAt`, making the 5-min throttle classification branch in `classifyEmails` permanently inactive at runtime
- **Fix:** Added `lastInvitedAt: a.lastInvitedAt?.toISOString() ?? null` to the route handler mapper + `lastInvitedAt: string | null` to `AssociateBackfillRow` type
- **Files modified:** `src/app/api/trainer/associates/route.ts`, `src/lib/trainer-types.ts`
- **Commit:** f5f1ad8

**2. [Rule 1 - Bug] Updated associates route test snapshot to include `lastInvitedAt`**
- **Found during:** Full test suite run after Task 3
- **Issue:** `route.test.ts` expected snapshot lacked `lastInvitedAt`; test failed with "Received +lastInvitedAt: null"
- **Fix:** Added `lastInvitedAt` to mock fixtures and expected snapshot
- **Files modified:** `src/app/api/trainer/associates/route.test.ts`
- **Commit:** f5f1ad8

## Known Stubs

None — all screens are fully wired. The onboarding page fetches live cohort and roster data, calls the real bulk invite endpoint, and displays real results.

## Threat Surface Scan

No new network endpoints introduced. Page fetches from two existing trainer-auth-gated endpoints (`/api/cohorts`, `/api/trainer/associates`) and posts to the bulk invite endpoint built in Plan 03. Per T-19-07 and T-19-08 (both `accept`), server enforces all constraints.

## Self-Check: PASSED

- [x] `src/lib/bulkInvitePreview.ts` exists — contains `export function classifyEmails(`, `export type PreviewAction =`, `export interface PreviewRow`
- [x] `src/lib/bulkInvitePreview.test.ts` exists — 9 tests, all passing
- [x] `src/app/trainer/onboarding/page.tsx` exists — contains `'use client'`, `import { EmailChipInput }`, `import { BulkPreviewTable }`, `import { BulkResultTable }`, `import { CohortDropdown }`, `api/trainer/invites/bulk`, `Bulk Invite`, `Preview Invites`, toast import
- [x] `src/app/trainer/onboarding/CohortDropdown.tsx` exists — contains `Select a cohort`
- [x] `src/app/trainer/onboarding/BulkPreviewTable.tsx` exists — contains `Confirm & Send`, `#E8F5EE`
- [x] `src/app/trainer/onboarding/BulkResultTable.tsx` exists — contains `Invite More`
- [x] Commit 7db34ec exists
- [x] Commit b68631d exists
- [x] Commit f5f1ad8 exists
- [x] `npx tsc --noEmit` passes clean
- [x] `npm run test` — 395 tests pass (1 pre-existing worktree failure unrelated to this plan)
