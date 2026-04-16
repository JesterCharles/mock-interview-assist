---
phase: 25-pin-removal-cleanup
plan: "02"
subsystem: auth
tags: [pin-removal, schema-migration, env-cleanup, docs]
dependency_graph:
  requires: [25-01-pin-code-deletion]
  provides: [clean-schema, clean-env-files, clean-docs]
  affects: [prisma-schema, generated-prisma-client, env-example, claude-md, project-md]
tech_stack:
  added: []
  patterns: [IF-EXISTS-idempotent-migration, prisma-generate-after-schema-change]
key_files:
  created:
    - prisma/migrations/0004_drop_pin_columns/migration.sql
  modified:
    - prisma/schema.prisma
    - src/generated/prisma/index.d.ts
    - src/generated/prisma/index.js
    - src/generated/prisma/edge.js
    - src/generated/prisma/schema.prisma
    - src/generated/prisma/index-browser.js
    - .env.example
    - CLAUDE.md
    - .planning/PROJECT.md
decisions:
  - Migration uses IF EXISTS guards for idempotency — safe to re-run against production DB
  - .env.docker is gitignored so APP_PASSWORD/ASSOCIATE_SESSION_SECRET removal is local-only (correct: secrets never committed)
  - PROJECT.md Key Decisions table updated to reflect Supabase-only auth as the canonical identity mechanism
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-16"
  tasks_completed: 2
  files_changed: 9
---

# Phase 25 Plan 02: PIN Schema Drop + Env/Doc Cleanup Summary

**One-liner:** Dropped pinHash/pinGeneratedAt columns from Prisma schema with idempotent SQL migration, regenerated the Prisma client PIN-free, and scrubbed all PIN/APP_PASSWORD/ASSOCIATE_SESSION_SECRET references from env files and docs.

## What Was Built

### Task 1: Prisma migration to drop PIN columns

- **`prisma/schema.prisma`** — Removed `pinHash String?` and `pinGeneratedAt DateTime?` from `Associate` model
- **`prisma/migrations/0004_drop_pin_columns/migration.sql`** — Created with `ALTER TABLE "Associate" DROP COLUMN IF EXISTS` for both columns (idempotent, safe for production re-run)
- **`src/generated/prisma/`** — Regenerated via `npx prisma generate`; zero `pinHash` or `pinGeneratedAt` references in generated types

### Task 2: Env var and doc cleanup

- **`.env.example`** — Removed `ASSOCIATE_SESSION_SECRET` block (3-line comment + variable)
- **`.env.docker`** — Removed `APP_PASSWORD` and `ASSOCIATE_SESSION_SECRET` lines (file is gitignored; changes are local-only as intended)
- **`CLAUDE.md`** — Removed: `APP_PASSWORD`, `ASSOCIATE_SESSION_SECRET`, `ENABLE_ASSOCIATE_AUTH`, `NLM_TRUSTED_PROXY` env vars; `pinService`, `pinAttemptLimiter`, `associateSession`, `featureFlags` service entries; `/api/associate/pin/generate`, `/api/associate/pin/verify` route entries; PIN auth paragraph in Authentication section; feature-flag references in sign-in description and Associate model description
- **`.planning/PROJECT.md`** — Updated AUTH-01..04 requirement entry to reflect Supabase auth (not PIN); updated constraints to remove `ASSOCIATE_SESSION_SECRET` entry; updated Key Decisions table to reflect Supabase-only auth as the final state

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Observations

- `.env.docker` is listed in `.gitignore` so the `APP_PASSWORD`/`ASSOCIATE_SESSION_SECRET` removal cannot be committed. This is correct behavior: secrets should not be committed. The plan's intent (remove from committed files) is satisfied by `.env.example`.
- `CLAUDE.md` already had no `APP_PASSWORD` entry in the Environment Variables section (it was only in `.env.docker`). No change needed for that specific item.

## Verification Results

- `grep -n "pinHash|pinGeneratedAt" prisma/schema.prisma` — exit 1 (no matches)
- `grep -c "pinHash|pinGeneratedAt" src/generated/prisma/index.d.ts` — 0 matches
- `grep -n "APP_PASSWORD|ASSOCIATE_SESSION_SECRET|ENABLE_ASSOCIATE_AUTH" .env.example .env.docker` — exit 1 (no matches)
- `npm run test` — 470 passed, 4 skipped (52 test files, 1 skipped)
- `npm run build` — succeeded, all routes compiled

## Known Stubs

None.

## Threat Flags

None. This plan removes secrets from committed files (T-25-06 mitigated) and drops unused database columns (T-25-05 accepted as idempotent).

## Self-Check: PASSED

- prisma/migrations/0004_drop_pin_columns/migration.sql — FOUND
- prisma/schema.prisma (pinHash removed) — VERIFIED
- src/generated/prisma/index.d.ts (PIN-free) — VERIFIED
- .env.example (ASSOCIATE_SESSION_SECRET removed) — VERIFIED
- CLAUDE.md (PIN refs removed) — VERIFIED
- .planning/PROJECT.md (PIN refs removed) — VERIFIED
- commit 85040ff — FOUND
- commit 4b6cc75 — FOUND
