---
phase: 39-execution-api
plan: 03
subsystem: coding-execution-api
tags: [error-envelope, challenges-list, cohort-scope, cursor-pagination]
requires:
  - CODING-API-06
provides:
  - "codingApiError shared envelope library with 8 typed error codes"
  - "GET /api/coding/challenges with cohort+curriculum scope + cursor pagination"
affects:
  - src/lib/codingApiErrors.ts
  - src/app/api/coding/challenges/route.ts
  - src/app/api/coding/submit/route.ts (refactor)
  - src/app/api/coding/attempts/[id]/route.ts (refactor)
tech-added: []
key-files:
  created:
    - src/lib/codingApiErrors.ts
    - src/lib/codingApiErrors.test.ts
    - src/app/api/coding/challenges/route.ts
    - src/app/api/coding/challenges/route.test.ts
  modified:
    - src/app/api/coding/submit/route.ts
    - src/app/api/coding/attempts/[id]/route.ts
decisions:
  - "Error-instance details sanitized to {name, message} — stack traces never leak on wire"
  - "?limit > 100 returns 400 VALIDATION_ERROR (not clamp) — Zod max rejects explicitly"
  - "Status filter applied AFTER pagination (documented sparse-page limitation; Phase 40 UI re-requests)"
  - "Cursor pagination uses (createdAt DESC, id DESC) stable ordering"
completed: 2026-04-18
---

# Phase 39 Plan 03: Shared Error Envelope + GET /api/coding/challenges Summary

**One-liner:** Single-source error envelope library with 8 typed codes consumed across submit/attempts/challenges routes, plus the cohort+curriculum-scoped cursor-paginated challenges list endpoint.

## Error code → HTTP status table

| Code                   | HTTP | Notes                         |
|------------------------|------|-------------------------------|
| AUTH_REQUIRED          | 401  |                               |
| FORBIDDEN              | 403  |                               |
| NOT_FOUND              | 404  |                               |
| VALIDATION_ERROR       | 400  | `details: zod issues`         |
| LANGUAGE_NOT_SUPPORTED | 400  |                               |
| RATE_LIMITED           | 429  | `Retry-After` header          |
| JUDGE0_UNAVAILABLE     | 503  |                               |
| INTERNAL               | 500  | Error-instance stack stripped |

## Where-clause formula per caller kind

| Caller                                    | `where`                                                                         |
|-------------------------------------------|----------------------------------------------------------------------------------|
| Anonymous                                 | (401 — never reaches query)                                                      |
| Trainer / Admin                           | `{language?, difficulty?}` — no cohort narrowing                                 |
| Associate, `cohortId=null`                | `{cohortId: null, language?, difficulty?}`                                        |
| Associate, `cohortId=X`, no curriculum    | `{OR: [{cohortId:null}, {cohortId:X}], language?, difficulty?}`                   |
| Associate, `cohortId=X`, has curriculum   | `{OR: [{cohortId:null}, {cohortId:X}], skillSlug: {in: slugs}, language?, ...}`  |
| Associate, `cohortId=X`, `?week=N`, no matching curriculum week | `{OR: [...], skillSlug: {in: []}}` → empty result |

## Known limitation: status filter post-pagination

`?status=unstarted|attempted|passed` is evaluated in-memory AFTER the DB-level page is fetched. This means a page with `limit=20` may return fewer than 20 items when most of the page doesn't match the status filter. Phase 40 UI should re-request if page is sparse.

Reason: attempting to filter by attempt presence at the DB level requires a join that complicates cursor pagination stability. Acceptable for v1.4 — revisit if user-visible.

## Confirmation: Phase 39 ships all 7 CODING-API requirements

| Req            | Covered by     | Plan |
|----------------|----------------|------|
| CODING-API-01  | POST /submit auth gate (401/403)                   | 39-01 |
| CODING-API-02  | POST /submit language allowlist                     | 39-01 |
| CODING-API-03  | POST /submit hidden-test injection server-side      | 39-01 |
| CODING-API-04  | POST /submit rate limit (30/hr, 200/day, env-tunable) | 39-01 |
| CODING-API-05  | GET /attempts/[id] polling + Zod output shield       | 39-02 |
| CODING-API-06  | GET /challenges cohort+curriculum scope + pagination | 39-03 |
| CODING-API-07  | Verdict normalization (status 1-14 → canonical) + priority rollup | 39-01, 39-02 |

## Deviations from Plan

None. Plan 03 implementation matched the plan exactly. The refactor of submit/attempts routes migrated inline `NextResponse.json({error:{...}})` to `codingApiError(...)` calls without behavior change — all 30 prior tests still pass.

Test 14 in plan ("?limit=500 clamped to 100") was already contradicted by the plan's own Zod schema (`z.coerce.number().max(100)` rejects 500 — it doesn't clamp). Plan's `z.coerce.number().int().min(1).max(100).default(20)` rejects values > 100 with VALIDATION_ERROR, which is actually the safer behavior. Tests cover the correct rejection behavior.

## Self-Check: PASSED

- `src/lib/codingApiErrors.ts` — 55 lines — exists
- `src/lib/codingApiErrors.test.ts` — 95 lines — exists
- `src/app/api/coding/challenges/route.ts` — 188 lines — exists
- `src/app/api/coding/challenges/route.test.ts` — 311 lines — exists
- `src/app/api/coding/submit/route.ts` — refactored to use codingApiError — verified no `NextResponse.json({error:{` patterns remain
- `src/app/api/coding/attempts/[id]/route.ts` — refactored to use codingApiError — same
- Commits 81c8644 and 86fffdf present on main
- 33 tests passing (11 error lib + 22 challenges route)
