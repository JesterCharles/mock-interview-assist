---
phase: 04-gap-service
plan: 02
subsystem: gap-scoring-algorithm
tags: [tdd, gap-tracking, recency-weighted-average, pure-functions]
dependency_graph:
  requires: [04-01]
  provides: [recencyWeightedAverage, extractScore, extractSkillTopicScores, computeGapScores, GapScoreInput]
  affects: [src/lib/gapService.ts]
tech_stack:
  added: []
  patterns: [0.8-decay-factor, two-level-skill-topic-aggregation, per-session-averaging, score-range-validation]
key_files:
  created: [src/lib/gapService.ts, src/lib/__tests__/gapService.test.ts]
  modified: []
decisions:
  - "Scores outside 0-100 range filtered in both recencyWeightedAverage and extractScore (T-04-03 mitigation)"
  - "Per-session averaging: multiple questions per skill in one session are averaged before cross-session weighting"
  - "Keywords normalized via trim().toLowerCase() for topic deduplication"
metrics:
  duration: ~3min
  completed: "2026-04-14T00:05:00Z"
  tasks: 2/2
  files_changed: 2
---

# Phase 04 Plan 02: Recency-Weighted Gap Scoring Algorithm Summary

TDD implementation of the gap scoring algorithm with 0.8 decay factor, two-level skill/topic tracking, and score range validation -- 24 tests covering all edge cases, pure functions with zero DB dependencies.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (RED) | Write failing tests for gap scoring functions | 4c2a254 | src/lib/__tests__/gapService.test.ts, src/lib/gapService.ts (stubs) |
| 2 (GREEN) | Implement gap scoring algorithm | 2a5ef93 | src/lib/gapService.ts |

## What Was Built

### recencyWeightedAverage (src/lib/gapService.ts)
- Applies 0.8^index decay: index 0 = 1.0, index 1 = 0.8, index 2 = 0.64, etc.
- Filters scores outside 0-100 range before computing (T-04-03 threat mitigation)
- Returns 0 for empty array or all-invalid inputs

### extractScore (src/lib/gapService.ts)
- Priority: finalScore > llmScore
- Returns null for didNotGetTo=true, missing scores, or out-of-range scores
- Guards against tampered score data entering gap calculations

### extractSkillTopicScores (src/lib/gapService.ts)
- Parses single session into Map<skill, Map<topic, scores[]>>
- Uses techMap to resolve weekNumber to skill name
- Excludes starter questions (id prefix "starter-") and didNotGetTo questions
- Normalizes keywords: trim + lowercase ("React Hooks" -> "react hooks")
- Skill-level aggregate uses topic key ""

### computeGapScores (src/lib/gapService.ts)
- Multi-session aggregation: each session contributes one average score per skill/topic
- Per-session averages fed to recencyWeightedAverage for cross-session decay
- Returns GapScoreInput[] ready for Prisma upsert (no DB calls in this module)

### Test Coverage (src/lib/__tests__/gapService.test.ts)
- 24 tests across 4 describe blocks
- recencyWeightedAverage: empty, single, two-score, three-score, out-of-range filtering
- extractScore: finalScore priority, llmScore fallback, didNotGetTo, missing scores, range validation
- extractSkillTopicScores: skill/topic mapping, starter exclusion, didNotGetTo exclusion, keyword normalization, missing techMap, multi-question aggregation
- computeGapScores: empty sessions, single session, multi-session decay, multi-skill, per-session averaging, three-session decay

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed node_modules in worktree**
- **Found during:** Task 1 (RED)
- **Issue:** Worktree had no node_modules, vitest could not run
- **Fix:** Ran `npm install` to restore dependencies
- **Files modified:** none committed (node_modules is gitignored)

**2. [Rule 2 - Missing critical functionality] Added score range validation**
- **Found during:** Task 2 (GREEN)
- **Issue:** T-04-03 threat model requires scores validated in 0-100 range
- **Fix:** Added isValidScore guard in both recencyWeightedAverage and extractScore; added 2 tests for range validation
- **Files modified:** src/lib/gapService.ts, src/lib/__tests__/gapService.test.ts

## Verification Results

- `npx vitest run src/lib/__tests__/gapService.test.ts` -- 24/24 PASSED
- `grep -c "prisma\|@prisma" src/lib/gapService.ts` -- 0 matches (no DB imports)
- `wc -l src/lib/gapService.ts` -- 185 lines (min: 80)
- `wc -l src/lib/__tests__/gapService.test.ts` -- 562 lines (min: 100)

## Known Stubs

None -- all functions are fully implemented with no placeholder logic.

## Self-Check: PASSED

All artifacts verified: src/lib/gapService.ts, src/lib/__tests__/gapService.test.ts, commits 4c2a254 and 2a5ef93, 04-02-SUMMARY.md.
