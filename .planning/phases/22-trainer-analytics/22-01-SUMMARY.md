---
phase: 22-trainer-analytics
plan: "01"
subsystem: data-layer
tags: [analytics, types, parser, persistence, tdd]
dependency_graph:
  requires: []
  provides: [ParsedQuestion.topic, computeAiTrainerVariance, analytics-response-types]
  affects: [markdownParser, sessionPersistence, trainer-types]
tech_stack:
  added: []
  patterns: [tdd-red-green, exported-pure-function, optional-frontmatter-extraction]
key_files:
  created:
    - src/lib/__tests__/markdownParser-topic.test.ts
    - src/lib/__tests__/aiTrainerVariance.test.ts
  modified:
    - src/lib/types.ts
    - src/lib/markdownParser.ts
    - src/lib/sessionPersistence.ts
    - src/lib/trainer-types.ts
decisions:
  - aiTrainerVariance computed at session save (denormalized), not per page view
  - topic falls back to keywords[0] when **Topic:** frontmatter absent
  - analytics types defined as pure TS interfaces (no runtime cost)
metrics:
  duration_seconds: 107
  completed_date: "2026-04-16"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
  files_created: 2
---

# Phase 22 Plan 01: Data Foundation for Trainer Analytics Summary

**One-liner:** Topic frontmatter extraction on ParsedQuestion, denormalized aiTrainerVariance on Session save, and six analytics API response types unblocking Wave 2 plans.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add topic to ParsedQuestion + markdownParser | abb41db | types.ts, markdownParser.ts, markdownParser-topic.test.ts |
| 2 | Compute and write aiTrainerVariance | 9b81f55 | sessionPersistence.ts, aiTrainerVariance.test.ts |
| 3 | Define analytics response types | d3cb7e5 | trainer-types.ts |

## What Was Built

- `ParsedQuestion.topic?: string` — optional field in types.ts
- `markdownParser.ts` extracts `**Topic:** …` frontmatter from question blocks; falls back to `keywords[0]` when absent, empty string when both absent
- `computeAiTrainerVariance()` — exported pure function computing average (finalScore − llmScore) delta; returns null when no scored pairs exist
- `aiTrainerVariance` written to both `create` and `update` blocks of `prisma.session.upsert`
- Six analytics response types in trainer-types.ts: `KpiData`, `SparklinePoint`, `RosterSparklineData`, `GapAnalysisRow`, `GapDrillThroughRow`, `CalibrationData`, `CohortTrendPoint`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run test` — 413 passed, 4 skipped (all existing + 8 new tests)
- `npx tsc --noEmit` — clean (no output)
- `grep -q "topic" src/lib/types.ts` — passes
- `grep -q "topicMatch" src/lib/markdownParser.ts` — passes
- `grep -q "aiTrainerVariance" src/lib/sessionPersistence.ts` — passes
- All 6 analytics types present in trainer-types.ts

## Known Stubs

None.

## Threat Flags

None — data layer changes only, no new route handlers or user input surfaces.

## Self-Check: PASSED

- src/lib/types.ts — FOUND (topic field added)
- src/lib/markdownParser.ts — FOUND (topicMatch extraction)
- src/lib/sessionPersistence.ts — FOUND (computeAiTrainerVariance + aiTrainerVariance upsert)
- src/lib/trainer-types.ts — FOUND (KpiData, RosterSparklineData, GapAnalysisRow, CalibrationData, CohortTrendPoint)
- src/lib/__tests__/markdownParser-topic.test.ts — FOUND
- src/lib/__tests__/aiTrainerVariance.test.ts — FOUND
- Commits abb41db, 9b81f55, d3cb7e5 — verified in git log
