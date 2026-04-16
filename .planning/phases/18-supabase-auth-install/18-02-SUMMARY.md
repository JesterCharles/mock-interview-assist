---
phase: 18-supabase-auth-install
plan: 02
subsystem: auth-middleware
tags: [supabase, auth, middleware, identity, role-guard]
dependency_graph:
  requires:
    - src/lib/supabase/middleware.ts (createSupabaseMiddlewareClient — from 18-01)
    - src/lib/supabase/server.ts (createSupabaseServerClient — from 18-01)
  provides:
    - src/middleware.ts (Supabase session refresh + role-based route guard)
    - src/lib/identity.ts (Supabase-based CallerIdentity resolver, kind discriminant)
  affects:
    - src/app/api/github/cache/invalidate/route.ts
    - src/app/api/trainer/associates/route.ts
    - src/app/api/trainer/associates/[id]/route.ts
    - src/app/api/trainer/associates/preview/route.ts
tech_stack:
  added: []
  patterns:
    - Middleware calls createSupabaseMiddlewareClient once, returns same mutated response throughout
    - Refresh session cookies forwarded on redirects via response.headers.getSetCookie()
    - getCallerIdentity() uses supabase.auth.getUser() (server-validated, not getSession())
    - Role from user_metadata.role; associate linkage via Associate.authUserId FK lookup
    - Admin role subsumes trainer for all trainer-gated routes
key_files:
  created: []
  modified:
    - src/middleware.ts
    - src/lib/identity.ts
    - src/lib/identity.test.ts
    - src/middleware.test.ts
    - src/app/api/github/cache/invalidate/route.ts
    - src/app/api/trainer/associates/route.ts
    - src/app/api/trainer/associates/[id]/route.ts
    - src/app/api/trainer/associates/preview/route.ts
    - src/app/api/trainer/associates/route.test.ts
    - src/app/api/trainer/associates/[id]/route.test.ts
    - src/app/api/trainer/associates/__tests__/integration.test.ts
    - src/app/api/trainer/associates/preview/route.test.ts
    - src/app/api/github/cache/invalidate/route.test.ts
decisions:
  - "getCallerIdentity() no longer takes NextRequest — reads cookies via Supabase server client"
  - "kind discriminant replaces type to match new three-role model (admin|trainer|associate|anonymous)"
  - "Admin role accepted alongside trainer on all trainer-gated routes (admin subsumes trainer)"
  - "Middleware bounces to /signin?next= (not /login) for all unauthorized access"
  - "Associate paths gate on any authenticated user (user truthy), not role check"
  - "middleware.test.ts fully rewritten to mock createSupabaseMiddlewareClient"
  - "Prisma authUserId TS errors are pre-existing (Phase 17 migration not applied to local Prisma client)"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-16T02:07:00Z"
  tasks_completed: 2
  tests_added: 19
  files_created: 0
  files_modified: 13
---

# Phase 18 Plan 02: Middleware Cutover + Identity Rewrite Summary

**One-liner:** Rewrote middleware to call `createSupabaseMiddlewareClient` before every route guard and replaced `getCallerIdentity` to read Supabase JWT session as the sole identity source with `kind` discriminant and three-role model.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Rewrite middleware with Supabase session refresh + role guard | `8d2b84b` | src/middleware.ts |
| 2 | Rewrite getCallerIdentity + update all callers + tests | `bbffe56` | src/lib/identity.ts, identity.test.ts, middleware.test.ts, 4 route files, 5 test files |

## Verification

- `npm run test -- --run` — 315 passed, 4 skipped (33 files)
- `grep -r 'getCallerIdentity(request' src/` — zero matches (all callers updated)
- `grep -rn '\.type.*trainer\|\.type.*associate' src/lib/identity*` — zero matches
- `npx tsc --noEmit` — only pre-existing Prisma `email`/`authUserId` field errors (Phase 17 migration not applied to local generated client)

## Decisions Made

1. **kind over type** — discriminant renamed to `kind` to match the new three-role shape; avoids collision with TypeScript's built-in `type` keyword in some contexts.
2. **Admin subsumes trainer** — all trainer-gated routes accept `kind === 'admin' || kind === 'trainer'`; no separate admin-only surface yet (Phase 21+).
3. **Bounce to /signin** — middleware redirects to `/signin?next=` for all unauthorized access; `/login` is legacy and Phase 20 will remove it.
4. **Associate path gate** — any authenticated user (user truthy) passes associate paths; role irrelevant. This allows trainers to view `/associate/*` without special-casing.
5. **middleware.test.ts rewrite** — old cookie-based test was completely invalid after the middleware rewrite; replaced with mock of `createSupabaseMiddlewareClient` covering public/trainer/associate path matrix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] middleware.test.ts broken after middleware rewrite**
- **Found during:** Task 2 full test run (11 failures — "URL and Key are required to create a Supabase client")
- **Issue:** Old test called real `createSupabaseMiddlewareClient` via cookie-based fixture; new middleware requires mocked Supabase client
- **Fix:** Fully rewrote `middleware.test.ts` to mock `createSupabaseMiddlewareClient`, covering 13 scenarios (public paths, trainer/admin allow, associate allow, redirect cases)
- **Files modified:** `src/middleware.test.ts`
- **Commit:** `bbffe56`

**2. [Rule 3 - Blocking] node_modules/@supabase missing in worktree**
- **Found during:** Task 1 tsc check
- **Issue:** `@supabase/ssr` and `@supabase/supabase-js` in package.json but not installed
- **Fix:** Ran `npm install` in main repo
- **Files modified:** none (node_modules only)
- **Commit:** n/a

**3. [Rule 3 - Blocking] Worktree on old v1.1 branch**
- **Found during:** Test execution
- **Issue:** Working directory is the git worktree (`worktree-agent-aa7cb581`) which was at v1.1 state; file edits to `/Users/jestercharles/mock-interview-assist/src/...` went to main repo but tests ran from worktree context
- **Fix:** `git reset --hard main` to align worktree with main HEAD; all subsequent edits targeted worktree paths; final commits cherry-picked to main
- **Commits:** `6d54b30` (worktree), cherry-picked as `bbffe56` (main)

## Known Stubs

None — all identity resolution paths are fully implemented. The `authUserId` Prisma lookup will resolve correctly once the Phase 17 migration is applied in production.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-18-04 mitigated | src/middleware.ts | Middleware calls getUser() (server-validated) — disposition applied |
| threat_flag: T-18-05 mitigated | src/middleware.ts | Returns same mutated response, forwards cookies on redirects — disposition applied |
| threat_flag: T-18-06 mitigated | src/lib/identity.ts | Role read from Supabase-signed JWT user_metadata — disposition applied |
| threat_flag: T-18-07 mitigated | src/lib/identity.ts | Associate with no authUserId match returns anonymous — disposition applied |
| threat_flag: T-18-08 mitigated | Route handler callers | Admin accepted alongside trainer on all trainer-gated routes — disposition applied |

## Deferred Items

- `src/app/api/trainer/associates/[id]/route.ts`, `preview/route.ts`, `route.ts` — TypeScript errors on `email` and `authUserId` fields because Prisma generated client in this environment predates the Phase 17 migration. Will resolve automatically when `prisma generate` runs after `prisma migrate deploy` in production/CI.

## Self-Check: PASSED
