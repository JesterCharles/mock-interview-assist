---
phase: 39-execution-api
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/lib/judge0Verdict.ts
  - src/lib/rateLimitService.ts
  - src/app/api/coding/submit/route.ts
  - src/lib/codingAttemptPoll.ts
  - src/app/api/coding/attempts/[id]/route.ts
  - src/lib/codingApiErrors.ts
  - src/app/api/coding/challenges/route.ts
  - src/app/api/coding/submit/route.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 39: Code Review Report

**Status:** issues_found

## Summary

Phase 39 hits the locked contracts: D-01 (trainer→403), D-03 (no `wait=true`, verified via grep and Test 12), D-05 hidden-test shield (Zod `.strict()` on response + filename path test sentinels), WR-02 (`z.string().max(100_000)`), Judge0 async-only client. Rate-limit UTC midnight logic is correct; Retry-After picks the earliest of hour/day windows as required. Error envelope is consistent across all three routes after Plan 03 refactor.

Three warnings worth fixing before Phase 40 consumes these endpoints: a D-11 contract violation (signal writeback is awaited, not fire-and-forget), a stale-attempt footgun in submit, and a per-check disk write in the rate limiter.

## Warnings

### WR-01: Signal writeback awaits — violates D-11 fire-and-forget contract

**File:** `src/lib/codingAttemptPoll.ts:323`
**Issue:** D-11 locks `CodingSkillSignal` write as fire-and-forget ("do NOT block the poll response"). Comment on L309 says "Fire-and-forget signal writeback (non-blocking)" but L323 is `await prisma.codingSkillSignal.upsert(...)`. A slow DB on signal write now delays the polling client's verdict delivery. Also means any signal-table RLS/FK issue bubbles into poll latency.
**Fix:** Drop the `await` and attach a `.catch` handler, or wrap in `void (async () => {...})()`:
```ts
void prisma.codingSkillSignal.upsert({ where: { attemptId }, create: {...}, update: {} })
  .catch((err) => console.error('[codingAttemptPoll] signal writeback failed for', attemptId, err));
```

### WR-02: Orphaned-pending attempts when token persistence fails

**File:** `src/app/api/coding/submit/route.ts:183-191`
**Issue:** If Judge0 submit succeeds but the subsequent `codingAttempt.update({data: {judge0Token}})` fails (L185), the attempt row stays `verdict='pending'` with `judge0Token: null`. `pollAndMaybeResolveAttempt` short-circuits on null token (codingAttemptPoll.ts:220-223) and returns pending forever. User sees the submit succeed but poll never resolves, and the Judge0 results are unrecoverable (tokens lost).
**Fix:** Treat token persistence as fatal — roll back the attempt (same path as Judge0 failure) and return 503, or move the token write into the create call so it's atomic:
```ts
// Option A: atomic create — submit Judge0 first, then create with tokens in one write
// Option B: on update failure, delete attempt + return 503 INTERNAL
```

### WR-03: checkCodingSubmitRateLimit persists on every call (read-only violation)

**File:** `src/lib/rateLimitService.ts:235-239`
**Issue:** `rolloverBucket` always returns a new object (`let next = {...bucket}` at L201 unconditionally spreads), so `rolled !== bucket` at L236 is ALWAYS true. Every check — even when no hour/day window expired — triggers a `setCodingBucket` → full-file read + write. Comment at L234 claims "but do not persist — check is read-only". Contradicts intent; multiplies file I/O; widens the read/modify/write race window between check and increment (non-atomic file store inherited from existing module).
**Fix:** Compare bucket *fields* instead of reference identity:
```ts
const changed =
  rolled.hourlyWindowStart !== bucket.hourlyWindowStart ||
  rolled.dailyWindowStart !== bucket.dailyWindowStart;
if (changed) { setCodingBucket(userKey, rolled); bucket = rolled; }
```

## Info

### IN-01: Duplicate findUnique reads in attempts/[id] route

**File:** `src/app/api/coding/attempts/[id]/route.ts:71-80, 103-106` + `codingAttemptPoll.ts:194`
**Issue:** The route loads the attempt for authz (L71), delegates to `pollAndMaybeResolveAttempt` (which loads again, L194), then re-reads for fresh `completedAt` (L103). Three DB round-trips per poll — at recommended 500ms-5s polling cadence this doubles DB load.
**Fix:** Pass the authz-loaded row into the helper, or have the helper return the fresh timestamps in `PollResult`.

### IN-02: `unknown` fallback for skillSlug silently swallows broken FK

**File:** `src/lib/codingAttemptPoll.ts:311`
**Issue:** `const skillSlug = attempt.challenge?.skillSlug ?? 'unknown';` — if the challenge relation is null (FK broken or challenge deleted), a `CodingSkillSignal` row gets written with `skillSlug: 'unknown'`, contaminating gap-score data in Phase 41.
**Fix:** If `attempt.challenge` is null, skip signal writeback and log. Never invent a skillSlug.

### IN-03: `where` type cast in challenges route bypasses Prisma typing

**File:** `src/app/api/coding/challenges/route.ts:113-118`
**Issue:** Complex conditional-type cast for the `where` clause. Fragile — future Prisma schema changes won't trip the type check.
**Fix:** Import `Prisma.CodingChallengeWhereInput` and type the `where` variable directly. Drops the cast entirely.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
