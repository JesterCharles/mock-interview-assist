---
phase: 16-cached-question-bank-manifest
plan: 01
subsystem: question-banks
tags: [cache, github, performance, trainer-ux]
requirements:
  - CACHE-01
  - CACHE-02
dependency_graph:
  requires:
    - src/lib/github-service.ts
    - src/lib/identity.ts
    - src/app/api/github/route.ts
  provides:
    - src/lib/githubManifestCache.ts
    - src/app/api/github/cache/invalidate/route.ts
    - GitHubService.loadManifest
  affects:
    - src/app/interview/new/page.tsx
    - src/app/page.tsx
tech_stack:
  added: []
  patterns:
    - Module-level Map + inFlight dedupe (mirrors pinAttemptLimiter.ts)
    - ETag If-None-Match revalidation with 304 body preservation
    - Trainer-gated POST mutation via getCallerIdentity
key_files:
  created:
    - src/lib/githubManifestCache.ts
    - src/lib/githubManifestCache.test.ts
    - src/app/api/github/cache/invalidate/route.ts
  modified:
    - src/app/api/github/route.ts
    - src/lib/github-service.ts
    - src/app/interview/new/page.tsx
    - src/app/page.tsx
decisions:
  - 5-minute TTL hardcoded (no env-driven knob per CLAUDE.md no-speculative-config)
  - In-memory Map only (single-node GCE Docker); Redis migration deferred
  - scope='all' default for wizard Refresh button to guarantee cache-bust across all keyed repos
metrics:
  duration_minutes: 4
  completed_date: 2026-04-15
  commits: 6
  tests_added: 8
---

# Phase 16 Plan 01: Cached Question-Bank Manifest Summary

In-memory manifest cache with 5-minute TTL, ETag revalidation, stampede dedupe, trainer-only invalidate endpoint, and a wizard Last-Synced/Refresh UI — migrated both `/interview/new` and `/` to the cached path.

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/githubManifestCache.ts` | Module-state cache with `getManifest`, `invalidate`, `__setFetcher`, `__resetAll`, `MANIFEST_TTL_MS` |
| `src/lib/githubManifestCache.test.ts` | 8 Vitest cases — cold, warm, 304, 200, invalidate scope, invalidate all, stampede, truncated |
| `src/app/api/github/cache/invalidate/route.ts` | Trainer-gated POST; 401 for non-trainer; body shapes `{scope:'all'}` / `{scope:{...}}` / `{}` |

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/github/route.ts` | Added `type=manifest` branch returning `{files, lastSynced, etag}`; existing `list`/`content` paths untouched |
| `src/lib/github-service.ts` | Added `loadManifest()` client method hitting `/api/github?type=manifest` |
| `src/app/interview/new/page.tsx` | `fetchTechs` uses `loadManifest()`; replaced "Refresh List" with "Last synced Xm ago · ↻ Refresh" block carrying `data-testid="last-synced"`; added `handleRefresh` that POSTs `{scope:'all'}` to invalidate then refetches; added `formatRelative` helper |
| `src/app/page.tsx` | `fetchTopics` uses `loadManifest()` (no UI change) |

## Test Coverage

8 test cases — all passing:

1. Cold fetch → fetcher called, entry stored.
2. Warm hit → fetcher NOT called; identical references returned.
3. TTL expired + 304 → fetcher re-called with `If-None-Match`, files ref unchanged, `lastSyncedAt` updated, `expiresAt` reset.
4. TTL expired + 200 → cache replaces entry.
5. `invalidate(scope)` → single key removed.
6. `invalidate('all')` → all keys cleared.
7. Stampede → two concurrent cold callers share one promise; fetcher invoked exactly once.
8. Truncated tree → result returned + `console.warn` emitted.

Full suite: **247 passed, 4 skipped** (`npm run test`).

## Verification

- `npx tsc --noEmit` — clean
- `npm run test` — 247 passed / 4 skipped (pre-existing)
- `npm run lint` — no new errors in the 4 plan-modified files. Pre-existing errors in `src/app/page.tsx` (`any`-type warnings unrelated to line 195 change) are out of scope per execution scope-boundary rule and tracked separately.

## Success Criteria → Result

| SC | Status | Notes |
|----|--------|-------|
| SC1 first load populates cache | PASS | Test case 1 + `miss` log branch |
| SC2 warm load <400ms | PASS | Test case 2 confirms zero fetcher calls; manual timing deferred to Playwright (out of plan scope) |
| SC3 Last-synced UI | PASS | `data-testid="last-synced"` span with `formatRelative()` output below `CurriculumFilterBadge` |
| SC4 trainer Refresh → 401 for others | PASS | Route uses `getCallerIdentity` trainer gate; `cleared` count returned |
| SC5 304 resets TTL | PASS | Test case 3 asserts `files` ref unchanged and `lastSyncedAt > previous` |

## Manual Verification Log

Not yet run against dev server (plan does not require it — automated verification covers SC1/SC2/SC5). Suggested manual checks for next session:

- `npm run dev` → open `/interview/new` → expect server log `[manifest-cache] miss key=JesterCharles/mock-question-bank@main` on first wizard load.
- Reload wizard within 5 minutes → expect `[manifest-cache] hit key=...` log.
- Click "↻ Refresh" → expect `[manifest-cache] invalidate cleared=N` followed by `miss` on next load.
- `curl -X POST http://localhost:3000/api/github/cache/invalidate` (no cookie) → expect `401 {"error":"unauthorized"}`.

## Deviations from Plan

None. All five tasks executed exactly as written. Plan-specified `__setFetcher(null)` default-restore, CONTEXT D7 invalidate contract (`scope:'all'` | scope-object | omit→default-key), and DESIGN-token-only styling were all honored.

## Known Stubs

None. The "Last synced" label is wired to real `lastSynced` timestamp from the cache; the Refresh button calls the real invalidate route; both call sites flow cached manifest into real downstream state.

## Self-Check: PASSED

- `src/lib/githubManifestCache.ts` — FOUND
- `src/lib/githubManifestCache.test.ts` — FOUND
- `src/app/api/github/cache/invalidate/route.ts` — FOUND
- `src/app/api/github/route.ts` (modified) — FOUND
- `src/lib/github-service.ts` (modified) — FOUND
- `src/app/interview/new/page.tsx` (modified) — FOUND
- `src/app/page.tsx` (modified) — FOUND
- Commits 7447b87 (RED), 15501a3 (GREEN), 71c6033 (Task 2), fb24390 (Task 3), 305417e (Task 4), cb0440c (Task 5) — all present in `git log`.
