# Phase 36: Data Model & Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 36-data-model-schema
**Mode:** `--auto` (Claude selected recommended defaults)
**Areas discussed:** Schema organization, Enum representation, Test case storage, Attempt result storage, Cascade behavior, Migration numbering, Signal→score mapping, Indexes, ID strategy

---

## Schema Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single file (`prisma/schema.prisma`) | Add 4 models to existing single-file schema | ✓ |
| Split into domain files | `schema.prisma` + `coding.prisma` multi-file | |

**Rationale:** Project has all 8 existing models in one file. Splitting now creates tooling precedent (Prisma `prismaSchemaFolder` preview feature) not worth the churn.

---

## Enum Representation

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma `enum` types | Native Prisma enums for language/verdict/signalType | |
| String + Zod runtime validation | Match existing `Session.mode` / `readinessRecomputeStatus` pattern | ✓ |

**Rationale:** Zero existing Prisma enums. Established pattern is String column + comment + Zod at write sites. Consistent > theoretically-safer.

---

## Test Case Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Separate visible/hidden tables | Two tables enforcing security at DB level | |
| One table with `isHidden` flag; API filters | Single table, API response layer filters hidden rows | ✓ |
| Hidden cases in private repo only, not DB | No persistence, fetch at submit time | |

**Rationale:** Security boundary is API, not DB. Partial-credit math across mixed visible+hidden is simpler with one table. Private-repo seed path (Phase 37) populates the table; client responses (Phase 39) filter.

---

## Attempt Result Storage

| Option | Description | Selected |
|--------|-------------|----------|
| JSON columns on `CodingAttempt` | `visibleTestResults` + `hiddenTestResults` as Json | ✓ |
| Separate `CodingTestResult` table | Row per test result | |

**Rationale:** Spec CODING-MODEL-02 explicitly says JSON. Test result shape is append-only + never queried directly. Matches `Session.assessments Json` pattern.

---

## Cascade Behavior

| Relation | Options Considered | Selected | Rationale |
|----------|--------------------|----------|-----------|
| Attempt → Associate | Cascade / Restrict / SetNull | **Cascade** | Matches `GapScore` → Associate; user delete scrubs attempts |
| Attempt → Challenge | Cascade / Restrict / SetNull | **Restrict** | Can't delete challenge with attempts; forces archive pattern |
| TestCase → Challenge | Cascade / Restrict | **Cascade** | Challenge delete takes its cases |
| Signal → Attempt | Cascade / Restrict | **Cascade** + @unique | Signal is derived; one-per-attempt |
| Challenge → Cohort | Cascade / SetNull | **SetNull** | Matches `Session` → Cohort; challenge outlives cohort |

---

## Migration Numbering

| Option | Description | Selected |
|--------|-------------|----------|
| `0002_coding_challenges` (per spec text) | Literal spec reading | |
| `0006_coding_challenges` (next sequential) | Match current slot (0000-0005 taken) | ✓ |

**Rationale:** Spec text is stale; slot 0002 already consumed by `0002_v12_email_authuser_variance`. Deviation flagged for planner review.

---

## Signal → Score Mapping

| signalType | mappedScore | weight | Selected | Alternative |
|-----------|-------------|--------|----------|-------------|
| pass | 100 | 1.0 | ✓ | — |
| partial | computed % | 0.85 | ✓ | Weight 1.0 (rejected — could inflate readiness via near-misses) |
| fail | 0 | 1.0 | ✓ | — |
| compile_error | 10 | 0.6 | ✓ | Weight 1.0 (rejected per codex: compile_error is weaker signal than wrong-answer) |
| timeout | 20 | 0.8 | ✓ | Weight 1.0 (rejected — timeout suggests algorithm choice issue, partial signal) |

**Rationale:** Codex discovery consult specifically flagged compile_error underweighting. Partial credit prevents farming. Numbers are constants in code (tunable without migration), not env (tuning is review-gated not ops).

---

## Indexes

All FK columns indexed. Query-common columns also indexed: `verdict`, `submittedAt`, `isHidden`, `skillSlug`, `language`. Matches existing convention (`Session` / `GapScore` index patterns).

---

## ID Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| `Int @id @default(autoincrement())` | Match `Associate` | |
| `String @id @default(cuid())` | Match `GapScore` | ✓ |
| `String @id` (free-form, like `Session.id`) | Client/service supplies | |

**Rationale:** CUID strings are the newer convention in-codebase (`GapScore`, `Profile`). Safer when Judge0 callbacks echo IDs back across service boundary — autoincrement Ints collide if debug logging surfaces them in shared tooling.

---

## Claude's Discretion

Left to planner/implementer:
- Exact column casing (camelCase per Prisma default assumed)
- `codingSignalService.ts` test file structure (one file vs split by signalType — depends on line count)
- Fixtures placement within existing test conventions

---

## Deferred Ideas

- Project-wide migration to Prisma native enums (v1.5+)
- Per-test skill signals (granular breakdown, needs Phase 37 loader metadata support first)
- CodingChallenge archival UI (contract set by `onDelete: Restrict` but feature out-of-scope)
- Postgres SQL dialect support (v1.5+ per PROJECT.md Out of Scope)

---

*Generated in `--auto` mode — alternative options reflect what would have been presented interactively.*
