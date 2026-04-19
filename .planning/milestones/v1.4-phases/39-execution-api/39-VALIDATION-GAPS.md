# Phase 39 Validation Gaps

**Audited:** 2026-04-18
**Suite before fills:** 798 passing, 4 skipped
**Suite after fills:** 827 passing, 4 skipped (+17 structural-contract tests; +others re-counted by runner)

## Requirement coverage map

| Req | Nature | Automated coverage | Status |
|-----|--------|--------------------|--------|
| CODING-API-01 | Auth-gated async submit, no `wait=true` | `src/app/api/coding/submit/route.test.ts` Tests 1, 12; behavioral + structural grep via `scripts/__tests__/codingApiContract.test.ts` | GREEN |
| CODING-API-02 | Hidden-test server injection, no leak | submit Test 14 (leak probe), attempts Tests 7/11/12, contract test for `stdin`/`expectedStdout` absence + `loadHiddenTests` call site | GREEN |
| CODING-API-03 | Language allowlist rejection | submit Tests 8, 9 (`LANGUAGE_NOT_SUPPORTED`) | GREEN |
| CODING-API-04 | Per-user rate limit + env override | `src/lib/rateLimitService.test.ts` (9 cases: hourly, daily, env overrides, bucket isolation, retry-after); submit Test 10, 16 | GREEN |
| CODING-API-05 | Poll returns verdict + visible + hidden aggregate only | attempts Tests 6 (pending), 7 (resolved shape), 8 (Zod shield trip), 12 (strict aggregate); contract test on `.strict()` + `hiddenTestResults: z.object` | GREEN |
| CODING-API-06 | Cohort + curriculum + cursor pagination | challenges Tests 1–20 (auth, trainer scope, cohort/curriculum narrowing, filters, pagination, item shape, status) | GREEN |
| CODING-API-07 | Verdict normalization 1–14 → canonical | `src/lib/judge0Verdict.test.ts` (status 1–14, MLE heuristic, snapshot); `codingAttemptPoll.test.ts` priority rollup; contract test on shared envelope | GREEN |

## Trivial fill added

**`scripts/__tests__/codingApiContract.test.ts`** (17 tests, all pass) — encodes the grep-based truths from each plan's `<verification>` block as automated assertions so regressions are caught by `npm run test`. Covers:

- No `wait: true` / `wait=true` in any coding route or judge0 helper (5 files)
- `loadHiddenTests` import + call site present in submit route
- `getCallerIdentity` wired in submit route
- Zod `.strict()` output shield present in attempts poll route
- `hiddenTestResults` schema is an object (aggregate), never an array
- `stdin` / `expectedStdout` never appear as response-body keys in attempts route
- No inline `NextResponse.json({ error: ...})` envelope across the 3 coding routes
- `codingApiError` is the shared envelope source across the 3 routes

Command: `npx vitest run scripts/__tests__/codingApiContract.test.ts`

## Non-trivial gaps (manual-only — cannot be filled in this audit)

### End-to-end pipeline against live Judge0
All submit/poll tests mock `judge0Client`. True E2E coverage (submit → Judge0 runs → poll resolves → signal writeback) requires a running Judge0 container + seeded challenge. This is covered by the Phase 38 JUDGE-06 manual spike and will be re-exercised during Phase 43 deployment smoke. No behavioral gap in Phase 39 scope — the contract with `judge0Client` is fully unit-tested at each boundary.

### Rate-limit file persistence under concurrency
`rateLimitService.ts` writes `data/rate-limits.json`. Current tests exercise single-process fake-timer scenarios. Multi-writer race (two Node workers submitting simultaneously) is not covered. v1.4 runs single-container Docker so no current issue; Phase 44 hardening / v1.5 Redis upgrade path tracks this.

### Cursor pagination stability under concurrent inserts
`challenges` route uses `(createdAt DESC, id DESC)` cursor. Tests mock Prisma and do not cover an in-flight `createCodingChallenge` landing between page 1 and page 2 of a real caller. Low risk in v1.4 (challenges are seeded, not user-generated); revisit if challenge bank grows beyond a static import.

## Files for commit

- `scripts/__tests__/codingApiContract.test.ts` (new, 17 tests)
- `.planning/phases/39-execution-api/39-VALIDATION-GAPS.md` (this file)
