---
phase: 18-supabase-auth-install
plan: 01
subsystem: auth-infrastructure
tags: [supabase, auth, rate-limiting, env-safety, prisma]
dependency_graph:
  requires: []
  provides:
    - src/lib/supabase/server.ts (createSupabaseServerClient)
    - src/lib/supabase/middleware.ts (createSupabaseMiddlewareClient)
    - src/lib/supabase/admin.ts (supabaseAdmin)
    - src/lib/supabase/browser.ts (createSupabaseBrowserClient)
    - src/lib/env.ts (assertProductionEnv)
    - src/lib/authRateLimit.ts (checkAuthRateLimit, recordAuthEvent)
    - prisma/migrations/20260415000000_add_auth_event (AuthEvent table)
  affects:
    - src/instrumentation.ts (extended with boot assert)
    - prisma/schema.prisma (AuthEvent model added)
tech_stack:
  added:
    - "@supabase/supabase-js@2.103.2"
    - "@supabase/ssr@0.10.2"
  patterns:
    - Supabase SSR server client with getAll/setAll cookie adapter (Next.js App Router canonical)
    - Single-response middleware pattern (create NextResponse once, mutate throughout)
    - import 'server-only' on admin client to prevent client-side bundling of service role key
    - Singleton browser client (module-level var avoids re-creation on re-renders)
    - In-memory sliding window rate limiter matching rateLimitService.ts pattern
    - Boot-time env assertions in instrumentation.ts register()
key_files:
  created:
    - src/lib/supabase/server.ts
    - src/lib/supabase/middleware.ts
    - src/lib/supabase/admin.ts
    - src/lib/supabase/browser.ts
    - src/lib/env.ts
    - src/lib/env.test.ts
    - src/lib/authRateLimit.ts
    - src/lib/authRateLimit.test.ts
    - prisma/migrations/20260415000000_add_auth_event/migration.sql
  modified:
    - src/instrumentation.ts
    - prisma/schema.prisma
    - .env.example
    - package.json
    - package-lock.json
decisions:
  - "Used manual migration SQL (not prisma migrate dev) — no live DB in worktree environment"
  - "metadata cast as 'object' to satisfy Prisma Json input type without importing Prisma namespace"
  - "NODE_ENV cast via (process.env as Record<string,string>) in tests — TS marks it read-only"
  - ".env.docker created but not committed — matches .env* gitignore pattern"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-16T01:58:13Z"
  tasks_completed: 2
  tests_added: 18
  files_created: 9
  files_modified: 5
---

# Phase 18 Plan 01: Supabase Auth Install — Foundation Summary

**One-liner:** Installed `@supabase/ssr@0.10.2` + `@supabase/supabase-js@2.103.2`, scaffolded 4 Supabase client modules (server/middleware/admin/browser), added boot-time localhost-rejection assert, created `AuthEvent` Prisma model, and built in-memory sliding-window auth rate limiter with namespace isolation.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install packages + scaffold Supabase clients + update env | `07df594` | src/lib/supabase/{server,middleware,admin,browser}.ts, .env.example |
| 2 | Boot-time env assert + AuthEvent migration + auth rate limiter | `8a46744` | src/lib/env.ts, src/lib/authRateLimit.ts, prisma/schema.prisma, src/instrumentation.ts |

## Verification

- `npx tsc --noEmit` — clean (0 errors)
- `npm run test -- --run` — 257 passed, 4 skipped (26 files + 1 skipped)
- Target tests: `src/lib/env.test.ts` + `src/lib/authRateLimit.test.ts` — 18/18 passing
- `.env.example` contains all 5 new Supabase env vars with explanatory comments

## Decisions Made

1. **Manual migration SQL** — `prisma migrate dev` requires a live DB connection which isn't available in the worktree environment. Created `prisma/migrations/20260415000000_add_auth_event/migration.sql` manually; `prisma migrate deploy` will apply it on next deployment.
2. **Prisma Json cast** — `metadata` field typed as `object | undefined` to satisfy Prisma's `InputJsonValue` without importing the full Prisma namespace type.
3. **NODE_ENV test pattern** — TypeScript marks `process.env.NODE_ENV` as read-only; tests use `(process.env as Record<string, string>).NODE_ENV` to override in test context.
4. **`.env.docker` not committed** — gitignore pattern `.env*` covers it; file created on disk for developer reference.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma Json metadata type error**
- **Found during:** Task 2 TypeScript check
- **Issue:** `Record<string, unknown>` is not assignable to Prisma's `NullableJsonNullValueInput | InputJsonValue`
- **Fix:** Cast `metadata` as `object | undefined` at the Prisma create call
- **Files modified:** `src/lib/authRateLimit.ts`
- **Commit:** `8a46744`

**2. [Rule 1 - Bug] NODE_ENV read-only TypeScript error in test**
- **Found during:** Task 2 TypeScript check
- **Issue:** `process.env.NODE_ENV` is typed as read-only in TypeScript
- **Fix:** Cast via `(process.env as Record<string, string>).NODE_ENV` in test file
- **Files modified:** `src/lib/env.test.ts`
- **Commit:** `8a46744`

## Known Stubs

None — all exported functions are fully implemented. `AuthEvent.create` is wired to the real Prisma client; mocked only in unit tests.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: service-role-key-exposure | src/lib/supabase/admin.ts | Mitigated via `import 'server-only'` — T-18-01 disposition: mitigate applied |
| threat_flag: localhost-in-production | src/lib/env.ts | Mitigated via boot assert in instrumentation.ts — T-18-02 disposition: mitigate applied |
| threat_flag: auth-rate-limit-bypass | src/lib/authRateLimit.ts | Mitigated via 3/hr email + 10/hr IP sliding windows — T-18-03 disposition: mitigate applied |

## Self-Check: PASSED

All 8 created files verified on disk. Both task commits (07df594, 8a46744) confirmed in git log. 257 tests passing.
