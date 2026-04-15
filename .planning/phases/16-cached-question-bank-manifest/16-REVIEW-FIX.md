---
phase: 16-cached-question-bank-manifest
fixed_at: 2026-04-15T17:10:30Z
review_path: .planning/phases/16-cached-question-bank-manifest/16-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-04-15T17:10:30Z
**Source review:** `.planning/phases/16-cached-question-bank-manifest/16-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (1 HIGH, 3 MEDIUM)
- Fixed: 4
- Skipped: 0
- LOW/INFO deferred per user instruction.

Final health stack after all fixes:
- `npx tsc --noEmit` → clean (exit 0)
- `npm run test` → 254 passed / 4 skipped (pre-existing)
- Targeted suites: cache 8/8, invalidate route 7/7 (2 new CSRF cases)

## Fixed Issues

### HI-01: Invalidate-during-in-flight race resurrects stale data

**Files modified:** `src/lib/githubManifestCache.ts`
**Commit:** 6cc37dc
**Applied fix:** Added module-level `generation` counter bumped on every `invalidate()` call. In-flight fetches capture `startGen = generation` at start of their promise body; before mutating the 304 entry or writing the 200 entry back to `store`, they compare `startGen !== generation` and discard the write (returning the fresh data to the in-flight caller, but not resurrecting cache state). `__resetAll()` resets generation to 0 for test isolation.

### ME-01: POST /api/github/cache/invalidate has no CSRF protection

**Files modified:** `src/app/api/github/cache/invalidate/route.ts`, `src/app/api/github/cache/invalidate/route.test.ts`
**Commit:** b2adfe5
**Applied fix:** Added Origin/Host defense-in-depth check at top of POST handler (before identity lookup). If `Origin` header is present and its parsed host does not match the `Host` header, return 403 `{error:'cross-origin'}`. Cookie is already `SameSite=strict` (verified in `src/app/api/auth/route.ts:52`), so this is belt-and-suspenders against subdomain attackers and future SameSite relaxation. Added 2 new test cases: cross-origin 403 path and same-origin 200 path.

### ME-02: Wizard Refresh uses `scope: 'all'` — broader than needed

**Files modified:** `src/app/interview/new/page.tsx`
**Commit:** 51522dc (combined with ME-03 — same handler, single commit)
**Applied fix:** Changed `body: JSON.stringify({ scope: 'all' })` to `body: '{}'`. Empty body hits the endpoint's default-key branch (invalidates only `JesterCharles/mock-question-bank@main`). Behaviorally identical today (single cached key) but prevents Phase 17+ multi-repo deployments from silently widening blast radius.

### ME-03: Refresh error handling swallows the real cause

**Files modified:** `src/app/interview/new/page.tsx`
**Commit:** 51522dc (combined with ME-02)
**Applied fix:** Separated invalidate POST and `fetchTechs()` into independent error channels. Invalidate is wrapped in its own try/catch with specific error `'Failed to invalidate cache.'` and early `return` on failure. `fetchTechs()` is called after the try/finally block and relies on its own internal error handling. No more generic `'Failed to refresh manifest.'` masking specific failures.

## Skipped Issues

None — all 4 in-scope findings fixed cleanly.

## Out-of-scope LOW/INFO (not addressed)

Per user instruction ("Skip LOW/INFO unless trivial"), the following are deferred:
- LO-01: Dead `OWNER_DEFAULT`/`REPO_DEFAULT` constants with `void` silencing.
- LO-02: Pre-existing identical ternary branches in `/api/github/route.ts`.
- LO-03: `[manifest-cache] 304 without prior entry` throw leaks internal prefix to client.
- LO-04: Clumsy `(body as { scope?: unknown }).scope` casts in invalidate route.
- IN-01: Cache not cluster-safe (documented, correct for single-node GCE).
- IN-02: `loadManifest` discards returned etag (vestigial, no harm).

---

_Fixed: 2026-04-15T17:10:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
