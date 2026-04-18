---
phase: 39-execution-api
plan: 02
subsystem: coding-execution-api
tags: [poll, verdict-rollup, hidden-test-shield, signal-writeback]
requires:
  - CODING-API-05
  - CODING-API-07
provides:
  - "codingAttemptPoll helper: aggregate + verdict rollup + idempotent persistence + fire-and-forget signal"
  - "GET /api/coding/attempts/[id] with Zod output shield"
affects:
  - src/lib/codingAttemptPoll.ts
  - src/app/api/coding/attempts/[id]/route.ts
tech-added: []
key-files:
  created:
    - src/lib/codingAttemptPoll.ts
    - src/lib/codingAttemptPoll.test.ts
    - src/app/api/coding/attempts/[id]/route.ts
    - src/app/api/coding/attempts/[id]/route.test.ts
decisions:
  - "Verdict priority: compile_error > mle > timeout > runtime_error > fail > pass (per D-10)"
  - "Hidden test results persisted as {caseId, passed, durationMs} only — no stdin/expected even server-side"
  - "Race-safe update via where: {id, verdict:'pending'} — second poll to resolve gets P2025, treated as 'another worker won'"
  - "CodingSkillSignal upsert uses attemptId unique key — idempotent across repeat polls"
  - "Zod .strict() output schema on route is shield-in-depth — any shape regression = 500 INTERNAL"
completed: 2026-04-18
---

# Phase 39 Plan 02: Poll Helper + GET /api/coding/attempts/[id] Summary

**One-liner:** Helper that aggregates Judge0 per-test submissions, rolls up canonical verdict via priority, computes weighted score server-side, persists idempotently, and fires non-blocking CodingSkillSignal writeback — exposed behind a Zod-strict GET route that never leaks hidden test fixtures.

## Verdict priority order (committed)

```
compile_error (6) > mle (5) > timeout (4) > runtime_error (3) > fail (2) > pass (1)
```

If any test case in the perCase array has a higher-priority verdict, that wins the roll-up. Empty perCase → pending.

## Signal type derivation table

| Final verdict  | Condition                    | signalType      |
|----------------|------------------------------|-----------------|
| pass           | (always)                     | pass            |
| compile_error  | (always)                     | compile_error   |
| timeout        | (always)                     | timeout         |
| fail           | any per-case passed          | partial         |
| fail           | zero per-case passed         | fail            |
| runtime_error  | any per-case passed          | partial         |
| runtime_error  | zero per-case passed         | fail            |
| mle            | any per-case passed          | partial         |
| mle            | zero per-case passed         | fail            |

For `partial`, `testsPassed` and `totalTests` are forwarded to `mapSignalToScore` which computes `(passed/total)*100`.

## Zod output schema (hidden-test shield)

Enforced in `src/app/api/coding/attempts/[id]/route.ts` before `NextResponse.json`:

```typescript
AttemptResponseSchema = z.object({
  attemptId: z.string(),
  verdict: z.enum(['pending','pass','fail','timeout','mle','runtime_error','compile_error']),
  score: z.number().min(0).max(100).nullable(),
  visibleTestResults: z.array(z.object({caseId, passed, stdout, durationMs}).strict()),
  hiddenTestResults: z.object({passed: z.number().int().min(0), total: z.number().int().min(0)}).strict(),
  submittedAt: z.string(),
  completedAt: z.string().nullable(),
}).strict();
```

Any regression that adds a key to `hiddenTestResults` (e.g., `stdin`, `expectedStdout`) will fail parse → 500 INTERNAL with audit log. Shield verified by Test 8.

## Idempotency mechanisms

1. **Attempt update race-safe:** `prisma.codingAttempt.update({ where: { id, verdict: 'pending' }, ... })` — second concurrent poll sees P2025 (Prisma "record not found matching where"), caught, re-reads persisted state, returns it.
2. **Signal upsert unique key:** `CodingSkillSignal.attemptId @unique`. `upsert({ where: { attemptId }, create: {...}, update: {} })` means duplicate calls are no-ops.
3. **Short-circuit:** `pollAndMaybeResolveAttempt` returns persisted state immediately when `attempt.verdict !== 'pending'` — no Judge0 calls, no DB writes.

## Deviations from Plan

None structurally. One test-fixture adjustment:

**1. [Rule 1 - Bug] Test uses `vi.resetAllMocks()` not `clearAllMocks()`**
- **Issue:** `vi.clearAllMocks()` resets call history but NOT `mockResolvedValueOnce` queue. Tests using once-queues had leaked setup from prior tests.
- **Fix:** Switched to `vi.resetAllMocks()` in beforeEach. Applied to test file only.
- **Commit:** 09d6af1

## Self-Check: PASSED

- `src/lib/codingAttemptPoll.ts` — 250 lines — exists
- `src/lib/codingAttemptPoll.test.ts` — 430 lines — exists
- `src/app/api/coding/attempts/[id]/route.ts` — 130 lines — exists
- `src/app/api/coding/attempts/[id]/route.test.ts` — 269 lines — exists
- Commits 09d6af1 and 7f1ae94 present on main
- 38 tests passing (26 poll helper + 12 GET route)
