---
phase: 37-challenge-bank-contract-loader
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/coding-bank-schemas.ts
  - src/lib/coding-challenge-service.ts
  - src/app/api/coding/bank/refresh/route.ts
  - prisma/migrations/0007_challenge_testcase_unique/migration.sql
  - src/test-utils/server-only-shim.ts
  - docs/coding-bank-schema.md
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 37: Code Review Report

**Status:** issues_found
**Depth:** standard

## Summary

Hidden-test boundary (D-05) is correctly enforced: `FullChallenge` omits `hiddenTests`, and `loadHiddenTests` uses a dedicated `api.github.com` call with `GITHUB_CODING_PRIVATE_TOKEN`, bypassing `/api/github`. Zod schemas cover the 5-step pipeline. The trainer auth gate and migration idempotency are correct. One runtime-blocking bug and several hardening gaps below.

## Critical Issues

### CR-01: Server-side relative fetch to `/api/github` will throw

**File:** `src/lib/coding-challenge-service.ts:82-83`
**Issue:** `coding-challenge-service.ts` declares `import 'server-only'` and is invoked from the server route handler `/api/coding/bank/refresh`. `defaultPublicFetcher` calls `fetch(\`/api/github?path=...\`)` with a relative URL. Undici/Node `fetch` requires absolute URLs on the server and will throw `TypeError: Failed to parse URL`. The existing `github-service.ts` mirror uses the same pattern but is browser-invoked. As written, every public-content fetch from `listChallenges`/`loadChallenge`/`syncChallengeToDb` (and therefore the whole refresh route) will fail on the first call.
**Fix:** Call GitHub directly server-side (same pattern as the private fetcher but with `GITHUB_TOKEN` + `GITHUB_CODING_PUBLIC_REPO`), or prefix with an absolute base (e.g., `process.env.NEXT_PUBLIC_SITE_URL` / request origin). Preferred: drop the proxy hop for the server-only path since the token is already server-scoped.

## Warnings

### WR-01: `MetaSchema` accepts unknown keys

**File:** `src/lib/coding-bank-schemas.ts:47-57`
**Issue:** `MetaSchema` is not `.strict()` while `StarterSchema` is. Authors can add arbitrary fields to `meta.json` that silently pass validation, and any future typo (`cohortID` vs `cohortId`) becomes a silent bug.
**Fix:** Add `.strict()` to `MetaSchema`. Also apply to `ManifestSchema` entries (`coding-challenge-service.ts:250`).

### WR-02: No size/count caps on bank payloads

**File:** `src/lib/coding-challenge-service.ts:79-117`, `coding-bank-schemas.ts:97-103`
**Issue:** Neither fetcher enforces a max response size, and `VisibleTestsSchema`/`HiddenTestsSchema` have no `.max()` on array length or per-field string length. A malformed or malicious bank file could allocate unbounded memory in the Node process (DoS on the refresh route; trainer-only but still reachable). `README.md` and starter files are also unbounded.
**Fix:** Add `.max()` to test-case arrays (e.g., 200), stdin/expectedStdout (e.g., 64 KB), `readme` length cap post-fetch, and reject responses with `content-length` over a threshold (e.g., 1 MB/file).

### WR-03: ETag short-circuit never engages for public path

**File:** `src/lib/coding-challenge-service.ts:79-90`
**Issue:** Header comment on line 81 acknowledges the `/api/github` proxy does not forward `If-None-Match`, so the public cache is TTL-only despite the "ETag short-circuit" design goal (D-11, CODING-BANK-04). This defeats the 5000/hr quota protection called out in CONTEXT `<code_context>`. Coupled with CR-01, fixing by direct GitHub calls also fixes this.
**Fix:** When the public path is moved to direct GitHub calls (see CR-01), forward `If-None-Match` and handle 304 the same way the private fetcher does.

## Info

### IN-01: Duplicate in-schema id/order check then re-check in `validateChallenge`

**File:** `src/lib/coding-bank-schemas.ts:70-95` and `161-226`
**Issue:** `testArrayRefinement` already enforces unique ids and contiguous `orderIndex` inside the Zod schema. `validateChallenge` then re-runs `assertDistinct` (step 3) on the same arrays. Redundant work and two code paths that can drift. The contiguous-`orderIndex` rule also breaks authors who delete a middle test case — arguably too strict; "strictly monotonic, distinct" is sufficient unless downstream code indexes by position.
**Fix:** Keep refinement in the schema only; delete `assertDistinct` from `validateChallenge`. Consider relaxing `orderIndex === idx` to "strictly increasing."

### IN-02: Unused `skipped` counter; dead `void CODING_LANGUAGES`

**File:** `src/app/api/coding/bank/refresh/route.ts:102,148`, `src/lib/coding-challenge-service.ts:527`
**Issue:** `const skipped = 0` is never incremented yet returned in the response — misleading API contract. `void CODING_LANGUAGES;` is a stale lint-silencer (the symbol is referenced via types).
**Fix:** Either drop `skipped` from the response or increment it when `syncChallengeToDb` is a no-op (ETag 304 + no DB delta). Remove the `void` statement.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
