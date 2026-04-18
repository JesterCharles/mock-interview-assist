# Phase 36: Data Model & Schema - Research

**Researched:** 2026-04-18
**Domain:** Prisma 7 schema authoring + idempotent Postgres DDL + pure-function TS services
**Confidence:** HIGH

## Summary

Phase 36 is a schema-and-pure-logic phase: four new Prisma models, one hand-written idempotent migration, one pure-function TS service with unit tests. No API, no UI, no runtime integration. Context locked every design choice — research answers the HOW of the locked decisions.

Three things matter. (1) The idempotent-migration pattern already lives in `prisma/migrations/0000_baseline/migration.sql`: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` wrappers around `ALTER TABLE ADD CONSTRAINT`. Phase 36 must copy this pattern verbatim — deviations break `prisma migrate deploy` re-runs on the production database. (2) `@default(cuid())` still works in Prisma 7 but cuid v1 is deprecated upstream; the ergonomic path is `@default(cuid(2))` — however, matching `GapScore` means sticking with `cuid()` for consistency unless context says otherwise. (3) Json columns surface as `Prisma.JsonValue` at read and demand `Prisma.InputJsonValue` casts on write; the codebase already uses `as unknown as Prisma.InputJsonValue` — Phase 36 serializers should follow suit.

**Primary recommendation:** Copy the 0000_baseline idempotent SQL template structure exactly. Use `@default(cuid())` to match `GapScore`. Colocate tests under `src/lib/__tests__/` (project convention). Ship one Zod schema per String-enum column next to the service that writes it.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** All 4 models added to single `prisma/schema.prisma` file; no split into domain files.
- **D-02** Generated client output stays at `src/generated/prisma/`.
- **D-03** Enum-like columns are `String` + schema `//` comment + runtime Zod validation (NOT Prisma `enum`). Applies to: `CodingChallenge.language`, `CodingAttempt.language`, `CodingAttempt.verdict`, `CodingSkillSignal.signalType`.
- **D-04** `CodingTestCase` rows persist for both visible AND hidden cases, flagged by `isHidden bool`. "Hidden" refers to the seed path (Phase 37 loader), not runtime storage.
- **D-05** Single `CodingTestCase` table — no separate hidden-test table. Security boundary is the API layer (Phase 39), not the DB.
- **D-06** `visibleTestResults` and `hiddenTestResults` are `Json` columns on `CodingAttempt`. `hiddenTestResults` = verdict-only (`{caseId, passed, durationMs}`), enforced in service + Zod.
- **D-07** `CodingAttempt.score` is `Float` (0-100), server-computed, never trusted from client.
- **D-08..D-12** Cascade map:
  - `CodingAttempt.associateId` → `Associate.id`, onDelete: **Cascade**
  - `CodingAttempt.challengeId` → `CodingChallenge.id`, onDelete: **Restrict**
  - `CodingTestCase.challengeId` → `CodingChallenge.id`, onDelete: **Cascade**
  - `CodingSkillSignal.attemptId` → `CodingAttempt.id`, onDelete: **Cascade**, `@unique` on attemptId
  - `CodingChallenge.cohortId` → `Cohort.id`, nullable, onDelete: **SetNull**
- **D-13** Migration folder is `0006_coding_challenges` (next sequential slot). REQUIREMENTS.md says `0002` — that is stale; follow codebase reality.
- **D-14** Migration is idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, DO-block FK guards.
- **D-15** `codingSignalService.ts` at `src/lib/codingSignalService.ts`, pure functions, no DB imports.
- **D-16** Signal weight table (fixed):

  | signalType | mappedScore | weight |
  |-----------|-------------|--------|
  | pass | 100 | 1.0 |
  | partial | fraction-passed × 100 | 0.85 |
  | fail | 0 | 1.0 |
  | compile_error | 10 | 0.6 |
  | timeout | 20 | 0.8 |

- **D-17** Signal output shape: `{skillSlug, rawScore, weight}`. GapScore integration is Phase 41.
- **D-18** Vitest unit tests cover every signalType + boundaries (partial=0, partial=100, negative weight rejection, unknown signalType throw).
- **D-19** Indexes on every FK + queryable enum columns. Explicit list in D-19.
- **D-20** `String @id @default(cuid())` on all four new models.

### Claude's Discretion

- Exact column names (camelCase per Prisma convention assumed).
- Test file split: one test file total vs one per signalType. Recommend one total file (`codingSignalService.test.ts`) — mirrors `gapService.test.ts` single-file layout.
- Fixture placement: `src/lib/__tests__/codingSignalService.test.ts` (project convention — see `__tests__` directory).

### Deferred Ideas (OUT OF SCOPE)

- Prisma native `enum` type migration across the schema (v1.5+ concern).
- Per-test signal breakdown (one signal per attempt now).
- `CodingChallenge` archival / soft delete UI.
- Postgres SQL dialect (v1.4 is SQLite-only in Phase 42).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CODING-MODEL-01 | `CodingChallenge` model | §Model Definitions; §Prisma Schema Patterns |
| CODING-MODEL-02 | `CodingAttempt` model with Judge0 token + Json result columns | §Model Definitions; §Json Column Typing |
| CODING-MODEL-03 | `CodingTestCase` model with `isHidden` flag | §Model Definitions; §Cascade Rules |
| CODING-MODEL-04 | `CodingSkillSignal` model, unique on attemptId | §Model Definitions; §Index Rules |
| CODING-MODEL-05 | Idempotent `0006_coding_challenges` migration | §Idempotent Migration Pattern; §SQL Template |
| CODING-MODEL-06 | Pure-function `codingSignalService.ts` with unit tests | §Signal Service Design; §Edge Cases; §Test Harness |

## Project Constraints (from CLAUDE.md)

- **GSD-only edits:** File changes must go through a GSD command (`/gsd-execute-phase` for this phase).
- **Codex reviews everything:** No self-review. Final review goes through `codex review` + `codex adversarial-review`.
- **TDD inside tasks:** Superpowers enforces RED-GREEN-REFACTOR in worktrees.
- **Health stack (post-change):** `npx tsc --noEmit`, `npm run lint`, `npm run test` — all must pass.
- **Path alias:** `@/*` → `src/*`.
- **Design system:** Not applicable to Phase 36 (no UI) but must not modify `DESIGN.md`.
- **Prisma client import:** Existing code uses `@/generated/prisma` (e.g., `import { Prisma } from '@/generated/prisma'`). New code must match.
- **Idempotent migrations are a hard requirement** because the Docker build runs `prisma migrate deploy` before `next build`.

## Standard Stack

### Core (already installed — no new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prisma | 7.7.0 | Schema + migration CLI | Already pinned in package.json; Node 22-alpine compatible. `@default(cuid())` and `Json` type both supported. |
| @prisma/client | 7.7.0 | Runtime query builder | Already installed. Generated types land in `src/generated/prisma/`. |
| @prisma/adapter-pg | 7.7.0 | pg driver adapter | Already wired for Supabase pooler connection. No change for Phase 36. |
| zod | 4.3.6 | Runtime validation for String-enum columns + Json shape validation | Already installed; used at `src/lib/auth-server.ts`, `src/lib/settingsService.ts`, etc. |
| vitest | 4.1.4 | Unit test harness | Already installed; `test: vitest run`, `test:watch: vitest`. |

### Supporting
None needed. No library additions for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@default(cuid())` | `@default(cuid(2))` | cuid v1 is deprecated upstream (Paral Ives et al.) but Prisma's Rust port is not vulnerable; project's existing `GapScore.id` and `AuthEvent.id` use `cuid()`. Consistency wins — stay on `cuid()`. Migrating all IDs to `cuid(2)` is a v1.5 cross-cutting concern, deferred. [CITED: https://github.com/prisma/prisma/discussions/17549] |
| String-enum + Zod | Prisma native `enum` | Project has zero Prisma enums today (verified by grep). Adding one creates migration surface for future value additions. Decision locked in D-03. |
| Separate hidden-test table | Single `CodingTestCase` with `isHidden` flag | Decision locked in D-05. Partial-credit math simpler with one table; security filter is Phase 39's job. |
| `Int @id @default(autoincrement())` | `String @id @default(cuid())` | Associate/Cohort are Int autoincrement, but GapScore/AuthEvent use cuid. Judge0 callbacks (Phase 39) will echo attempt IDs — string IDs prevent collision and are easier to log. Locked in D-20. |

**Installation:** No new packages. All dependencies present.

**Version verification:** Confirmed via `package.json` grep — prisma@^7.7.0, zod@^4.3.6, vitest@^4.1.4, @prisma/client@^7.7.0. [VERIFIED: package.json grep 2026-04-18]

## Architecture Patterns

### Recommended Schema Layout (appended to existing `prisma/schema.prisma`)

```prisma
// ─────────────────────────────────────────────────────────────────────
// v1.4 Coding Challenges (Phase 36)
// ─────────────────────────────────────────────────────────────────────

model CodingChallenge {
  id          String    @id @default(cuid())
  slug        String    @unique
  title       String
  language    String    // 'python' | 'javascript' | 'typescript' | 'java' | 'sql' | 'csharp'
  difficulty  String    // 'easy' | 'medium' | 'hard' (Zod-validated at write)
  description String    // markdown path in public repo (e.g. "challenges/two-sum/README.md")
  skillSlug   String    // joins to CurriculumWeek.skillSlug
  cohortId    Int?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  cohort    Cohort?           @relation(fields: [cohortId], references: [id], onDelete: SetNull)
  attempts  CodingAttempt[]
  testCases CodingTestCase[]

  @@index([cohortId])
  @@index([skillSlug])
  @@index([language])
}

model CodingAttempt {
  id                  String    @id @default(cuid())
  associateId         Int
  challengeId         String
  submittedCode       String    // raw user code, could be large
  language            String    // same allowlist as challenge
  verdict             String    @default("pending")
                                // 'pass' | 'fail' | 'timeout' | 'mle' | 'runtime_error' | 'compile_error' | 'pending'
  visibleTestResults  Json      @default("[]")
                                // array of {caseId, passed, stdin?, stdout?, expected?, durationMs}
  hiddenTestResults   Json      @default("[]")
                                // array of verdict-only {caseId, passed, durationMs} — NEVER stdin/expected
  score               Float?    // 0-100, server-computed, null until Judge0 callback resolves
  judge0Token         String?   // nullable — filled in by Phase 39 when Judge0 returns
  submittedAt         DateTime  @default(now())
  completedAt         DateTime?

  associate  Associate           @relation(fields: [associateId], references: [id], onDelete: Cascade)
  challenge  CodingChallenge     @relation(fields: [challengeId], references: [id], onDelete: Restrict)
  signal     CodingSkillSignal?

  @@index([associateId])
  @@index([challengeId])
  @@index([verdict])
  @@index([submittedAt])
}

model CodingTestCase {
  id             String  @id @default(cuid())
  challengeId    String
  isHidden       Boolean @default(false)
  stdin          String
  expectedStdout String
  weight         Float   @default(1.0) // partial-credit multiplier
  orderIndex     Int     @default(0)

  challenge CodingChallenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)

  @@index([challengeId])
  @@index([isHidden])
}

model CodingSkillSignal {
  id          String  @id @default(cuid())
  attemptId   String  @unique
  skillSlug   String
  signalType  String  // 'pass' | 'partial' | 'fail' | 'compile_error' | 'timeout'
  weight      Float   // tunable per D-16; 1.0/0.85/1.0/0.6/0.8
  mappedScore Float   // 0-100

  attempt CodingAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)

  @@index([skillSlug])
}
```

**Also required:** Add the back-relation `codingChallenges CodingChallenge[]` to the existing `Cohort` model, and `codingAttempts CodingAttempt[]` to the existing `Associate` model. (Prisma requires reciprocal relation fields on both sides; omitting them is a `prisma generate` error.)

### Idempotent Migration Pattern (MUST mirror 0000_baseline)

Three building blocks — all three must appear verbatim in `0006_coding_challenges/migration.sql`:

**Block 1: Tables — use `CREATE TABLE IF NOT EXISTS`**
```sql
CREATE TABLE IF NOT EXISTS "CodingChallenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "cohortId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingChallenge_pkey" PRIMARY KEY ("id")
);
```

**Block 2: Indexes — use `CREATE INDEX IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS`**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "CodingChallenge_slug_key" ON "CodingChallenge"("slug");
CREATE INDEX IF NOT EXISTS "CodingChallenge_cohortId_idx" ON "CodingChallenge"("cohortId");
CREATE INDEX IF NOT EXISTS "CodingChallenge_skillSlug_idx" ON "CodingChallenge"("skillSlug");
CREATE INDEX IF NOT EXISTS "CodingChallenge_language_idx" ON "CodingChallenge"("language");
```

**Block 3: Foreign keys — wrap EACH `ALTER TABLE ADD CONSTRAINT` in a DO block**
Postgres `ALTER TABLE ADD CONSTRAINT` has **no** `IF NOT EXISTS` syntax. The project's canonical pattern (from 0000_baseline) uses the `duplicate_object` exception catch:

```sql
DO $$ BEGIN
  ALTER TABLE "CodingChallenge" ADD CONSTRAINT "CodingChallenge_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

Repeat for **every FK**: `CodingAttempt_associateId_fkey`, `CodingAttempt_challengeId_fkey`, `CodingTestCase_challengeId_fkey`, `CodingSkillSignal_attemptId_fkey`.

**Anti-patterns (do NOT use):**
- ❌ `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` — not valid Postgres syntax; will fail.
- ❌ Plain `ALTER TABLE ... ADD CONSTRAINT` without DO block — will throw `duplicate_object` on redeploy and abort the migration.
- ❌ Using `SELECT FROM pg_constraint WHERE conname = ...` guard — works but adds complexity; the `EXCEPTION WHEN duplicate_object` pattern is the codebase convention.

[VERIFIED: `prisma/migrations/0000_baseline/migration.sql` lines 87-101]

### Mixed Migration Folder Naming (numbered + timestamped)

Current folder has both `0000_baseline`, `0001_v11_cohorts`, ..., `0005_fix_rls_app_metadata` (numbered) AND `20260414180750_add_associate_pin`, `20260415000000_add_auth_event`, `20260416000000_add_profile`, `20260418000000_add_gapscore_prev_score` (timestamped).

Prisma `migrate deploy` applies migrations in **lexicographic order** by folder name. [CITED: https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations]

Verification order for the current repo:
1. `0000_baseline`
2. `0001_v11_cohorts`
3. `0002_v12_email_authuser_variance`
4. `0003_rls_policies`
5. `0004_drop_pin_columns`
6. `0005_fix_rls_app_metadata`
7. `0006_coding_challenges` ← **Phase 36 slot**
8. `20260414180750_add_associate_pin`
9. `20260415000000_add_auth_event`
10. `20260416000000_add_profile`
11. `20260418000000_add_gapscore_prev_score`

Note: `0` < `2` in ASCII, so all numbered folders apply before all timestamped folders. This is the established project behavior — **Phase 36 keeps the numbered prefix to run before existing timestamped migrations**. Using `0006_` (not a timestamp) preserves the established order. [VERIFIED: folder listing 2026-04-18]

### Prisma Schema ↔ Migration Synchronization

Question from research brief: "When hand-writing idempotent SQL that diverges from what `prisma migrate dev` would produce, how do we keep `prisma generate` / `prisma migrate deploy` happy?"

Answer: **Two separate concerns**.

1. **`prisma generate`** reads `schema.prisma` only. It has zero knowledge of migration SQL. Schema and migration SQL can diverge in style (idempotent vs non-idempotent) as long as the final DB shape matches the schema.
2. **`prisma migrate deploy`** runs each `.sql` file in lexicographic order and records applied migrations in `_prisma_migrations`. It does not validate that migrations produce exactly what the schema describes — that's the engineer's responsibility.

Workflow for Phase 36:

1. Edit `prisma/schema.prisma` — add 4 models + back-relations on `Cohort` and `Associate`.
2. Run `npx prisma generate` locally to verify the schema compiles and generates types. Inspect `src/generated/prisma/index.d.ts` for the new model types.
3. **Do NOT run `prisma migrate dev`** — its output is non-idempotent. Instead, hand-write `prisma/migrations/0006_coding_challenges/migration.sql` following the idempotent pattern from 0000_baseline.
4. No `_prisma_migrations` row needs manual insertion. `prisma migrate deploy` will record the row automatically when it first runs the new migration file. For idempotence, the SQL inside must be re-runnable — the `_prisma_migrations` row is written only on first success.
5. Test locally: spin up a throwaway Postgres container, run `prisma migrate deploy` twice — second run should no-op with zero errors.

**Why not just use `prisma migrate dev`?** Because it produces plain `CREATE TABLE` (no `IF NOT EXISTS`) and plain `ALTER TABLE ADD CONSTRAINT` (no DO-block guard). On the first `prisma migrate deploy` against the production DB, the migration would succeed. On any retry (e.g., Docker rebuild partial-run), it would throw `relation already exists`. The idempotent hand-written pattern is the only safe approach for this codebase.

[VERIFIED: Customizing migrations docs + 0000_baseline comment header]

### Json Column Typing (Prisma 7)

Prisma 7 exposes Json columns as:

- **Read side:** `Prisma.JsonValue | null` (JsonValue = `string | number | boolean | JsonObject | JsonArray | null`)
- **Write side:** `Prisma.InputJsonValue` (same union, but disallows bare `null` — use `Prisma.JsonNull` sentinel instead)

Existing codebase pattern (from `src/lib/sessionPersistence.ts`):
```typescript
import { Prisma } from '@/generated/prisma';

await prisma.session.create({
  data: {
    assessments: session.assessments as unknown as Prisma.InputJsonValue,
    techMap: session.techMap
      ? (session.techMap as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  },
});
```

**Project convention:** `as unknown as Prisma.InputJsonValue` for write, explicit Zod parse at read boundary.

For Phase 36 Json columns (`visibleTestResults`, `hiddenTestResults`):

1. Define Zod schemas for both shapes next to the service that writes attempts (Phase 39 will own this file; Phase 36 does NOT need to define the writer, only the column).
2. At read time (future phases), parse: `VisibleTestResultSchema.array().parse(attempt.visibleTestResults)` — throws on malformed data, narrows type to the Zod-inferred shape.
3. For Phase 36 specifically: schema only needs `visibleTestResults Json` and `hiddenTestResults Json`. Zod runtime validators come in Phase 39 when the write path ships.

**Performance note on large Json payloads:** Postgres stores `Json` as `jsonb` when Prisma generates `JSONB` (default for Postgres in Prisma 7). `jsonb` is parsed once on write, indexed internally, and read is fast. `hiddenTestResults` could get large with many test cases — keep it verdict-only per D-06 to cap size. No need for `GIN` indexes until Phase 39 shows query patterns that need them. [VERIFIED: 0000_baseline uses `JSONB` for Session.questions/assessments/techMap]

### CUID vs CUID2 in Prisma 7

- `@default(cuid())` — uses cuid v1. Still supported in Prisma 7. Upstream `cuid` npm package is marked deprecated, but Prisma's Rust port (`cuid2` crate internally, or cuid v1 algorithm, depends on Prisma version) is not affected by the JS vulnerability.
- `@default(cuid(2))` — uses cuid v2. Longer IDs, better collision resistance. Added in Prisma ORM 5.0+.

**Recommendation for Phase 36:** Use `@default(cuid())` to match `GapScore.id`, `AuthEvent.id`, and project precedent. Migrating all IDs to `cuid(2)` is deferred (CONTEXT deferred ideas — v1.5 concern).

[CITED: https://github.com/prisma/prisma/issues/17102 — Prisma team confirmed cuid(2) availability]
[CITED: https://github.com/prisma/prisma/discussions/17549 — project consistency discussion]

### Anti-Patterns to Avoid

- **Using `prisma migrate dev` to generate this migration** — produces non-idempotent SQL. Hand-write it.
- **Omitting back-relations on `Associate` and `Cohort`** — `prisma generate` errors out: "The relation field `X` on Model `Y` is missing an opposite relation field on Model `Z`."
- **Using `Prisma.JsonNull` for write AND `null` for read assertion** — read side is `null` (ordinary JS null) when the column is null; `Prisma.JsonNull` is only for the write side.
- **Adding a Prisma `enum` for `language` or `verdict`** — violates D-03. Uses `String` + comment + Zod.
- **Forgetting `@@unique` on `CodingSkillSignal.attemptId`** — D-11 says one signal row per attempt; without the unique constraint, double-writes create orphan rows.
- **Missing `@@index` on FK columns** — all existing models have indexes on every FK (`GapScore.associateId`, `Session.cohortId`, etc.). Omitting them will show up in codex review.
- **Writing `@default("[]")` as a Json default in the Prisma schema** — Prisma accepts JSON defaults but the SQL generator produces `DEFAULT '[]'::jsonb`. Verify this works in the hand-written SQL (it does — pattern also used for `Session.selectedWeeks` in production). If unsure, drop the default and have the service layer supply `[]` explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID generation | Custom random ID generator | `@default(cuid())` | Prisma handles collision-resistant generation; matches project convention. |
| Enum validation | Runtime string-includes check | Zod `z.enum([...])` | Project standard at `src/lib/settingsService.ts`, `src/lib/rateLimitService.ts`. |
| Migration history tracking | Manual `_prisma_migrations` insertions | `prisma migrate deploy` | Prisma auto-records; manual insertion is error-prone. |
| Json shape validation | TypeScript type assertion only | Zod parse at read boundary | TS assertions don't catch malformed data; Zod runtime-validates. |
| Idempotent DDL | Plain `CREATE TABLE` + try/catch wrapper in app code | `CREATE TABLE IF NOT EXISTS` + DO-block FK guards in SQL | Let Postgres DDL do the work; app-code try/catch leaves partial state. |

**Key insight:** Every piece of this phase has a pattern already living in the codebase. The research scope is "mirror, don't invent."

## Signal Service Design

### File Layout

```
src/lib/codingSignalService.ts                 # pure functions
src/lib/__tests__/codingSignalService.test.ts  # Vitest unit tests
```

Project convention: service logic tests live in `src/lib/__tests__/` (per `gapService.test.ts`, `readinessService.test.ts`, `adaptiveSetup.test.ts`).

### Function Signatures

```typescript
// src/lib/codingSignalService.ts
//
// Pure functions — no DB imports, no side effects.
// Maps CodingSkillSignal rows into GapScore-compatible inputs.

export type SignalType =
  | 'pass'
  | 'partial'
  | 'fail'
  | 'compile_error'
  | 'timeout';

export interface SignalInput {
  skillSlug: string;
  signalType: SignalType;
  testsPassed?: number;  // required when signalType === 'partial'
  totalTests?: number;   // required when signalType === 'partial'
}

export interface SignalOutput {
  skillSlug: string;
  rawScore: number;      // 0-100
  weight: number;        // 0.0-1.0
}

/**
 * Map a CodingSkillSignal input to a GapScore-compatible output.
 * Throws on unknown signalType or invalid partial inputs.
 */
export function mapSignalToScore(input: SignalInput): SignalOutput;

/**
 * Weight table — exported for test inspection and trainer dashboard display.
 * Tuning policy: change via code review, not env var.
 */
export const SIGNAL_WEIGHTS: Readonly<Record<SignalType, { weight: number; baseScore: number | null }>>;
```

### Weight Table (locked, D-16)

```typescript
export const SIGNAL_WEIGHTS = {
  pass:          { weight: 1.0,  baseScore: 100 },
  partial:       { weight: 0.85, baseScore: null }, // computed from testsPassed/totalTests
  fail:          { weight: 1.0,  baseScore: 0   },
  compile_error: { weight: 0.6,  baseScore: 10  },
  timeout:       { weight: 0.8,  baseScore: 20  },
} as const;
```

### Edge Cases (from `gapService.ts` pattern + D-18 requirements)

| Case | Expected Behavior | Source |
|------|------------------|--------|
| Unknown signalType string | `throw new Error(\`Unknown signalType: ${x}\`)` | D-18 |
| `partial` with `testsPassed=0, totalTests=N` | `rawScore=0, weight=0.85` (same score as fail, different weight) | D-18 |
| `partial` with `testsPassed=N, totalTests=N` | `rawScore=100, weight=0.85` (same score as pass, lower weight) | D-18 |
| `partial` with `totalTests=0` | Throw: "Cannot compute partial score with zero total tests" | §Edge-case audit |
| `partial` missing `testsPassed` or `totalTests` | Throw: "partial signal requires testsPassed and totalTests" | D-18 implicit |
| `NaN` score inputs | Throw — consistent with `gapService.isValidScore` filter but stricter for signal service | §gapService mirror |
| Negative `testsPassed` or `totalTests` | Throw: "testsPassed/totalTests must be non-negative integers" | D-18 "negative weight rejected" |
| `testsPassed > totalTests` | Throw: "testsPassed cannot exceed totalTests" | §Edge-case audit |
| `skillSlug` empty string | Throw: "skillSlug required" | §Project convention (GapScore has skill constraint) |

**Design note vs gapService:** `gapService.ts` *filters* invalid inputs (`isValidScore` returns false → score dropped) rather than throwing. That pattern fits session scoring where one bad question shouldn't nuke the whole session. For the signal service, throwing is appropriate because inputs come from a trusted server-side source (Judge0 verdict + test case count) — a malformed signal indicates a service-layer bug, not user data corruption. [VERIFIED: gapService.ts lines 23-47 show filter-not-throw; decision diverges intentionally.]

### Unit Test Shape (mirror gapService.test.ts)

Single file, describe-block per function:

```typescript
describe('mapSignalToScore', () => {
  describe('pass', () => { it('returns rawScore=100, weight=1.0', ...) });
  describe('fail', () => { it('returns rawScore=0, weight=1.0', ...) });
  describe('compile_error', () => { it('returns rawScore=10, weight=0.6', ...) });
  describe('timeout', () => { it('returns rawScore=20, weight=0.8', ...) });

  describe('partial', () => {
    it('computes fraction passed when 5/10 tests pass', ...);    // 50, 0.85
    it('returns 0 when zero tests passed', ...);                  // 0, 0.85
    it('returns 100 when all tests passed', ...);                 // 100, 0.85
    it('throws when totalTests is 0', ...);
    it('throws when testsPassed > totalTests', ...);
    it('throws when testsPassed is negative', ...);
    it('throws when testsPassed/totalTests missing', ...);
  });

  describe('invalid inputs', () => {
    it('throws on unknown signalType', ...);
    it('throws on empty skillSlug', ...);
  });
});

describe('SIGNAL_WEIGHTS', () => {
  it('exports immutable weight table', () => {
    expect(Object.isFrozen(SIGNAL_WEIGHTS)).toBe(true); // if using Object.freeze
  });
});
```

**Test count target:** ~12-15 tests. Matches `gapService.test.ts` granularity (36 tests there, but gapService is wider surface).

## Runtime State Inventory

> Phase 36 is greenfield (net-new tables, net-new service file). No rename/refactor concerns.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — all new tables | None |
| Live service config | None — no external services touched in Phase 36 | None |
| OS-registered state | None | None |
| Secrets/env vars | None added this phase; `GITHUB_CODING_PRIVATE_TOKEN` comes in Phase 37 | None |
| Build artifacts | `src/generated/prisma/` regenerates on next `prisma generate`; Docker build step does this automatically | Run `npx prisma generate` after schema edit to refresh local TypeScript |

## Common Pitfalls

### Pitfall 1: Missing back-relations
**What goes wrong:** `prisma generate` errors with "missing opposite relation field"
**Why it happens:** Prisma requires both sides of a relation to declare the field. Phase 36 adds `cohortId` on `CodingChallenge` and `associateId` on `CodingAttempt` — both existing models (`Cohort`, `Associate`) need back-relation arrays added (`codingChallenges CodingChallenge[]`, `codingAttempts CodingAttempt[]`).
**How to avoid:** After writing new models, grep every FK target model and confirm back-relations.
**Warning signs:** Error during `npx prisma generate` before any test runs.

### Pitfall 2: `ADD CONSTRAINT` without DO-block wrapper fails on retry
**What goes wrong:** First `prisma migrate deploy` succeeds; Docker rebuild re-runs migrations; second run aborts with `duplicate_object` error on the FK add.
**Why it happens:** Postgres ALTER TABLE has no `IF NOT EXISTS` for constraints — must use DO block with exception handler.
**How to avoid:** Every ALTER TABLE ADD CONSTRAINT in `migration.sql` wrapped in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` per 0000_baseline.
**Warning signs:** Migration works once, fails on container restart. Test locally by running `prisma migrate deploy` twice in a row.

### Pitfall 3: Forgetting `@@unique` on `CodingSkillSignal.attemptId`
**What goes wrong:** Double-writes from retry paths create multiple signal rows per attempt. GapScore integration (Phase 41) reads them all, inflating scores.
**Why it happens:** The @unique is semantically "one signal per attempt" — easy to omit if reading only the CODING-MODEL-04 requirement text, which says "FK (unique)" inline.
**How to avoid:** Schema has both `attemptId String @unique` AND `signal CodingSkillSignal?` on the parent (optional single-side relation).
**Warning signs:** Phase 41 tests reveal duplicate signals if the constraint isn't present.

### Pitfall 4: Using `prisma migrate dev` output as-is
**What goes wrong:** Generated SQL is non-idempotent; breaks on retry.
**Why it happens:** `migrate dev` is meant for dev databases that are freely resettable. Production needs hand-written idempotent SQL.
**How to avoid:** Write `0006_coding_challenges/migration.sql` by hand, following 0000_baseline. Never let Prisma generate the file.
**Warning signs:** Any `CREATE TABLE` without `IF NOT EXISTS` or any `ADD CONSTRAINT` without a DO wrapper.

### Pitfall 5: Json default `@default("[]")` at schema level
**What goes wrong:** Prisma 7 may emit `DEFAULT '[]'::jsonb` correctly in generated SQL, but since we're hand-writing the migration, the default must be explicitly added: `"visibleTestResults" JSONB NOT NULL DEFAULT '[]'`.
**Why it happens:** Hand-written SQL bypasses Prisma's DEFAULT generator; if the schema says `@default("[]")` but the migration doesn't emit `DEFAULT '[]'`, the column becomes NOT NULL without default — insert fails.
**How to avoid:** Either (a) drop the schema default and require the application layer to supply `[]`, or (b) add `DEFAULT '[]'` explicitly in the hand-written SQL. Recommend (b) for consistency — matches existing `Session.mode DEFAULT 'trainer-led'` pattern.
**Warning signs:** Insert of a CodingAttempt without explicit `visibleTestResults` fails with NOT NULL violation.

### Pitfall 6: Signal service edge case divergence from gapService
**What goes wrong:** Engineer copies `gapService.isValidScore` filter-not-throw pattern into signal service; invalid inputs silently drop instead of surfacing bugs.
**Why it happens:** Both are pure-function services — pattern looks similar.
**How to avoid:** Signal service throws on bad inputs (server-side trust boundary); gapService filters (user data). Document this in the service's leading comment block.
**Warning signs:** Test expectation of "throws on X" passes silently because the function returns `null`.

### Pitfall 7: Mixed-format migration folder sort order drift
**What goes wrong:** Someone adds a new migration with a timestamp prefix (e.g., `20260420000000_x`) before anyone realizes Phase 36 used `0006_`. Lexicographic sort puts `0006_` before `2026...`, which is correct — but if someone "fixes" by renaming `0006_` to `20260418000001_coding_challenges`, the recorded `_prisma_migrations` row breaks.
**Why it happens:** Two naming conventions in the same folder create confusion about the "right" format.
**How to avoid:** Stick with `0006_` for Phase 36 (sequential slot, project convention for post-baseline migrations). Any future rename requires updating `_prisma_migrations.migration_name` column.
**Warning signs:** PR that renames an existing migration folder.

## Code Examples

### Example 1: Idempotent table + index + FK (full pattern)

```sql
-- prisma/migrations/0006_coding_challenges/migration.sql
--
-- Phase 36 — v1.4 Coding Challenges data model.
-- Idempotent (IF NOT EXISTS + DO-block FK guards) so prisma migrate deploy
-- is safe to re-run. Mirrors 0000_baseline pattern.

-- CreateTable: CodingChallenge
CREATE TABLE IF NOT EXISTS "CodingChallenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "cohortId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingChallenge_pkey" PRIMARY KEY ("id")
);

-- (... other 3 CREATE TABLE blocks ...)

-- CreateIndex: CodingChallenge
CREATE UNIQUE INDEX IF NOT EXISTS "CodingChallenge_slug_key" ON "CodingChallenge"("slug");
CREATE INDEX IF NOT EXISTS "CodingChallenge_cohortId_idx" ON "CodingChallenge"("cohortId");
CREATE INDEX IF NOT EXISTS "CodingChallenge_skillSlug_idx" ON "CodingChallenge"("skillSlug");
CREATE INDEX IF NOT EXISTS "CodingChallenge_language_idx" ON "CodingChallenge"("language");

-- (... other index blocks ...)

-- AddForeignKey (DO-block guarded)
DO $$ BEGIN
  ALTER TABLE "CodingChallenge" ADD CONSTRAINT "CodingChallenge_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CodingAttempt" ADD CONSTRAINT "CodingAttempt_associateId_fkey"
    FOREIGN KEY ("associateId") REFERENCES "Associate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CodingAttempt" ADD CONSTRAINT "CodingAttempt_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "CodingChallenge"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CodingTestCase" ADD CONSTRAINT "CodingTestCase_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "CodingChallenge"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CodingSkillSignal" ADD CONSTRAINT "CodingSkillSignal_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "CodingAttempt"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

Source: `prisma/migrations/0000_baseline/migration.sql` — exact template to mirror.

### Example 2: Pure function with Zod-validated input

```typescript
// src/lib/codingSignalService.ts
import { z } from 'zod';

const SignalTypeSchema = z.enum([
  'pass', 'partial', 'fail', 'compile_error', 'timeout',
]);
export type SignalType = z.infer<typeof SignalTypeSchema>;

export const SIGNAL_WEIGHTS = Object.freeze({
  pass:          { weight: 1.0,  baseScore: 100 as number | null },
  partial:       { weight: 0.85, baseScore: null as number | null },
  fail:          { weight: 1.0,  baseScore: 0 as number | null   },
  compile_error: { weight: 0.6,  baseScore: 10 as number | null  },
  timeout:       { weight: 0.8,  baseScore: 20 as number | null  },
} as const);

export interface SignalInput {
  skillSlug: string;
  signalType: SignalType;
  testsPassed?: number;
  totalTests?: number;
}

export interface SignalOutput {
  skillSlug: string;
  rawScore: number;
  weight: number;
}

export function mapSignalToScore(input: SignalInput): SignalOutput {
  if (!input.skillSlug || input.skillSlug.trim() === '') {
    throw new Error('skillSlug required');
  }
  const parsedType = SignalTypeSchema.safeParse(input.signalType);
  if (!parsedType.success) {
    throw new Error(`Unknown signalType: ${input.signalType}`);
  }
  const config = SIGNAL_WEIGHTS[parsedType.data];

  let rawScore: number;
  if (parsedType.data === 'partial') {
    const { testsPassed, totalTests } = input;
    if (testsPassed === undefined || totalTests === undefined) {
      throw new Error('partial signal requires testsPassed and totalTests');
    }
    if (totalTests === 0) {
      throw new Error('Cannot compute partial score with zero total tests');
    }
    if (testsPassed < 0 || totalTests < 0) {
      throw new Error('testsPassed/totalTests must be non-negative');
    }
    if (testsPassed > totalTests) {
      throw new Error('testsPassed cannot exceed totalTests');
    }
    rawScore = (testsPassed / totalTests) * 100;
  } else {
    // Non-partial types have a fixed baseScore
    rawScore = config.baseScore!;
  }

  return {
    skillSlug: input.skillSlug,
    rawScore,
    weight: config.weight,
  };
}
```

Source: synthesized from D-16 (weight table) + project Zod convention (`src/lib/auth-server.ts`) + gapService.ts pure-function shape.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| cuid v1 `@default(cuid())` | cuid v2 `@default(cuid(2))` | Prisma ORM 5.0+ (~2024) | Longer IDs (~24 → ~24+ chars), stronger collision resistance. Phase 36 stays on v1 for consistency with existing GapScore/AuthEvent. Migration to cuid(2) is a v1.5 concern. |
| Prisma native `enum` columns | String + comment + Zod | Project decision (v1.2+) | Runtime flexibility to add enum values without migrations. Trade: lose DB-level validation. Project accepts this. |
| `wait=true` Judge0 synchronous submit | Async submit + poll | Judge0 docs explicitly discourage | Not Phase 36 — noted for Phase 39. |
| `prisma migrate dev` output for prod | Hand-written idempotent SQL | Project decision (0000_baseline) | Safe re-run on production DB. Required for Docker build idempotence. |

**Deprecated/outdated:**
- `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` syntax — not valid Postgres anywhere in the version range; must use DO block.
- Mixing Prisma's `prisma migrate dev` output with hand-written SQL in the same folder — causes drift and retry failures.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Json default `DEFAULT '[]'::jsonb` works cleanly in Postgres without explicit cast issues | §Architecture Patterns (Pitfall 5) | Low — widely supported. Worst case: move default to app layer. |
| A2 | Back-relations need to be added to `Associate` and `Cohort` models | §Recommended Schema Layout | HIGH if wrong — `prisma generate` errors immediately; caught by first local run. |
| A3 | Prisma 7 still supports `@default(cuid())` without deprecation warning | §Alternatives Considered | Low — confirmed via Prisma discussions; no removal planned. |
| A4 | Lexicographic migration ordering places `0006_` before all existing `2026*` folders | §Mixed Migration Folder Naming | Low — ASCII collation puts `0` < `2`, verified by manual listing. |
| A5 | Throwing (not filtering) on bad signal inputs is correct for service boundary | §Signal Service Design | Medium — diverges from gapService pattern. Recommend codex review validates this choice. |
| A6 | `judge0Token` column added in Phase 36 avoids a Phase 39 migration | CONTEXT D-specifics | Low — adding a nullable column in the future is also a single-line idempotent migration. Zero harm from adding it early. |

## Open Questions

1. **Should `CodingAttempt.score` default to `null` (pending) or `0` (stub)?**
   - What we know: D-07 says "server-computed, never trusted from client" and implies pending until Judge0 resolves.
   - What's unclear: `Float?` nullable vs `Float @default(0)`.
   - Recommendation: Nullable `Float?` — matches `Session.overallTechnicalScore` pattern. Null = not-yet-computed; 0 is a legitimate computed score.

2. **Should the Zod `SignalTypeSchema` be exported from the service or defined inline?**
   - Recommendation: Export it. Phase 39 API routes will need it for request validation. Exporting now avoids duplication.

3. **Does the Prisma 7 `@default("[]")` JSON literal emit `DEFAULT '[]'` in generated migrate-dev SQL?**
   - Not directly relevant — we're hand-writing the SQL. Planner should write `DEFAULT '[]'` explicitly in the migration regardless of what schema says. No blocker.

## Environment Availability

> This phase is entirely code/config. External dependencies used at test time only.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Prisma 7, Vitest | ✓ | 24.2 local / 22-alpine Docker | — |
| npm | Package install/scripts | ✓ | bundled with Node | — |
| Postgres (local or remote) | Migration smoke test | ✓ (Supabase) | 15+ | Spin up local Postgres container for test |
| Vitest | Unit tests | ✓ | 4.1.4 | — |
| Prisma CLI | `prisma generate`, `prisma migrate deploy` | ✓ | 7.7.0 | — |

No missing dependencies. All work runs in the existing dev environment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` (globals, node env, excludes e2e/visual) |
| Quick run command | `npm run test -- codingSignalService` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CODING-MODEL-01 | Schema compiles — `CodingChallenge` model exists with all required fields | build | `npx prisma validate && npx prisma generate` | ❌ Wave 0 |
| CODING-MODEL-02 | Schema compiles — `CodingAttempt` with Judge0 token + JSON result columns | build | `npx prisma validate && npx prisma generate` | ❌ Wave 0 |
| CODING-MODEL-03 | Schema compiles — `CodingTestCase` with `isHidden` boolean | build | `npx prisma validate && npx prisma generate` | ❌ Wave 0 |
| CODING-MODEL-04 | Schema compiles — `CodingSkillSignal` with unique `attemptId` | build | `npx prisma validate && npx prisma generate` | ❌ Wave 0 |
| CODING-MODEL-05 | Migration is idempotent (re-run succeeds) | smoke | Manual script: `createdb test_mig && DATABASE_URL=... npx prisma migrate deploy && npx prisma migrate deploy` (second run must no-op) | ❌ Wave 0 |
| CODING-MODEL-05 | Generated client exports new model types | build | `npx tsc --noEmit` with `import { CodingAttempt } from '@/generated/prisma'` usage | ✅ existing |
| CODING-MODEL-06 | `mapSignalToScore('pass')` returns `{rawScore: 100, weight: 1.0}` | unit | `npm run test -- codingSignalService.test.ts -t "pass"` | ❌ Wave 0 |
| CODING-MODEL-06 | `mapSignalToScore('fail')` returns `{rawScore: 0, weight: 1.0}` | unit | `npm run test -- codingSignalService.test.ts -t "fail"` | ❌ Wave 0 |
| CODING-MODEL-06 | `mapSignalToScore('compile_error')` returns `{rawScore: 10, weight: 0.6}` | unit | `npm run test -- codingSignalService.test.ts -t "compile_error"` | ❌ Wave 0 |
| CODING-MODEL-06 | `mapSignalToScore('timeout')` returns `{rawScore: 20, weight: 0.8}` | unit | `npm run test -- codingSignalService.test.ts -t "timeout"` | ❌ Wave 0 |
| CODING-MODEL-06 | `partial` with 5/10 → rawScore=50, weight=0.85 | unit | `npm run test -- codingSignalService.test.ts -t "partial"` | ❌ Wave 0 |
| CODING-MODEL-06 | `partial` boundary: 0/N → 0; N/N → 100 | unit | same | ❌ Wave 0 |
| CODING-MODEL-06 | Unknown signalType throws | unit | same | ❌ Wave 0 |
| CODING-MODEL-06 | Negative/invalid partial inputs throw | unit | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- codingSignalService` (fast, ~200ms)
- **Per wave merge:** `npx prisma validate && npx prisma generate && npm run test && npx tsc --noEmit`
- **Phase gate:** Full suite green + local migration-deploy smoke test passes on a throwaway DB before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/codingSignalService.test.ts` — covers CODING-MODEL-06 (all 5 signal types + edge cases).
- [ ] Migration smoke-test script — runnable helper to spin up ephemeral Postgres and run `prisma migrate deploy` twice. Suggested location: `scripts/verify-migration-idempotent.sh`. Not strictly required — can be manual verification in the PLAN task.
- No new framework install (Vitest already present).
- No new test fixtures needed (pure-function service, no DB stub required).

## Security Domain

> `security_enforcement` key is absent from config — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 36 adds no auth logic; existing Supabase auth unchanged |
| V3 Session Management | no | No session handling |
| V4 Access Control | partial | `isHidden` column is the storage side of a Phase 39 access-control boundary — schema must NOT constrain the service layer's ability to filter (D-05) |
| V5 Input Validation | yes | Zod schemas for String-enum columns (D-03); Zod validation of Json payloads at write-time (Phase 39 responsibility, but schema shape matters — D-06) |
| V6 Cryptography | no | No crypto in Phase 36. `judge0Token` is a passthrough ID, not secret material |
| V7 Error Handling | yes | Signal service throws on invalid inputs — errors must not leak internal details |
| V14 Configuration | partial | Migration idempotence is a configuration-management concern — single source of truth in SQL file |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hidden test data leakage via Json column read | Information Disclosure | D-06: `hiddenTestResults` stores verdict-only (no stdin/expected); API filter (Phase 39) never returns `CodingTestCase.where({isHidden: true})` in list responses |
| Duplicate signals from retry path inflating GapScore | Tampering | D-11: `@unique` on `CodingSkillSignal.attemptId` — DB rejects duplicate writes |
| Orphan signals after attempt deletion | Tampering / data integrity | D-11: `onDelete: Cascade` on signal→attempt |
| Challenge deletion with attempts pointing to it | Data integrity | D-09: `onDelete: Restrict` on attempt→challenge — must archive, not delete |
| Score tampering from client | Tampering | D-07: `score` server-computed, never accepted from client in API (Phase 39); schema level = nullable until server fills |
| Client-supplied `judge0Token` | Spoofing | Phase 39 generates server-side token; schema level = nullable String with no unique constraint (server uses Judge0's token) |
| Malformed Json submission from untrusted path | Input Validation | Phase 39 Zod-validates request body; schema level = Json type (permissive, correct) |
| RLS defense-in-depth gap | Access Control | Phase 36 adds tables NOT covered by existing RLS (Phase 20). **Flag for planner:** should RLS policies for `CodingChallenge`/`CodingAttempt`/`CodingTestCase`/`CodingSkillSignal` be added in Phase 36 or deferred to Phase 39? Project convention (RLS as defense-in-depth on all data tables) suggests adding them here, but CONTEXT does not mandate it. |

**Security action item for planner:** Decide whether RLS policies on the 4 new tables are in Phase 36 or Phase 39. CONTEXT doesn't lock this. Recommendation: **defer to Phase 39** — RLS policies mirror the application's access-control model, and the model (associate sees own attempts, trainer sees all) is not settled until the API ships. Adding RLS in Phase 36 risks writing policies that don't match eventual API shape.

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — existing schema conventions, single-file layout, String+comment enums, index conventions [VERIFIED]
- `prisma/migrations/0000_baseline/migration.sql` — canonical idempotent migration template (`CREATE ... IF NOT EXISTS` + DO-block FK guards) [VERIFIED]
- `prisma/migrations/0001_v11_cohorts/migration.sql` — non-idempotent reference (what NOT to do) [VERIFIED]
- `prisma/migrations/20260416000000_add_profile/migration.sql` — mixed-prefix precedent [VERIFIED]
- `src/lib/gapService.ts` — pure-function service shape to mirror [VERIFIED]
- `src/lib/__tests__/gapService.test.ts` — Vitest test file conventions (colocation in `__tests__/`) [VERIFIED]
- `src/lib/sessionPersistence.ts` — Prisma Json column write pattern (`as unknown as Prisma.InputJsonValue`) [VERIFIED]
- `src/generated/prisma/index.d.ts` — Prisma Json type surface in generated client [VERIFIED]
- `package.json` — version pins for prisma/zod/vitest [VERIFIED]
- `vitest.config.ts` — test config, path aliases [VERIFIED]

### Secondary (MEDIUM confidence)
- [Prisma customizing migrations docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) — hand-written SQL allowed, lexicographic ordering confirmed [CITED]
- [Prisma issue #17102 — cuid2 in @default](https://github.com/prisma/prisma/issues/17102) — `cuid(2)` added in 5.0+, v1 still supported [CITED]
- [Prisma discussion #17549 — cuid vs cuid2](https://github.com/prisma/prisma/discussions/17549) — Prisma Rust port not vulnerable to JS cuid advisory [CITED]
- [ZenStack blog on Prisma Json typing](https://zenstack.dev/blog/json-typing) — runtime Zod validation at read boundary is current best practice [CITED]
- [Prisma dev/prod migration workflows](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production) — `migrate deploy` records history automatically [CITED]

### Tertiary (LOW confidence — flagged for validation)
None. All claims in this research are backed by either the codebase (HIGH) or official Prisma docs (MEDIUM).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency already installed and version-verified in package.json
- Architecture: HIGH — all patterns have concrete exemplars in the codebase (0000_baseline, gapService, sessionPersistence)
- Pitfalls: HIGH — derived from the actual migration files and Prisma's documented constraints
- Signal service design: HIGH — locked by D-16; edge cases extrapolated from D-18 and gapService parallels
- Security: MEDIUM — RLS scoping is an open question for the planner; rest is HIGH

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — Prisma 7.7.0 stable, no imminent breaking change)
