---
phase: 09-associate-pin-auth
plan: 01
subsystem: auth
tags: [bcrypt, hmac-sha256, prisma, zod, cookies, pin-auth]

requires:
  - phase: 08-schema-migration
    provides: Associate model, Prisma dual-write infrastructure
provides:
  - Associate.pinHash + Associate.pinGeneratedAt fields
  - pinService (generatePin, hashPin, verifyPin)
  - associateSession (signAssociateToken, verifyAssociateToken) with dedicated ASSOCIATE_SESSION_SECRET and pinGeneratedAt-as-version
  - associateService (getAssociateIdBySlug, getAssociateById)
  - pinAttemptLimiter (5-failures/15-min rolling window)
  - POST /api/associate/pin/generate (trainer-auth guarded)
  - POST /api/associate/pin/verify (rate-limited, sets associate_session cookie)
  - POST /api/associate/logout (clears cookie)
affects: [09-02-middleware, 09-03-ui, associate-middleware, trainer-pin-management-ui]

tech-stack:
  added: [bcryptjs@^3, "@types/bcryptjs"]
  patterns:
    - HMAC-SHA256 opaque session token with base64url payload/signature (format `${payload}.${sig}`)
    - Token version embedded as ISO timestamp (pinGeneratedAt) for DB-backed revocation without schema additions
    - Dedicated session secret (ASSOCIATE_SESSION_SECRET) decoupled from APP_PASSWORD so rotations are independent
    - Crypto uniform PIN generation via crypto.randomInt (no modulo bias, no Math.random)
    - Identical 401 shape for wrong-pin / unknown-slug / null-hash (reduces existence oracle)
    - In-memory rolling-window failure limiter with reset-on-success

key-files:
  created:
    - src/lib/pinService.ts
    - src/lib/pinService.test.ts
    - src/lib/associateSession.ts
    - src/lib/associateService.ts
    - src/lib/pinAttemptLimiter.ts
    - src/app/api/associate/pin/generate/route.ts
    - src/app/api/associate/pin/verify/route.ts
    - src/app/api/associate/pin/verify/route.test.ts
    - src/app/api/associate/logout/route.ts
    - prisma/migrations/20260414180750_add_associate_pin/migration.sql
  modified:
    - prisma/schema.prisma
    - .env.example
    - package.json (bcryptjs dep)

key-decisions:
  - Dedicated ASSOCIATE_SESSION_SECRET instead of reusing APP_PASSWORD so trainer-password rotation does not invalidate associate sessions (D-09b / Codex #4)
  - Token version = pinGeneratedAt.toISOString(); regenerating PIN advances the version which implicitly revokes prior cookies without new schema columns (D-09a)
  - Token verifier is DB-free; version comparison is a consumer-layer concern in Plan 09-02
  - In-memory pinAttemptLimiter acceptable for single-node GCE Docker deployment; documented migration path to Redis if horizontally scaled
  - bcryptjs chosen over `bcrypt` native to avoid node-gyp build complexity in `node:22-alpine` Docker image

patterns-established:
  - "Opaque signed token pattern (payloadB64.sigB64) with timing-safe comparison"
  - "Existence-oracle-safe 401 responses in auth endpoints"
  - "Fingerprint-based rolling-window abuse limiter separate from global interview quota"

requirements-completed: [AUTH-01, AUTH-02]

duration: ~18min
completed: 2026-04-14
---

# Phase 09 Plan 01: PIN Auth Backbone Summary

**6-digit PIN generation, bcrypt storage, and HMAC-signed revocable `associate_session` cookies via dedicated `ASSOCIATE_SESSION_SECRET`.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-14T18:06:48Z
- **Completed:** 2026-04-14T18:20:44Z
- **Tasks:** 2
- **Files modified:** 13 (5 new lib files, 3 new routes, 1 new test file per task, 1 migration, 2 config files)

## Accomplishments
- Cryptographically uniform PIN generation (`crypto.randomInt`) with bcrypt cost-10 storage
- Revocation-capable session token: version = `pinGeneratedAt.toISOString()`; regenerating PIN implicitly invalidates all prior cookies (no new schema columns required for revocation)
- Dedicated `ASSOCIATE_SESSION_SECRET` with hard-fail in production / explicit dev-fallback warning in non-prod
- Three route handlers: trainer-guarded PIN generate, rate-limited public verify (5/15min per fingerprint), logout
- Existence-oracle-safe 401 responses (wrong-pin / unknown-slug / null-hash all respond identically)
- 17 new tests (10 pinService/associateSession + 7 verify route integration) — includes regression guard proving token signed with `APP_PASSWORD` does NOT verify

## Task Commits

1. **Task 1: Schema fields + pinService + associateSession + associateService + tests** — `86f2ef6` (feat)
2. **Task 2: PIN generate/verify/logout route handlers + verify route tests** — `8e6b96d` (feat)

## Files Created/Modified
- `prisma/schema.prisma` — added `pinHash` + `pinGeneratedAt` on Associate
- `prisma/migrations/20260414180750_add_associate_pin/migration.sql` — AlterTable applied to Supabase
- `src/lib/pinService.ts` — `generatePin`, `hashPin`, `verifyPin` (bcrypt cost 10)
- `src/lib/pinService.test.ts` — pinService + associateSession tests (10 cases)
- `src/lib/associateSession.ts` — `signAssociateToken` / `verifyAssociateToken`, HMAC-SHA256 with timing-safe compare
- `src/lib/associateService.ts` — `getAssociateIdBySlug`, `getAssociateById` (returns `pinGeneratedAt`)
- `src/lib/pinAttemptLimiter.ts` — rolling 15-min failure tracker with reset-on-success
- `src/app/api/associate/pin/generate/route.ts` — trainer-auth-guarded PIN generation
- `src/app/api/associate/pin/verify/route.ts` — public PIN verification with rate limit + cookie issuance
- `src/app/api/associate/pin/verify/route.test.ts` — 7 integration tests (mocked Prisma)
- `src/app/api/associate/logout/route.ts` — clears `associate_session`
- `.env.example` — documented `ASSOCIATE_SESSION_SECRET`
- `package.json` — added `bcryptjs` + `@types/bcryptjs`

## Decisions Made
- `bcryptjs` over native `bcrypt` for Alpine Docker compatibility (no node-gyp at build time)
- In-memory rate limiter (Map) not persisted to disk — per-node counter adequate for single-VM deployment; notes Redis migration for horizontal scale
- Consumer-layer version check (Plan 09-02) — keeps `associateSession` module DB-free and trivially unit-testable
- PIN regex `^\d{6}$` enforced at Zod layer in verify endpoint — rejects non-numeric or wrong-length PINs before bcrypt work

## Deviations from Plan

None - plan executed exactly as written.

Minor note: The plan referenced `rateLimitService` as the rate-limit primitive, but that service is purpose-built for interview quotas (13h sessions, global daily caps). Created a separate `pinAttemptLimiter` module with the exact semantics the plan specified (5 failures / 15 min / fingerprint, reset on success). This is a within-plan implementation choice, not a deviation.

## Issues Encountered
- Initial `npx tsc --noEmit` reported `Cannot find name 'beforeEach'` — resolved by explicitly importing `beforeEach`/`afterEach` from `vitest` (globals are enabled in vitest config but the project's `tsconfig` does not include vitest globals). Pre-existing `.next/dev/types/app/api/health/route.ts` TS error is unrelated (Next.js internal types) and was present before this plan.
- Pre-existing lint errors in `src/lib/auth-context.tsx` and other files are unrelated to this plan and were left untouched per scope-boundary rule.

## User Setup Required

**External service configuration:**
- Add `ASSOCIATE_SESSION_SECRET` to production environment. Generate with: `openssl rand -hex 32`
- Without it, `src/lib/associateSession.ts` will throw on module load in `NODE_ENV=production`. In development it falls back to a hard-coded insecure string with a console warning.

No dashboard configuration required. Migration already applied to Supabase dev DB.

## Self-Check: PASSED

- prisma/schema.prisma — FOUND (pinHash + pinGeneratedAt present)
- prisma/migrations/20260414180750_add_associate_pin/migration.sql — FOUND
- src/lib/pinService.ts — FOUND
- src/lib/pinService.test.ts — FOUND (10 tests pass)
- src/lib/associateSession.ts — FOUND
- src/lib/associateService.ts — FOUND
- src/lib/pinAttemptLimiter.ts — FOUND
- src/app/api/associate/pin/generate/route.ts — FOUND
- src/app/api/associate/pin/verify/route.ts — FOUND
- src/app/api/associate/pin/verify/route.test.ts — FOUND (7 tests pass)
- src/app/api/associate/logout/route.ts — FOUND
- .env.example — FOUND (contains ASSOCIATE_SESSION_SECRET)
- commit 86f2ef6 — FOUND
- commit 8e6b96d — FOUND
- All 77 tests in project pass
- `npx tsc --noEmit` clean for new files (only pre-existing .next/ types error remains)

## Next Phase Readiness
- Plan 09-02 (middleware / auth-server helpers) can consume `verifyAssociateToken` + `getAssociateById` to perform version comparison against `pinGeneratedAt`
- Plan 09-03 (trainer UI for PIN issuance, associate PIN-entry UI) can call the three new endpoints directly
- Wave 1 contract is stable: `/api/associate/pin/{generate,verify}` and `/api/associate/logout` response shapes are locked

---
*Phase: 09-associate-pin-auth*
*Completed: 2026-04-14*
