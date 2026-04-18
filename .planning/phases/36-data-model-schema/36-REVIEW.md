---
phase: 36-data-model-schema
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - prisma/schema.prisma
  - prisma/migrations/0006_coding_challenges/migration.sql
  - src/lib/codingSignalService.ts
  - src/lib/__tests__/codingSignalService.test.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 36: Code Review Report

**Depth:** standard
**Status:** issues_found (2 warnings, 2 info — no P0/P1)

## Summary

Schema, migration, and signal service match CONTEXT decisions D-01 through D-20. Migration is structurally idempotent (CREATE IF NOT EXISTS + DO-block FK guards mirroring 0000_baseline). Cascades match D-08/09/10/11/12. Signal service is pure, throws on invalid input as designed, and tests cover every signalType plus boundary cases (zero, full, negative, missing, unknown, empty/whitespace slug). No PII columns added, no secrets, no overpermissive access (access control is Phase 39 API-layer concern per D-04).

## Warnings (P2)

### WR-01: Missing `exceedsTotal` rejection in test for `testsPassed > totalTests` with equal-zero handled, but negative `testsPassed` with positive `totalTests` not explicitly double-tested against the `non-negative` branch before division

**File:** `src/lib/codingSignalService.ts:79-88`
**Issue:** Logic is correct, but `testsPassed = 0, totalTests = 0` hits the `totalTests === 0` branch before the `testsPassed > totalTests` branch — fine as written. Minor: `testsPassed > totalTests` check runs after division-zero guard, so ordering is safe. No actual bug; flagging for reviewer awareness that guard order is load-bearing. Add an inline comment documenting the ordering intent.
**Fix:** Add `// guard order matters: zero-check before ratio check` above line 82.

### WR-02: `CodingAttempt.submittedCode` has no length cap at schema or service layer

**File:** `prisma/schema.prisma:174`
**Issue:** `submittedCode String` accepts unbounded text. A malicious/accidental 100MB paste would bloat the DB and slow Judge0 payloads. Phase 39 will own request validation, but a DB-level CHECK constraint or Prisma `@db.VarChar(N)` would be defense-in-depth.
**Fix:** Defer to Phase 39 Zod (documented out-of-scope). Track as a Phase 39 note: enforce `z.string().max(100_000)` on attempt submit route.

## Info (P3)

### IN-01: `description` column name is semantically misleading

**File:** `prisma/schema.prisma:155`
**Issue:** `CodingChallenge.description` stores a markdown **path** (e.g. `"challenges/two-sum/README.md"`), not the description text. Future maintainers will assume it holds rendered content.
**Fix:** Rename to `descriptionPath` in a future migration, or add explicit `// path, not content` comment (comment already present but easy to miss). Not worth a rename migration now.

### IN-02: No test asserts `SignalOutput.rawScore` is bounded to `[0, 100]`

**File:** `src/lib/__tests__/codingSignalService.test.ts`
**Issue:** Tests cover each signalType's expected value but no invariant test asserts "rawScore is always between 0 and 100 for any valid input." Given all paths produce values in range, this is cosmetic.
**Fix:** Optional property-based test: `fc.assert(fc.property(..., (input) => out.rawScore >= 0 && out.rawScore <= 100))`. Skip unless adding fast-check as a dep.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
