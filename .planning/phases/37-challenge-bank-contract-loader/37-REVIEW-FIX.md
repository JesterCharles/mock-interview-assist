---
phase: 37-challenge-bank-contract-loader
fixed_at: 2026-04-18T04:25:00Z
review_path: .planning/phases/37-challenge-bank-contract-loader/37-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 0
deferred: 2
status: all_fixed
---

# Phase 37: Code Review Fix Report

**Fixed at:** 2026-04-18T04:25:00Z
**Source review:** 37-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03)
- Fixed: 3 commits (CR-01 + WR-03 combined, WR-01, WR-02)
- Skipped: 0
- Deferred (out of scope, P3): IN-01, IN-02
- Test baseline: 659 passing → 680 passing (+21 tests added)

## Fixed Issues

### CR-01 + WR-03: Server-side relative fetch replaced with direct GitHub call (+ ETag short-circuit)

**Files modified:** `src/lib/coding-challenge-service.ts`, `src/lib/coding-challenge-service.test.ts`
**Commit:** `e3d77f0`
**Applied fix:** Rewrote `defaultPublicFetcher` to call `api.github.com` directly using
`GITHUB_TOKEN` + `GITHUB_CODING_PUBLIC_REPO` (same pattern as the private fetcher). Removed
dependency on the `/api/github` proxy for the server-only path. Node/undici `fetch` requires
absolute URLs server-side — the old relative `/api/github?path=...` would have thrown
`TypeError: Failed to parse URL` on the first call.

Since we now own the fetch, added `If-None-Match` header forwarding and 304 handling, which
re-engages the ETag short-circuit documented in D-11 / CODING-BANK-04. The 5000/hr GitHub
quota is now protected on the public path, matching the private-path behavior.

Tests added (4):
- calls `api.github.com` with absolute URL + `Authorization: token ...` (not `/api/github`)
- forwards `If-None-Match` on second call after TTL expiry; handles 304
- throws on missing `GITHUB_TOKEN`
- throws on missing `GITHUB_CODING_PUBLIC_REPO`

### WR-01: Strict schemas reject unknown keys

**Files modified:** `src/lib/coding-bank-schemas.ts`, `src/lib/coding-bank-schemas.test.ts`,
`src/lib/coding-challenge-service.ts`, `src/lib/coding-challenge-service.test.ts`
**Commit:** `bb89da2`
**Applied fix:** Added `.strict()` to `MetaSchema` (guards against typos like `cohortID` vs
`cohortId`) and to the `ManifestSchema` entry shape (guards against extra fields in
`manifest.json`). Both now throw `ZodError` → `ChallengeValidationError` on unknown keys.

Tests added (3):
- `MetaSchema` rejects `cohortID` typo
- `MetaSchema` rejects arbitrary extra fields
- `listChallenges` rejects manifest entry with unknown keys (with matching private fetcher
  present, so the failure is localized to the strict check, not a downstream error)

### WR-02: Size caps on bank payloads (DoS guard)

**Files modified:** `src/lib/coding-bank-schemas.ts`, `src/lib/coding-bank-schemas.test.ts`,
`src/lib/coding-challenge-service.ts`, `src/lib/coding-challenge-service.test.ts`
**Commit:** `13dfc2a`
**Applied fix:**
- `TestCaseSchema`: `stdin` and `expectedStdout` capped at 64 KB; `id` capped at 200 chars
- `VisibleTestsSchema` + `HiddenTestsSchema`: max 200 test cases per array
- `StarterSchema`: per-source cap at 50_000 chars
- `loadChallenge`: rejects README.md when length > 50_000 (exported `MAX_README_SIZE`)

Protects the trainer-only refresh route from unbounded memory allocation from malformed or
malicious bank files.

Tests added (6):
- starter source > 50_000 chars rejected
- `TestCaseSchema` rejects `stdin` > 64 KB
- `TestCaseSchema` rejects `expectedStdout` > 64 KB
- `VisibleTests`/`HiddenTests` reject arrays > 200 cases
- `VisibleTests` accepts exactly 200 cases (boundary)
- `loadChallenge` rejects oversized README with `path: 'readme'`

## Deferred (Out of Scope for This Pass)

### IN-01: Duplicate in-schema + `validateChallenge` distinctness check

**File:** `src/lib/coding-bank-schemas.ts:70-95, 161-226`
**Reason:** P3, non-blocking. Reviewer flagged as redundant work but not incorrect behavior;
can be addressed in a follow-up cleanup pass.

### IN-02: Unused `skipped` counter; dead `void CODING_LANGUAGES`

**File:** `src/app/api/coding/bank/refresh/route.ts:102,148`, `src/lib/coding-challenge-service.ts:527`
**Reason:** P3, non-blocking cosmetic. Can be folded into a future refactor.

---

_Fixed: 2026-04-18T04:25:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
