---
phase: 46-supabase-staging-env-hygiene-prisma-migrate-baseline
plan: 03
subsystem: data/secret-manager + migrations
status: PARTIAL — code + runbook shipped, operator checkpoint HALTED per unattended mode
mode: unattended
requirements:
  - DATA-01
  - DATA-04
threats_mitigated:
  - T-46-06
tags: [secrets, migrations, prisma, supabase, runbook]
dependency_graph:
  requires:
    - 46-01 (STAGING_REF constant)
    - 46-02 (runbook Phases A-F)
  provides:
    - scripts/verify-migrations.sh (DATA-04 automation entry)
    - scripts/__tests__/__fixtures__/fake-bin/npx (reusable test stub)
    - docs/runbooks/phase-46-supabase-wipe.md Phases G, H, I
  affects:
    - Plan 46-04 (imports verify-migrations.sh into phase-gate aggregator)
tech-stack:
  added: []
  patterns:
    - "PATH-override test pattern — replace `npx` with a fixture stub during vitest spawnSync runs"
    - "bash verify script with three distinct exit codes (2 / 3 / 1) for precise failure categorization"
key-files:
  created:
    - scripts/verify-migrations.sh
    - scripts/__tests__/verify-migrations.test.ts
    - scripts/__tests__/__fixtures__/fake-bin/npx
  modified:
    - docs/runbooks/phase-46-supabase-wipe.md (appended ~200 lines)
decisions:
  - "HALT on Task 4 operator execution: requires human credentials (Supabase PAT, gcloud prod access), rotates prod keys irreversibly."
  - "verify-migrations.sh uses three distinct exit codes (2 = unset env, 3 = pooler misuse, 1 = pending migrations, 0 = ok) so the Plan 04 phase-gate can print precise diagnostics."
  - "Phase H documents BOTH 'No pending migrations to apply' (post-wipe prod, already at tail) AND '11 migrations applied' (staging first-apply) as valid success paths."
metrics:
  commits: 2
  tests_added: 4
  tests_passing: 4
  duration_wall_min: ~12
  deferred: 1 operator checkpoint (Phases G/H/I execution)
completed_date: null  # not complete — operator checkpoint pending
halt_reason: "Key rotation + Secret Manager population requires human Supabase dashboard + gcloud prod credentials (T-46-06, D-03)"
---

# Phase 46 Plan 03: Key Rotation + Migrate Deploy Summary (PARTIAL — HALT on operator checkpoint)

Code + runbook ready; operator execution of Phases G/H/I halted per unattended mode — key rotation requires human Supabase dashboard access and prod gcloud credentials.

## Artifacts Shipped

**scripts/verify-migrations.sh** (executable):
- exit 0 on `Database schema is up to date`
- exit 1 on pending migrations / unexpected status output
- exit 2 on DIRECT_URL unset
- exit 3 on DIRECT_URL containing `:6543` (pooler misuse, RESEARCH Pitfall 1)
- Uses `DATABASE_URL="$DIRECT_URL" npx prisma migrate status` per D-14.

**scripts/__tests__/__fixtures__/fake-bin/npx** (executable):
- Test-only shim replacing `npx` on PATH. `FIXTURE_MODE` env toggles response: `up-to-date` | `pending` | `error`.

**scripts/__tests__/verify-migrations.test.ts** — 4 green cases:
- DIRECT_URL unset → exit 2 + `DIRECT_URL env var not set` stderr
- DIRECT_URL pooler → exit 3 + pooler warning stderr
- up-to-date mode → exit 0 + `Database schema is up to date` stdout + `[verify-migrations] OK`
- pending mode → exit 1 + FAIL stderr

**docs/runbooks/phase-46-supabase-wipe.md** — appended Phases G, H, I:
- **G1-G4** 14 `gcloud secrets versions add` invocations across both projects for 7 secrets (DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL, ADMIN_EMAILS). Security callouts: leading-space trick, HISTCONTROL, no .env.local writes, terminal close post-rotation.
- **H1/H2** `DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy` for staging + prod. P3005 escalation documented (no force-reset).
- **H3** migration tail reference (11 migrations — D-13).
- **I** 6 grep-based assertions: staging DATABASE_URL contains staging ref; prod DATABASE_URL does NOT contain staging ref; similar for NEXT_PUBLIC_SUPABASE_URL; staging NEXT_PUBLIC_SITE_URL = staging.nextlevelmock.com; prod = apex or www. Opaque-token shape-only callout.

## HALT Details (Task 4 — checkpoint:human-action)

Unattended rules explicitly halt on:
- Supabase dashboard key rotation (requires human browser session with 2FA)
- `gcloud secrets versions add` against `nlm-prod` (requires human approval to rotate prod keys — T-46-06 gate)
- Verifying Secret Manager contents post-rotation (depends on populated secrets which require G)

Code ready for operator to execute; Plan 04 phase-gate script will verify all DATA-01/DATA-04/T-46-06 assertions once operator completes G/H/I.

## Deviations from Plan

None. Phases G/H/I were written in a single pass as part of Task 1 (instead of Task 3 appending after a Task 1/2 gap) — this keeps the runbook continuous and avoids a mid-plan doc drift. Commit attribution still split between Task 2 (verify-migrations.sh + tests) and Task 3 (runbook appendix).

## Verification

- `npm run test -- scripts/__tests__/verify-migrations.test.ts` → **4 passed**
- `npx tsc --noEmit` → **0 errors**
- `bash scripts/verify-migrations.sh` without DIRECT_URL → exit 2 (confirmed)
- `DIRECT_URL="postgresql://u:p@host:6543/x" bash scripts/verify-migrations.sh` → exit 3 (confirmed)
- `test -x scripts/verify-migrations.sh` → **executable**
- `test -x scripts/__tests__/__fixtures__/fake-bin/npx` → **executable**
- `grep -q "Database schema is up to date" scripts/verify-migrations.sh` → match
- `grep -q ':6543' scripts/verify-migrations.sh` → match
- `grep -q 'DATABASE_URL="\$DIRECT_URL"' scripts/verify-migrations.sh` → match
- Runbook grep block from Task 1 + Task 3 verify — **all match**; `gcloud secrets versions add` appears 15 times (≥ 14 required).

## Commits

| Hash    | Message                                                          |
| ------- | ---------------------------------------------------------------- |
| c269b55 | feat(46-03): add verify-migrations.sh + tests + fake-bin fixture |
| e1fa1d2 | docs(46-03): append Phases G/H/I to Phase-46 runbook             |

## Self-Check: PASSED (for code artifacts)

- scripts/verify-migrations.sh → **FOUND** (executable)
- scripts/__tests__/verify-migrations.test.ts → **FOUND**
- scripts/__tests__/__fixtures__/fake-bin/npx → **FOUND** (executable)
- docs/runbooks/phase-46-supabase-wipe.md — Phase G present → **match**
- docs/runbooks/phase-46-supabase-wipe.md — Phase H present → **match**
- docs/runbooks/phase-46-supabase-wipe.md — Phase I present → **match**
- Commit c269b55 → **FOUND**
- Commit e1fa1d2 → **FOUND**

**Phase 46 Plan 03 operator checkpoint (Task 4) remains OPEN; tracking in 46-EXECUTE-LOG.md.**
