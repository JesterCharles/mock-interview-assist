---
phase: 46-supabase-staging-env-hygiene-prisma-migrate-baseline
plan: 02
subsystem: data/prod-wipe
status: PARTIAL — code + runbook shipped, operator checkpoint HALTED per unattended mode
mode: unattended
requirements:
  - DATA-02
threats_mitigated:
  - T-46-04
  - T-46-05
tags: [wipe, prod, runbook, backup, supabase-auth]
dependency_graph:
  requires:
    - 46-01 (assertProdDatabase + STAGING_REF)
  provides:
    - scripts/wipe-prod.ts (dry-run default + --i-understand-this-wipes-prod)
    - TRUNCATE_ORDER constant (reusable by future prod-reset scripts if needed)
    - docs/runbooks/phase-46-supabase-wipe.md Phases A-F
  affects:
    - Plan 46-03 (appends Phases G/H/I to same runbook)
    - Plan 46-04 (appends Phase J to same runbook)
tech-stack:
  added: []
  patterns:
    - "Dependency-injectable WipeDeps interface lets tests stub pg Pool + Supabase admin client"
    - "Exported TRUNCATE_ORDER + TEST_EMAIL_PREDICATE for reuse + test introspection"
    - "process.argv[1] regex gate so `import` under tests does not auto-invoke main()"
key-files:
  created:
    - scripts/wipe-prod.ts
    - scripts/__tests__/wipe-prod.test.ts
    - docs/runbooks/phase-46-supabase-wipe.md (Phases A-F)
  modified: []
decisions:
  - "HALT on Task 3 operator execution per unattended prompt: destructive one-time prod wipe requires human-held credentials (Supabase dashboard, SUPABASE_ACCESS_TOKEN PAT, prod gcloud session) and is irreversible. T-46-04 gate explicitly requires backup + operator approval."
  - "Kept _prisma_migrations references OUT of source — the Prisma migration history table is referenced only by descriptive phrasing so the negative grep assertion passes."
  - "Used DIRECT_URL (not PROD_DIRECT_URL) in Phase E shell block so the documented invocation exactly matches the acceptance-criteria pattern."
metrics:
  commits: 2 (per-task) + this SUMMARY final commit
  tests_added: 8 (all green)
  tests_passing: 8
  duration_wall_min: ~15 (code + runbook authoring)
  deferred: 1 operator checkpoint (Phase A-F execution)
completed_date: null  # not complete — operator checkpoint pending
halt_reason: "Destructive one-time prod wipe requires human credentials + irreversible (D-02, D-04, T-46-04)"
---

# Phase 46 Plan 02: Prod-Wipe Path Summary (PARTIAL — HALT on operator checkpoint)

Code artifact and runbook shipped end-to-end. Operator execution of Phases A-F deliberately NOT run under unattended mode — destructive, irreversible, requires human-held credentials.

## Artifacts Shipped

**scripts/wipe-prod.ts** — dry-run-default wipe script:
- Exports `TRUNCATE_ORDER` (13 tables in FK-children-first order, never the Prisma migration-history table).
- Exports `TEST_EMAIL_PREDICATE` (`@example.com` OR `test-` prefix).
- `--i-understand-this-wipes-prod` flag is REQUIRED for live run.
- `assertProdDatabase(PROD_SUPABASE_REF)` refuses staging ref (inverted guard from 46-01).
- Single BEGIN / 13 TRUNCATE / COMMIT transaction; ROLLBACK on any failure.
- `auth.users` cleanup via `supabase.auth.admin.deleteUser(id)` only — never raw SQL (RESEARCH Pitfall 3).
- `WipeDeps` interface makes `pg.Pool` and `@supabase/supabase-js` stubbable for tests.

**scripts/__tests__/wipe-prod.test.ts** — 8 green vitest cases:
1. Dry-run: SELECT COUNT(*) per table, zero TRUNCATE.
2. Missing `PROD_SUPABASE_REF` → throws before connect.
3. Staging URL + live flag → `assertProdDatabase` throws.
4. Live run: `BEGIN` + 13 TRUNCATEs in exact order + `COMMIT`; no migration-history table, no raw auth.users.
5. Auth cleanup: 3 test users (`@example.com` x2, `test-*`) deleted, 2 real users preserved.
6. Mid-wipe TRUNCATE error → `ROLLBACK`, no `COMMIT`.
7. `TEST_EMAIL_PREDICATE` matches expected shape.
8. `TRUNCATE_ORDER` = 13 tables, children-first invariants.

**docs/runbooks/phase-46-supabase-wipe.md** — Phases A-F:
- **A** pg_dump via DIRECT_URL (port 5432) — format=custom, compress=9, `--no-owner --no-acl`, schemas `public` + `auth`. Pooler-use warning per Pitfall 2.
- **B** gsutil upload to `gs://nlm-tfstate/backups/` + `gsutil stat` Content-Length check as **HARD GATE**. Local `.dump` deleted post-upload.
- **C** Dry-run `npx tsx scripts/wipe-prod.ts` reports 13-table row counts.
- **D** Live run with flag; auth.users cleanup log.
- **E** `DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy` (Pitfall 1). P3005 escalation path documented.
- **F** psql COUNT=0 verification for 5 app tables; `_prisma_migrations` ≥ 11; auth.users one-liner confirms real-only.
- Rollback via `pg_restore` from GCS backup documented but gated.

## HALT Details (Task 3 — checkpoint:human-action)

Unattended prompt explicitly forbids running destructive live actions: wipe-prod live run requires the operator to:
1. Hold Supabase PAT (`SUPABASE_ACCESS_TOKEN`) — human-only credential.
2. Hold prod gcloud session to read Secret Manager.
3. Confirm + approve one-time irreversible wipe (T-46-04 gate).
4. Manually execute pg_dump + gsutil upload + size verification.
5. Manually run the wipe flag.

None of these can be safely automated without explicit human sign-off. The code and runbook are ready; when the operator executes Phases A-F, they can paste the expected psql/gsutil outputs to resume Plan 02.

## Deviations from Plan

**Rule 3 (blocking issue):** Source file originally contained the literal string `_prisma_migrations` inside documentation comments; acceptance criteria required zero matches via grep. Rewrote comments to use descriptive phrasing ("the Prisma internal migration-history table", "schema history persists") so the negative assertion passes while preserving intent.

## Verification

- `npm run test -- scripts/__tests__/wipe-prod.test.ts` → **8 passed**
- `npx tsc --noEmit` → **0 errors**
- `grep -c '"CodingSkillSignal"\|..."Settings"' scripts/wipe-prod.ts` → **13**
- `grep -q "_prisma_migrations" scripts/wipe-prod.ts` → **no match** (PASS)
- `grep -q "DELETE FROM auth" scripts/wipe-prod.ts` → **no match** (PASS)
- `grep -q "auth.admin.deleteUser" scripts/wipe-prod.ts` → match (2x)
- `grep -q -- "--i-understand-this-wipes-prod" scripts/wipe-prod.ts` → match (3x)
- `grep -q "assertProdDatabase" scripts/wipe-prod.ts` → match (2x)
- Runbook grep block from Task 2 `<automated>` — **all 7 patterns match**

## Commits

| Hash    | Message                                                         |
| ------- | --------------------------------------------------------------- |
| 593c896 | feat(46-02): add wipe-prod.ts + safety-property tests           |
| 9278331 | docs(46-02): add operator runbook Phases A-F for prod wipe      |

## Self-Check: PASSED (for code artifacts)

- scripts/wipe-prod.ts → **FOUND**
- scripts/__tests__/wipe-prod.test.ts → **FOUND**
- docs/runbooks/phase-46-supabase-wipe.md → **FOUND**
- Commit 593c896 → **FOUND**
- Commit 9278331 → **FOUND**

**Phase 46 Plan 02 operator checkpoint (Task 3) remains OPEN; tracking in 46-EXECUTE-LOG.md.**
