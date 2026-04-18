---
phase: 41-gapscore-integration
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/gapPersistence.ts
  - src/lib/codingAttemptPoll.ts
  - src/app/api/trainer/[slug]/coding/route.ts
  - src/app/trainer/(dashboard)/[slug]/CodingPanel.tsx
  - src/app/trainer/(dashboard)/[slug]/CodingAttemptsTable.tsx
  - src/app/trainer/(dashboard)/[slug]/CodingSkillBars.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 41: Code Review Report

**Depth:** standard
**Status:** issues_found

## Summary

GapScore integration is structurally sound. Difficulty multipliers (0.7/1.0/1.3) are locked as a frozen constant with defensive `undefined` guards. Fire-and-forget wiring in `codingAttemptPoll.ts:353-374` correctly uses `void` + `.catch()` and does not await the gap write, preserving the P39 WR-01 fix. The trainer route uses explicit field whitelisting (no spread) so hidden-test fixture data cannot leak (D-05 preserved). Transactions around the upsert close the lost-update window. Two P2 warnings below worth addressing.

## Warnings

### WR-01: Trainer route returns 401, not 403, for non-trainer callers

**File:** `src/app/api/trainer/[slug]/coding/route.ts:37-39`
**Issue:** Focus brief (and HTTP semantics) call for 403 when an authenticated associate hits a trainer-only endpoint. Current code returns 401 for both anonymous and authenticated-but-unauthorized callers, which conflates "not signed in" with "forbidden." This also diverges from sibling `/api/trainer/[slug]/route.ts` semantics if that route distinguishes them.
**Fix:**
```ts
if (caller.kind === 'anonymous') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### WR-02: `sessionCount` semantics diverge between interview and coding paths

**File:** `src/lib/gapPersistence.ts:263,272`
**Issue:** `persistCodingSignalToGapScore` increments `sessionCount` by 1 per coding attempt, but `saveGapScores` writes `sessionCount` as the count of distinct interview sessions feeding the skill (gapService line 179). The trainer route at `route.ts:104` then weights by `sessionCount` in the aggregate — an associate with many coding attempts on one skill will dominate the aggregate unfairly vs. interview-heavy skills. Also, `weightedScore` here is a single raw signal (not decay-averaged), so the field's meaning diverges from the interview rows on the same table.
**Fix:** Either rename for clarity (e.g., store coding rows under a dedicated marker and compute aggregate differently) or pass coding rows through `gapService.computeGapScores` extension so `weightedScore` carries the same "recency-decayed average" meaning. At minimum, document the dual semantic in the function header and in `route.ts:99-107` aggregation math.

## Info

### IN-01: Aggregation math uses sessionCount as weight — vulnerable to coding-attempt farming it's supposed to prevent

**File:** `src/app/api/trainer/[slug]/coding/route.ts:104-106`
**Issue:** `weightedSum += weightedScore * sessionCount` lets an associate's attempt volume inflate the skill average. Difficulty multipliers prevent easy-score farming, but attempt-count farming is reintroduced here. Consider simple mean across topics per skill, or cap contribution per topic.

### IN-02: Malformed `challenge.difficulty` silently coerces to 'medium'

**File:** `src/app/api/trainer/[slug]/coding/route.ts:25-29`
**Issue:** `validDifficulty()` defaults unknowns to `'medium'`. Since the DB enum should constrain this, a fallback hides data corruption. Log a warning when coercion fires.

### IN-03: `'unknown'` skillSlug fallback writes garbage GapScore row

**File:** `src/lib/codingAttemptPoll.ts:323`
**Issue:** If `attempt.challenge` is null at line 323 but truthy at 353 (shouldn't happen but not proven), `skillSlug='unknown'` flows into the signal but the gap write is guarded. The `challenge` existence check on line 353 is correct; this is belt-and-suspenders — assert non-null once and reuse.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
