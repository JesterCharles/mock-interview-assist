---
phase: 25-pin-removal-cleanup
plan: "01"
subsystem: auth
tags: [pin-removal, cleanup, supabase-auth, grep-gate]
dependency_graph:
  requires: [phase-18-supabase-auth, phase-20-middleware-cutover]
  provides: [pin-free-codebase, ci-grep-gate]
  affects: [associate-interview-complete, associate-me, associate-logout, auth-server, signin-tabs]
tech_stack:
  added: []
  patterns: [getCallerIdentity-replaces-PIN-auth, grep-gate-CI-test]
key_files:
  created:
    - src/__tests__/pin-removal-gate.test.ts
  modified:
    - src/lib/auth-server.ts
    - src/lib/auth-server.test.ts
    - src/lib/associateService.ts
    - src/lib/identity.ts
    - src/app/api/associate/me/route.ts
    - src/app/api/associate/status/route.ts
    - src/app/api/associate/logout/route.ts
    - src/app/api/associate/interview/complete/route.ts
    - src/app/api/associate/interview/complete/route.test.ts
    - src/app/api/public/interview/complete/route.test.ts
    - src/app/api/public/interview/complete/__integration__/pipeline.integration.test.ts
    - src/app/api/auth/route.ts
    - src/app/trainer/(dashboard)/[slug]/page.tsx
    - vitest.config.ts
    - src/lib/githubManifestCache.ts
  deleted:
    - src/lib/pinService.ts
    - src/lib/pinService.test.ts
    - src/lib/pinAttemptLimiter.ts
    - src/lib/associateSession.ts
    - src/lib/featureFlags.ts
    - src/app/api/associate/pin/generate/route.ts
    - src/app/api/associate/pin/verify/route.ts
    - src/app/api/associate/pin/verify/route.test.ts
    - src/app/associate/login/page.tsx
    - src/app/associate/login/PinEntryForm.tsx
    - src/app/trainer/components/GeneratePinButton.tsx
decisions:
  - Associate auth identity resolved exclusively via getCallerIdentity() (Supabase) — no PIN fallback
  - associate/logout now calls supabase.auth.signOut() instead of clearing associate_session cookie
  - associate/status returns static { enabled: true } — feature flag concept retired
  - POST handler removed from /api/auth (legacy APP_PASSWORD login superseded by Supabase in Phase 18)
  - grep-gate test scoped to src/ excluding src/generated/ and itself
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-16"
  tasks_completed: 3
  files_changed: 27
---

# Phase 25 Plan 01: PIN Auth Removal Summary

**One-liner:** Deleted all PIN auth code (pinService, pinAttemptLimiter, associateSession, featureFlags, 11 files total) and wired dependents to Supabase identity via getCallerIdentity(), with a CI grep-gate that prevents PIN resurrection.

## What Was Built

All PIN auth code deleted and dependent routes/tests migrated to Supabase-based identity:

- **Deleted 11 files:** pinService.ts, pinService.test.ts, pinAttemptLimiter.ts, associateSession.ts, featureFlags.ts, pin/generate route, pin/verify route + test, associate/login page + PinEntryForm, GeneratePinButton
- **auth-server.ts** stripped to `isAuthenticatedSession()` only (~12 lines)
- **associate/me** — `getAssociateIdentity` → `getCallerIdentity`, feature flag guard removed
- **associate/status** — returns static `{ enabled: true }`, no featureFlags import
- **associate/logout** — clears cookie → `supabase.auth.signOut()`
- **associate/interview/complete** — `getAssociateSession` → `getCallerIdentity`, feature flag guard removed
- **trainer/[slug]/page.tsx** — GeneratePinButton import + associateAuthEnabled state/effect removed
- **vitest.config.ts** — `ENABLE_ASSOCIATE_AUTH: 'true'` env entry removed
- **grep-gate test** — Vitest test in `src/__tests__/pin-removal-gate.test.ts` runs grep over src/ for 6 PIN patterns; fails CI if any match is found

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] identity.ts comment contained grep-gate pattern**
- **Found during:** Task 3 (grep-gate test run)
- **Issue:** `src/lib/identity.ts` line 15 had comment `No PIN cookie read. No ENABLE_ASSOCIATE_AUTH check.` — would trip the grep-gate
- **Fix:** Changed comment to `No PIN cookie read. No feature flag check.`
- **Files modified:** src/lib/identity.ts
- **Commit:** 77d171a

**2. [Rule 1 - Bug] associate/interview/complete route.test.ts mocked stale getAssociateSession**
- **Found during:** Task 3 (npm run test after grep-gate creation)
- **Issue:** Test file still imported and mocked `getAssociateSession` from `@/lib/auth-server` — route now uses `getCallerIdentity` from `@/lib/identity`
- **Fix:** Rewrote test to mock `getCallerIdentity`, updated all mock return values to `{ kind: 'associate', ... }` shape
- **Files modified:** src/app/api/associate/interview/complete/route.test.ts
- **Commit:** 77d171a

**3. [Rule 1 - Bug] pipeline.integration.test.ts mocked stale getAssociateSession**
- **Found during:** Task 3 (npx tsc --noEmit)
- **Issue:** Integration test mocked `getAssociateSession` from `@/lib/auth-server` — caused TS2339 type error after auth-server.ts was stripped
- **Fix:** Updated mock to `getCallerIdentity` from `@/lib/identity`, updated all mock return values and variable names
- **Files modified:** src/app/api/public/interview/complete/__integration__/pipeline.integration.test.ts
- **Commit:** 77d171a

**4. [Observation] SignInTabs.tsx already clean**
- Task 2 found SignInTabs had no feature flag references — already cleaned up in Phase 18. No changes needed.

## Verification Results

- `npm run test`: 52 passed, 1 skipped (470 tests pass, 4 skipped)
- `npx tsc --noEmit`: clean
- grep for PIN patterns in src/: zero matches
- grep-gate test: passes

## Known Stubs

None.

## Threat Flags

None. All changes remove attack surface (PIN cookie auth) rather than introducing new surface.

## Self-Check: PASSED

- src/__tests__/pin-removal-gate.test.ts — FOUND
- src/lib/auth-server.ts — FOUND
- src/lib/pinService.ts — DELETED (confirmed)
- src/app/api/associate/pin/ — DELETED (confirmed)
- src/app/associate/login/ — DELETED (confirmed)
- commit 02387b7 — FOUND
- commit 77d171a — FOUND
