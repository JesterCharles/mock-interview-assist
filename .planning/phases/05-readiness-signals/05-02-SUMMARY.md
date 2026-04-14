---
phase: 05-readiness-signals
plan: 02
subsystem: settings-api
tags: [settings, threshold, readiness, api, auth, validation]
dependency_graph:
  requires:
    - "05-01"  # Associate readiness fields + recomputeAllReadiness()
  provides:
    - "Settings model in DB"
    - "getSettings() / updateThreshold() service functions"
    - "GET /api/settings — auth-protected threshold read"
    - "PUT /api/settings — auth-protected threshold update with bulk recompute"
  affects:
    - "src/app/api/history/route.ts — now uses getSettings() instead of (prisma as any) cast"
tech_stack:
  added:
    - "zod 4.3.6 — input validation for PUT body"
  patterns:
    - "Singleton-row pattern: Settings @id @default(1)"
    - "Upsert for idempotent settings writes"
    - "safeParse() over parse() for zod error handling in route"
key_files:
  created:
    - prisma/schema.prisma  # Settings model added
    - src/lib/settingsService.ts
    - src/app/api/settings/route.ts
    - src/app/api/settings/route.test.ts
  modified:
    - src/app/api/history/route.ts  # (prisma as any) cast replaced with getSettings()
    - src/generated/prisma/  # Regenerated with Settings type
decisions:
  - "Singleton-row Settings: @id @default(1) ensures only one row, upsert is safe and idempotent"
  - "safeParse() chosen over parse() so zod errors return 400 without throwing and hitting catch(500)"
  - "PUT accepts NextRequest | Request union type for test compatibility (Request in tests, NextRequest in prod)"
metrics:
  duration: "~12 minutes"
  completed: "2026-04-14T00:36:25Z"
  tasks_completed: 2
  files_changed: 5
  tests_added: 16
  total_tests_passing: 53
---

# Phase 05 Plan 02: Settings Model and Configurable Readiness Threshold Summary

**One-liner:** Singleton Settings Prisma model with auth-protected GET/PUT /api/settings route, zod-validated threshold 0-100, triggering bulk recomputeAllReadiness on change.

## What Was Built

Trainers can now read and update the readiness threshold at runtime via the `/api/settings` API — no code changes or redeployments required. Setting a new threshold immediately recomputes readiness badges for all associates.

### Task 1: Settings model + DB push (commit `9662034`)

Added singleton `Settings` model to `prisma/schema.prisma`:

```prisma
model Settings {
  id                 Int      @id @default(1)
  readinessThreshold Float    @default(75)
  updatedAt          DateTime @updatedAt
}
```

The `@id @default(1)` singleton pattern ensures only one row ever exists. `@default(75)` matches the D-01 baseline. Schema pushed to Supabase and Prisma client regenerated.

### Task 2: settingsService + /api/settings route (commits `3b0a8a9`, `e0eb86b`)

**settingsService.ts:**
- `getSettings()` — returns `{ readinessThreshold }`, defaults to 75 when no row
- `updateThreshold(n)` — upserts Settings row, then calls `recomputeAllReadiness(n)` for all associates

**route.ts (GET + PUT):**
- Both handlers guarded by `isAuthenticatedSession()` — 401 if not authenticated (T-05-04)
- `PUT` validates body with `z.object({ readinessThreshold: z.number().min(0).max(100) })` — 400 on failure (T-05-05)
- `PUT` calls `updateThreshold()` which triggers bulk recompute (T-05-06 — auth guard prevents unauthenticated bulk trigger)

TDD: 16 tests written and confirmed RED before implementation; all 16 pass GREEN. Full suite: 53 tests passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced (prisma as any).settings cast in history route**
- **Found during:** Task 2 (after Settings model was created, the Plan 01 workaround was no longer needed)
- **Issue:** `src/app/api/history/route.ts` used `(prisma as any).settings?.findFirst?.()` as a temporary cast because the Settings model didn't exist yet in Plan 01
- **Fix:** Replaced with `getSettings().catch(() => ({ readinessThreshold: 75 }))` — type-safe, cleaner, consistent with the new service
- **Files modified:** `src/app/api/history/route.ts`
- **Commit:** `6d4d1c0`

## Known Stubs

None. All data flows are wired to real DB reads/writes.

## Threat Flags

No new threat surface introduced beyond what was planned in the threat model.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/lib/settingsService.ts | FOUND |
| src/app/api/settings/route.ts | FOUND |
| src/app/api/settings/route.test.ts | FOUND |
| commit 9662034 (schema) | FOUND |
| commit e0eb86b (implementation) | FOUND |
| commit 6d4d1c0 (history fix) | FOUND |
| 53 tests passing | VERIFIED |
