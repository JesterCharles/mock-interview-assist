---
phase: 19-bulk-invite
plan: "03"
subsystem: invite-api
tags: [bulk-invite, magic-link, rate-limiting, tdd, auth]
dependency_graph:
  requires: [19-01, 19-02, phase-18]
  provides: [INVITE-03, bulk-invite-endpoint, invite-helper, dashboard-stub]
  affects: [associate-auth-flow, trainer-dashboard, exchange-route]
tech_stack:
  added: []
  patterns: [shared-helper-extraction, sequential-processing, pre-flight-rate-limit, tdd-red-green]
key_files:
  created:
    - src/lib/inviteHelper.ts
    - src/lib/inviteHelper.test.ts
    - src/app/api/trainer/invites/bulk/route.ts
    - src/app/api/trainer/invites/bulk/route.test.ts
    - src/app/associate/[slug]/dashboard/page.tsx
  modified:
    - src/app/api/auth/exchange/route.ts
    - src/app/api/trainer/associates/[id]/invite/route.ts
    - src/app/api/auth/exchange/route.test.ts
decisions:
  - "inviteHelper uses findUnique-then-create pattern instead of upsert to enable same-cohort skip detection before any DB write"
  - "Daily limit scoped by caller.email stored in AuthEvent.ip field — matches single-invite route pattern"
  - "Dashboard stub redirects to /associate/[slug] — Phase 23 replaces with real dashboard"
  - "Resend instance created at module load time; tests use vi.hoisted to make mockEmailSendFn available inside vi.mock factory"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-16"
  tasks_completed: 3
  files_created: 5
  files_modified: 3
  tests_added: 33
---

# Phase 19 Plan 03: Bulk Invite API + Shared Helper Summary

**One-liner:** Shared `inviteAssociate` helper (upsert→throttle→generateLink→Resend→recordAuthEvent) extracted from single-invite route; bulk `/api/trainer/invites/bulk` endpoint with 20/day pre-flight, 50/call Zod cap, and per-email partial-failure isolation; dashboard stub shim + exchange route redirect updated for SC 6.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Dashboard stub + exchange redirect | ffa4fb9 | dashboard/page.tsx, exchange/route.ts |
| 2 | Extract inviteAssociate helper + refactor single-invite | 8d67bf8 | inviteHelper.ts, inviteHelper.test.ts, [id]/invite/route.ts |
| 3 | Bulk invite API + integration tests | 8f779a5 | bulk/route.ts, bulk/route.test.ts |
| fix | Update exchange route tests (Rule 1) | 1a99173 | exchange/route.test.ts |

## Decisions Made

- `findUnique` before create/update (not `upsert`) — needed to detect same-cohort skip before any mutation
- Daily limit keyed on `caller.email` stored in `AuthEvent.ip` — consistent with single-invite pattern
- Dashboard stub uses Next.js `redirect()` from `next/navigation` — zero runtime overhead, forwards to existing profile page
- `vi.hoisted()` required for Resend class mock — vi.mock factories execute before module-level `const` assignments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Exchange route test expectations broken by redirect change**
- **Found during:** Post-task full test run
- **Issue:** 4 tests in `exchange/route.test.ts` expected `/associate/{slug}` but Task 1 changed redirect to `/associate/{slug}/dashboard`
- **Fix:** Updated 4 `expect(getRedirectPath(res)).toBe(...)` assertions to include `/dashboard`
- **Files modified:** `src/app/api/auth/exchange/route.test.ts`
- **Commit:** 1a99173

## Test Coverage

- `src/lib/inviteHelper.test.ts` — 15 tests (generateSlug: 3, inviteAssociate: 12 — all branches)
- `src/app/api/trainer/invites/bulk/route.test.ts` — 18 tests (auth: 3, validation: 6, cohort: 1, rate-limit: 3, processing: 5)
- Total added: 33 tests

## Known Stubs

- `src/app/associate/[slug]/dashboard/page.tsx` — intentional forward-compat shim; redirects to `/associate/[slug]` until Phase 23 replaces with real dashboard content

## Threat Surface Scan

All mitigations from the plan's threat register were implemented:
- T-19-01: `getCallerIdentity()` → 401 for non-trainer ✓
- T-19-02: 20/day pre-flight via `prisma.authEvent.count` + 50/call Zod max ✓
- T-19-03: `lastInvitedAt` 5-min throttle in inviteHelper ✓
- T-19-04: `z.number().int().positive()` on cohortId ✓

## Self-Check: PASSED

All 5 created files found on disk. All 4 task commits verified in git log.
