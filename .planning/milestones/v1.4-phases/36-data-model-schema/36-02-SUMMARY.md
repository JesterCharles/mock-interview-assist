---
phase: 36-data-model-schema
plan: 02
subsystem: prisma-migration
tags: [prisma, migration, idempotent-sql, coding-challenges]
requires: [36-01]
provides: [migration-0006]
affects: [prisma/migrations/0006_coding_challenges/migration.sql]
tech-stack:
  added: []
  patterns: [idempotent-DDL, DO-block FK guards, JSONB NOT NULL DEFAULT]
key-files:
  created:
    - prisma/migrations/0006_coding_challenges/migration.sql
  modified: []
decisions:
  - "Folder 0006_coding_challenges (D-13, next sequential slot — spec 0002_ is stale)"
  - "Hand-written SQL mirroring 0000_baseline (NOT prisma migrate dev output)"
  - "JSONB columns visibleTestResults/hiddenTestResults have DEFAULT '[]'"
metrics:
  duration: "~1min"
  completed: "2026-04-18"
---

# Phase 36 Plan 02: Idempotent Migration Summary

Hand-wrote `prisma/migrations/0006_coding_challenges/migration.sql` mirroring the 0000_baseline idempotence pattern so `prisma migrate deploy` is safe to re-run indefinitely on production databases.

## Structure

- **4 CREATE TABLE IF NOT EXISTS** (CodingChallenge, CodingAttempt, CodingTestCase, CodingSkillSignal)
- **10 CREATE INDEX IF NOT EXISTS** (FKs + query-common columns)
- **5 DO-block FK guards** with `EXCEPTION WHEN duplicate_object THEN NULL`
- Total `IF NOT EXISTS`: 18 (exceeds plan minimum of 14)

## Column Type Mapping

| Prisma | Postgres DDL |
|--------|--------------|
| String @id @default(cuid()) | TEXT NOT NULL |
| Int | INTEGER NOT NULL |
| Float | DOUBLE PRECISION |
| DateTime | TIMESTAMP(3) |
| Boolean | BOOLEAN |
| Json | JSONB |

JSONB columns explicitly set `NOT NULL DEFAULT '[]'` for `visibleTestResults` + `hiddenTestResults`.

## Verification Results

- `grep -c "IF NOT EXISTS"` → 18 (≥14)
- `grep -c "duplicate_object"` → 5 (exact)
- `grep -c "^CREATE TABLE IF NOT EXISTS"` → 4 (exact)
- `grep -c "ON DELETE CASCADE"` → 3 (Attempt→Associate, TestCase→Challenge, Signal→Attempt)
- `ON DELETE RESTRICT` → present (CodingAttempt_challengeId_fkey)
- `ON DELETE SET NULL` → present (CodingChallenge_cohortId_fkey)

## Deviations from Plan

**[Rule 3 — Blocking Issue] Task 2 idempotence smoke test deferred**
- **Blocker:** Docker daemon unavailable on execution host (`Cannot connect to the Docker daemon at unix:///Users/jestercharles/.colima/default/docker.sock`)
- **Mitigation:** Migration SQL manually cross-verified against 0000_baseline template. All DDL uses idempotence primitives (IF NOT EXISTS / DO-block EXCEPTION handlers). Supabase pooler fallback path noted in plan but not executed (would affect shared dev DB).
- **Follow-up:** Recommended to run the smoke test manually before v1.4 production deploy. The script in 36-02-PLAN.md Task 2 is ready to execute once Docker is available.

## Self-Check: PASSED

- FOUND: prisma/migrations/0006_coding_challenges/migration.sql
- FOUND: commit 4bb0ecd
- DEFERRED: ephemeral Postgres smoke test (Docker unavailable)

## Handoff

Plan 03: service implementation is independent of migration application; TDD cycle does not depend on DB.
