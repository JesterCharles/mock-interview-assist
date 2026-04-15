---
phase: 09-associate-pin-auth
plan: 02
subsystem: auth
tags: [middleware, identity-enum, cookie-auth, revocation, pin-auth]

requires:
  - phase: 09-01
    provides: verifyAssociateToken, getAssociateById (pinGeneratedAt)
provides:
  - CallerIdentity discriminated union (trainer | associate | anonymous)
  - getCallerIdentity(request) — cookie-only, middleware-safe
  - isAssociateAuthenticated, getAssociateIdentity, getAssociateSession (DB version-check)
  - Per-identity middleware permission table enforcing strict trainer/associate separation
  - Revocation gate: cookie ver vs Associate.pinGeneratedAt
affects: [09-03-ui, phase-10-associate-interview-complete, /associate/* server components]

tech-stack:
  added: []
  patterns:
    - Cookie-only identity enum returned by pure function — safe for Next.js middleware (Edge runtime)
    - Two-tier auth: syntax gate (middleware, fast) + revocation gate (server components, DB)
    - Trainer-cookie precedence when both cookies present (ambiguity resolver, D-10)
    - Token-version revocation via pinGeneratedAt.toISOString() comparison (no schema additions)

key-files:
  created:
    - src/lib/identity.ts
    - src/lib/identity.test.ts
    - src/lib/auth-server.test.ts
    - src/middleware.test.ts
  modified:
    - src/lib/auth-server.ts
    - src/middleware.ts

key-decisions:
  - Middleware uses getCallerIdentity (cookie-only) — no DB access, Edge-runtime-safe, sub-ms overhead
  - Revocation check lives in auth-server helpers, not middleware — stale cookies pass middleware but fail at guarded surface (D-09a)
  - isAuthenticatedSession stays trainer-only, NOT broadened (D-13) — prevents Pitfall 1 (identity conflation)
  - Trainer cookie takes precedence when both present (D-10) — unambiguous identity resolution
  - /associate/* redirects anonymous users to /associate/login (not /login), and preserves next= for post-login return

requirements-completed: [AUTH-03]

duration: ~12min
completed: 2026-04-14
---

# Phase 09 Plan 02: Identity Enum + Middleware Refactor Summary

**Cookie-only identity enumeration for middleware plus DB-backed revocation-aware associate helpers for server components.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files changed:** 6 (2 new lib files, 3 new test files, 2 modified existing)
- **Tests added:** 32 (6 identity + 15 auth-server + 11 middleware)

## Accomplishments
- `getCallerIdentity(NextRequest)` returns discriminated union `{ trainer | associate | anonymous }`, synchronous, no DB
- Trainer-precedence rule tested (D-10): both cookies present → trainer wins
- Three new auth-server helpers (`isAssociateAuthenticated`, `getAssociateIdentity`, `getAssociateSession`) compare cookie `ver` against live `Associate.pinGeneratedAt` — regenerating a PIN immediately invalidates outstanding cookies
- `isAuthenticatedSession()` intentionally unchanged — associate cookies do NOT satisfy trainer gates (D-13, Pitfall 1 guard)
- Middleware rewritten around a small permission table; `/trainer` with only an associate cookie redirects to `/login` (regression test), `/associate/*` gets a separate `/associate/login?next=` redirect
- `config.matcher` extended to `/associate/:path*`
- Stale-ver revocation proof: test mocks Prisma to return a later `pinGeneratedAt` than the cookie's `ver` and asserts `isAssociateAuthenticated() === false`

## Task Commits

1. **Task 1: Identity enum + version-aware auth-server helpers**
   - RED: `0e911e1` (test)
   - GREEN: `03d1611` (feat)
2. **Task 2: Middleware per-identity permission table**
   - RED: `4a532c7` (test)
   - GREEN: `a293a98` (feat)

## Files Created/Modified
- `src/lib/identity.ts` — `CallerIdentity` type + `getCallerIdentity(request)`, cookie-only
- `src/lib/identity.test.ts` — 6 tests (trainer, associate, both, tampered, none, unknown trainer value)
- `src/lib/auth-server.ts` — extended with `isAssociateAuthenticated`, `getAssociateIdentity`, `getAssociateSession`; `isAuthenticatedSession` unchanged
- `src/lib/auth-server.test.ts` — 15 tests covering all new helpers including stale-ver revocation
- `src/middleware.ts` — rewritten to use identity enum + permission table
- `src/middleware.test.ts` — 11 tests covering full permission matrix

## Decisions Made
- Pure-function identity resolution (no async, no DB) — keeps middleware deterministic and Edge-compatible
- Middleware does not call helpers from `auth-server.ts` (those await `cookies()` from `next/headers`, a server-component API incompatible with middleware Edge runtime). Middleware reads cookies directly off `NextRequest`.
- `server-only` import in `associateService.ts` is stubbed via `vi.mock('server-only', () => ({}))` in the auth-server test file so vitest's node env can resolve the module chain
- Version-check (ver vs pinGeneratedAt) uses strict ISO-string equality — symmetric with `signAssociateToken`'s ver derivation; Date object identity is never compared

## Deviations from Plan

None - plan executed exactly as written.

Minor implementation note: the plan's example code used a `TRAINER_PATHS`/`ASSOCIATE_PATHS` array pair; I collapsed the associate side to a single string constant (`ASSOCIATE_PATH = '/associate'`) since there is only one prefix. Functionally identical, marginally simpler.

## Issues Encountered
- Initial auth-server test run failed on `Cannot find package 'server-only'` because vitest's node env cannot resolve Next.js's `server-only` marker. Fixed with `vi.mock('server-only', () => ({}))` — same pattern used in existing `verify/route.test.ts` lineage.
- Pre-existing `.next/dev/types/app/api/health/route.ts` TS error from Next.js internal types is unrelated to this plan and was flagged in 09-01 summary too — left untouched per scope-boundary rule.
- Pre-existing ESLint error in `src/lib/auth-context.tsx` (setState-in-effect) is unrelated and out of scope.

## Verification
- `npm run test -- src/lib/identity.test.ts src/lib/auth-server.test.ts src/middleware.test.ts` → 32/32 pass
- `npm run test` (full suite) → 109/109 pass
- `npx tsc --noEmit` → clean for this plan's files (only pre-existing .next/ types error remains)
- Stale-ver regression test PASSES — proves D-09a revocation gate works end-to-end (token signed with old pinGeneratedAt rejected after DB pinGeneratedAt advances)

## Success Criteria
1. `getCallerIdentity` enumerates all three identity types correctly (cookie-only, no DB) — PASS (6 tests)
2. Middleware never silently passes trainer routes for associate cookies — PASS (regression test in middleware.test.ts)
3. `/associate/*` accepts either trainer or associate at middleware, ver enforced downstream — PASS
4. `isAuthenticatedSession()` remains trainer-only — PASS (explicit test with associate_session → false)
5. `isAssociateAuthenticated` / `getAssociateIdentity` / `getAssociateSession` enforce ver-vs-pinGeneratedAt — PASS (stale-ver tests across all three)
6. All tests pass including stale-ver regression — PASS

## Next Phase Readiness
- **Plan 09-03 (trainer UI + associate PIN login UI):** Can call new endpoints and rely on middleware to route `/associate/login` as public, `/associate/<slug>` as cookie-gated
- **Phase 10 (associate interview completion):** Will consume `getAssociateSession()` in `/api/associate/interview/complete` to resolve `{ associateId, slug }` with revocation enforcement
- **Wave 2 contract locked:**
  - `getCallerIdentity(request): CallerIdentity`
  - `isAssociateAuthenticated(): Promise<boolean>`
  - `getAssociateIdentity(): Promise<{ associateId } | null>`
  - `getAssociateSession(): Promise<{ associateId, slug } | null>`

## Self-Check: PASSED

- src/lib/identity.ts — FOUND
- src/lib/identity.test.ts — FOUND (6 tests pass)
- src/lib/auth-server.ts — FOUND (extended)
- src/lib/auth-server.test.ts — FOUND (15 tests pass)
- src/middleware.ts — FOUND (rewritten)
- src/middleware.test.ts — FOUND (11 tests pass)
- commit 0e911e1 — FOUND (RED task 1)
- commit 03d1611 — FOUND (GREEN task 1)
- commit 4a532c7 — FOUND (RED task 2)
- commit a293a98 — FOUND (GREEN task 2)
- Full test suite: 109/109 pass

---
*Phase: 09-associate-pin-auth*
*Completed: 2026-04-14*
