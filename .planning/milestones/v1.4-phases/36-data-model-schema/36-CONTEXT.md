# Phase 36: Data Model & Schema - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults captured inline)

<domain>
## Phase Boundary

Deliver four Prisma models (`CodingChallenge`, `CodingAttempt`, `CodingTestCase`, `CodingSkillSignal`), an idempotent migration that is safe over the existing production database, and a pure-function `codingSignalService.ts` that maps `CodingSkillSignal` rows into `GapScore` inputs with unit-test coverage for every signal type.

**In scope:**
- Prisma schema additions (4 models + indexes + relations)
- Idempotent migration SQL (`IF NOT EXISTS`, DO-block FK guards — same pattern as `0000_baseline`)
- Generated client refresh (`prisma generate`) so `src/generated/prisma` exports new types
- Pure-function signal→score mapper with unit tests

**Out of scope (other phases):**
- Challenge authoring / GitHub loader → Phase 37
- Judge0 integration, API routes → Phase 38-39
- UI → Phase 40
- `GapScore` recompute trigger wiring → Phase 41

</domain>

<decisions>
## Implementation Decisions

### Schema Organization
- **D-01:** Add all 4 models to the single existing `prisma/schema.prisma` file — no split into domain files. Matches current convention (Associate/Session/GapScore/Cohort/CurriculumWeek/Profile all colocated). One schema file, one generate step.
- **D-02:** Generated client continues to output to `src/generated/prisma/` (no path change).

### Enum Representation
- **D-03:** Use `String` columns with schema-level `//` comments documenting allowed values AND runtime Zod validation — same pattern as `Session.mode` (`String @default("trainer-led")` with comment) and `Session.readinessRecomputeStatus`. Zod schemas live next to the service that writes the column.
  - `CodingChallenge.language`: `python | javascript | typescript | java | sql | csharp`
  - `CodingAttempt.language`: same allowlist as challenge
  - `CodingAttempt.verdict`: `pass | fail | timeout | mle | runtime_error | compile_error | pending`
  - `CodingSkillSignal.signalType`: `pass | partial | fail | compile_error | timeout`
- **Why not Prisma `enum`:** Project has zero Prisma enums today. Adding one now creates a precedent and migration surface that costs more than runtime Zod already gives us. Readiness is also that strings round-trip cleanly through JSON columns already scattered across the schema.

### Test Case Storage
- **D-04:** `CodingTestCase` rows persisted in DB for both visible and hidden cases (flagged by `isHidden bool`). `stdin` and `expectedStdout` columns hold literal values — the "hidden rows loaded server-only from private repo" language in CODING-MODEL-03 refers to the **seed path** (Phase 37 loader pulls from private repo → writes rows with `isHidden=true`), not to runtime. API response serializers (Phase 39) MUST filter `isHidden=true` rows out of client payloads.
- **D-05:** No separate "hidden test" table. One table keeps partial-credit math and joins simple; the security boundary is the API layer, not the DB layer.

### Attempt Result Storage
- **D-06:** `visibleTestResults` and `hiddenTestResults` are both `Json` columns on `CodingAttempt`. `hiddenTestResults` stores verdict-only records (`{caseId, passed: bool, durationMs}`) — never stdin/expected strings. Enforced in the service layer that writes the attempt, re-verified by a Zod schema.
- **D-07:** `score` is `Float` (0-100) computed by server after Judge0 callback — not trusted from client. Exact formula lives in Phase 39 but the column contract is fixed here.

### Relations & Cascade Behavior
- **D-08:** `CodingAttempt.associateId` → `Associate.id` with `onDelete: Cascade` (same semantics as existing `GapScore.associateId`). Deleting an associate scrubs their attempts.
- **D-09:** `CodingAttempt.challengeId` → `CodingChallenge.id` with `onDelete: Restrict` — cannot delete a challenge that has attempts; forces trainer to archive challenges (future concern, out-of-scope but contract is set now).
- **D-10:** `CodingTestCase.challengeId` → `CodingChallenge.id` with `onDelete: Cascade` — challenge delete takes its cases.
- **D-11:** `CodingSkillSignal.attemptId` → `CodingAttempt.id` with `onDelete: Cascade`, plus `@unique` on `attemptId` (one signal row per attempt — signal is the derived summary, not per-test).
- **D-12:** `CodingChallenge.cohortId` nullable, `onDelete: SetNull` — challenges outlive cohorts.

### Migration Numbering
- **D-13:** Migration name is `0006_coding_challenges` (next sequential slot). Spec text `CODING-MODEL-05` says `0002_coding_challenges` — that is **stale** (reflects earlier schema state; slot 0002 is already `0002_v12_email_authuser_variance`). Follow codebase reality, not spec string. Note this deviation in PLAN.md so planner surfaces it during review.
- **D-14:** Migration is idempotent per existing convention:
  - `CREATE TABLE IF NOT EXISTS`
  - `CREATE INDEX IF NOT EXISTS`
  - FK guards wrapped in `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_constraint ...) THEN ALTER TABLE ... ADD CONSTRAINT ... END IF; END $$;`
  - Safe to run against existing prod DB via `prisma migrate deploy`.

### Signal→Score Mapping
- **D-15:** `codingSignalService.ts` is pure-function, lives at `src/lib/codingSignalService.ts` (mirrors existing `gapService.ts` location). No DB imports, no side effects, easy to unit-test.
- **D-16:** Default weight table (tunable via constants, not env — tuning belongs in code review, not ops):

  | signalType | mappedScore (0-100) | weight | Rationale |
  |-----------|---------------------|--------|-----------|
  | pass | 100 | 1.0 | Full credit |
  | partial | computed (fraction of tests passed × 100) | 0.85 | Discount partial vs clean pass — prevents farming near-misses |
  | fail | 0 | 1.0 | Clear signal |
  | compile_error | 10 | 0.6 | Weighted lower — "tried but code didn't run" is weaker signal than "ran and got wrong answer" per codex consult guidance |
  | timeout | 20 | 0.8 | Between compile_error and fail; suggests algorithm chosen but inefficient |

- **D-17:** Signal outputs `{skillSlug, rawScore, weight}` — `GapScore` integration (Phase 41) consumes this shape and feeds it into the existing 0.8-decay recency-weighted average. Phase 36 does NOT modify GapScore recompute logic.
- **D-18:** Unit tests (Vitest) cover every signalType, plus boundary cases: zero tests passed (partial=0), all tests passed (partial=100 equals pass), negative weight rejected, unknown signalType throws.

### Indexes
- **D-19:** Indexes on every FK (matches existing convention: `GapScore` has `@@index([associateId])`, `Session` has `@@index([cohortId])`). Explicit list:
  - `CodingChallenge`: `@@index([cohortId])`, `@@index([skillSlug])`, `@@index([language])`
  - `CodingAttempt`: `@@index([associateId])`, `@@index([challengeId])`, `@@index([verdict])`, `@@index([submittedAt])`
  - `CodingTestCase`: `@@index([challengeId])`, `@@index([isHidden])`
  - `CodingSkillSignal`: `@@index([skillSlug])` (attemptId already unique)

### ID Strategy
- **D-20:** `CodingChallenge.id`, `CodingAttempt.id`, `CodingTestCase.id`, `CodingSkillSignal.id` all use `String @id @default(cuid())` — matches `GapScore.id` pattern. Not autoincrement Int — easier to log/debug across services when Phase 38 Judge0 starts echoing IDs back.

### Claude's Discretion
- Exact column names (`camelCase` per Prisma convention assumed)
- Whether to split `codingSignalService.ts` tests into one file per signalType or one file total (planner picks based on total line count)
- Fixtures placement for service unit tests (`src/lib/__tests__/` vs `src/lib/codingSignalService.test.ts` — follow whatever adjacent pattern exists)

### Folded Todos
None — no matched pending todos for this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level
- `.planning/PROJECT.md` — v1.4 active section; decision log entries for separate-models-not-Session, MSA-from-day-1, Judge0 pin
- `.planning/REQUIREMENTS.md` §CODING-MODEL-01..06 — authoritative req text
- `.planning/ROADMAP.md` §Phase 36 — goal + success criteria
- `.planning/PIPELINE-DISCOVER.md` — full discovery brief (office-hours + codex consult, 2026-04-18)
- `CLAUDE.md` §Architecture — dual-write pipeline, GapScore scoring algorithm, existing service patterns

### Existing code to mirror
- `prisma/schema.prisma` — single-file convention, existing String+comment enum pattern, index conventions, cascade defaults
- `prisma/migrations/0000_baseline/migration.sql` — idempotent migration template (`IF NOT EXISTS` + DO-block FK guards) that Phase 36 migration MUST match structurally
- `src/lib/gapService.ts` — pure-function service pattern to mirror for `codingSignalService.ts`
- `src/lib/gapService.test.ts` (or adjacent) — test file layout to mirror

### Explicitly out-of-scope (do not touch in Phase 36)
- `src/lib/gapPersistence.ts` — Phase 41 integrates coding signals into persistence
- `/api/*` routes — Phase 39
- `docker-compose.yml` — Phase 38

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`prisma/schema.prisma`** (single file): add models inline at bottom. `output = "../src/generated/prisma"` generator config stays as-is.
- **Idempotent migration pattern:** `0000_baseline/migration.sql` is the canonical template — every new table guarded with `IF NOT EXISTS`, every FK guarded with DO-block existence check. Phase 36 migration must follow this exactly (NOT plain Prisma-generated migrate-dev output) because production DB predates Prisma migrations.
- **`src/lib/gapService.ts` pattern:** pure functions, no Prisma import, decay-weighted math, accompanying `.test.ts` — this is the exact shape `codingSignalService.ts` should take.
- **Zod validation alongside String "enum" columns:** `Session.mode` / `Session.readinessRecomputeStatus` show the convention — column is `String`, runtime check uses Zod where the write happens.

### Established Patterns
- **ID types are mixed:** `Associate.id` is Int autoincrement, `GapScore.id` is cuid String, `Session.id` is free-form String. New v1.4 models use cuid String (decided above) — avoids autoincrement collisions with future Judge0 callbacks that echo IDs.
- **Cascade behavior:** `GapScore` → `Associate` uses Cascade (scrub on user delete). `Session` → `Cohort` uses SetNull (sessions outlive cohort delete). Phase 36 mirrors this: user-scoped children cascade, cohort-scoped refs set-null.
- **Indexes on every FK + query-common columns:** explicit `@@index` on cohortId, associateId, status-type enums. Phase 36 follows same.

### Integration Points
- `src/generated/prisma/` — after `prisma generate` runs, new models export as typed client methods. Docker build already runs `prisma generate`; no workflow change.
- `prisma/migrations/` — new folder `0006_coding_challenges/migration.sql` + auto-managed `migration_lock.toml` stays untouched.
- `codingSignalService.ts` — NEW file at `src/lib/codingSignalService.ts`. No existing file named similarly. Phase 41 imports it later.

### Known Constraints
- Docker build runs `prisma migrate deploy` before `next build` (idempotent migrations are a hard requirement; non-idempotent migration breaks rebuild).
- Prisma 7.7.0 pinned; `@prisma/adapter-pg` in use; Supabase pooler in play (not relevant for migration authoring but relevant for testing against real DB).
- `prevWeightedScore` was just added to `GapScore` in v1.3 (migration `20260418000000_add_gapscore_prev_score`) — Phase 36 does NOT modify GapScore.

</code_context>

<specifics>
## Specific Ideas

- Codex consult (discovery) called out that compile_error should weight LOWER than wrong-answer failures because it indicates "didn't commit a real answer" — reflected in D-16 weight table (compile_error weight 0.6, fail weight 1.0).
- Discovery also flagged Judge0 pinned to ≥ 1.13.1 for sandbox escape advisory — not Phase 36's concern but `CodingAttempt.judge0Token` column (String, nullable until Judge0 callback) is added now so Phase 39 doesn't need another migration.

</specifics>

<deferred>
## Deferred Ideas

- **Prisma native enums** — migrating String columns to Prisma `enum` type across the schema. Would be a project-wide refactor; v1.5+ concern. Noted in seeds file if relevant.
- **Per-test signal breakdown** — currently one `CodingSkillSignal` per attempt (summary). A future "which specific skills did this attempt exercise" breakdown (e.g., "this failing test exercised recursion + hashmap") is interesting but out of scope; would need structured test metadata that Phase 37 loader could surface later.
- **CodingChallenge archival / soft delete** — `onDelete: Restrict` on attempts forces this pattern but the archive UI is future work.
- **Postgres SQL dialect** — SQL challenges in v1.4 use SQLite (Phase 42). Real Postgres is v1.5+ per PROJECT.md.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 36-data-model-schema*
*Context gathered: 2026-04-18*
