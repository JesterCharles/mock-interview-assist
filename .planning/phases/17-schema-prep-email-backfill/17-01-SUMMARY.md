---
phase: 17-schema-prep-email-backfill
plan: 01
subsystem: database
tags: [schema, migration, prisma, supabase, additive]
requires: []
provides:
  - Associate.email (nullable, unique)
  - Associate.authUserId (nullable, unique)
  - Associate.lastInvitedAt (nullable)
  - Session.aiTrainerVariance (nullable)
  - prisma/migrations/0002_v12_email_authuser_variance (idempotent)
affects:
  - prisma/schema.prisma
  - src/generated/prisma/
tech-stack:
  added: []
  patterns:
    - "ADD COLUMN IF NOT EXISTS for additive DDL idempotency"
    - "CREATE UNIQUE INDEX IF NOT EXISTS for index idempotency"
key-files:
  created:
    - prisma/migrations/0002_v12_email_authuser_variance/migration.sql
  modified:
    - prisma/schema.prisma
    - src/generated/prisma/index.d.ts
    - src/generated/prisma/index.js
    - src/generated/prisma/edge.js
    - src/generated/prisma/index-browser.js
    - src/generated/prisma/package.json
decisions:
  - "All new columns nullable — no backfill required, zero risk to existing rows"
  - "Idempotent DDL (IF NOT EXISTS) guards against partial _prisma_migrations rows from prior attempts"
  - "No FK on authUserId yet — Phase 18 wires Supabase auth.users link; keeping plain TEXT @unique for now"
metrics:
  duration: "~1m"
  completed: "2026-04-15T22:34:22Z"
  tasks: 3
  commits: 3
requirements:
  - BACKFILL-01
---

# Phase 17 Plan 01: Schema Prep (Email + AuthUserId + Variance) Summary

Added four nullable columns (`Associate.email`, `Associate.authUserId`, `Associate.lastInvitedAt`, `Session.aiTrainerVariance`) via idempotent migration `0002_v12_email_authuser_variance` and regenerated the Prisma client. All acceptance criteria met; migration proven idempotent against production-shape Supabase DB.

## Task Execution

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Update prisma/schema.prisma with four nullable columns | `d8c7554` | done |
| 2 | Author idempotent migration SQL | `a930f40` | done |
| 3 | [BLOCKING] migrate deploy + generate + tsc | `29eb7a1` | done |

## Idempotency Proof

First run:
```
Applying migration `0002_v12_email_authuser_variance`
All migrations have been successfully applied.
```

Second run (immediately after):
```
No pending migrations to apply.
```

Exit code 0 both times. Migration-tracking layer (`_prisma_migrations`) correctly recognizes the applied migration; the `IF NOT EXISTS` guards would handle column-level idempotency if the tracking row were ever lost.

## Client Regeneration

- `npx prisma generate` — v7.7.0 to `src/generated/prisma` in 57ms
- `src/generated/prisma/index.d.ts` now exposes `email: string | null`, `authUserId: string | null`, `lastInvitedAt: Date | null`, `aiTrainerVariance: number | null`
- `npx tsc --noEmit` exits 0 — no type regressions across the codebase

## Deviations from Plan

None — plan executed exactly as written.

## Operational Notes for Production Deploy

- Migration is additive and lock-light: brief `ACCESS EXCLUSIVE` only for each `ADD COLUMN` (instant on empty columns)
- Unique indexes build on empty columns — no scan cost, no duplicate risk (NULL doesn't violate UNIQUE in Postgres)
- Rollback is a manual `ALTER TABLE DROP COLUMN` × 4 + `DROP INDEX` × 2; no automated down-migration is shipped (project convention: forward-only migrations)
- Dockerfile already runs `prisma generate` during build — no image change needed
- Next deploy: `prisma migrate deploy` in the startup hook will pick up `0002` automatically

## Threat Flags

None — all threats in the plan's register are mitigated exactly as planned; no new trust-boundary surface introduced.

## Self-Check: PASSED

- FOUND: prisma/migrations/0002_v12_email_authuser_variance/migration.sql
- FOUND: prisma/schema.prisma (contains all four new fields)
- FOUND: d8c7554 (Task 1 commit)
- FOUND: a930f40 (Task 2 commit)
- FOUND: 29eb7a1 (Task 3 commit)
- FOUND: generated client `email: string | null` in src/generated/prisma/index.d.ts
