# Phase 16 — Cached Question-Bank Manifest — CONTEXT

**Mode:** `--auto` (recommended defaults picked; review inline `[auto]` logs below)
**Goal (from ROADMAP):** Setup wizard loads cached question-bank manifest in <400ms on warm cache; trainers can force-refresh when banks update.
**Requirements:** CACHE-01, CACHE-02
**Depends on:** Nothing (independent quick win)

---

## Scope Boundary

Phase delivers an in-memory manifest cache in front of `/api/github` + a trainer-only invalidate endpoint + UI affordances (last-synced timestamp + Refresh button) in the setup wizard. Nothing else.

**Out of scope:** Redis / external cache (v1.2 explicitly rejects); caching individual markdown file bodies; background refresh; cross-container coherence.

---

## Prior Decisions Carried Forward

From PROJECT.md / v1.1 conventions:
- `/api/github` is the sole server-side GitHub proxy — `GITHUB_TOKEN` never leaves server. Cache lives behind that boundary.
- Trainer identity resolves via `getCallerIdentity` in `src/lib/identity.ts` (cookie-only, no DB).
- Single-container Docker deploy — module-level state is safe; no multi-replica coherence to solve.
- No new heavy deps (Zod/Prisma/Vitest already available).

From v1.2 out-of-scope list: "No Redis for manifest cache — in-memory `Map` sufficient for single-container deploy." **Locked.**

---

## Decisions

### D1. Cache unit = manifest only (not file bodies)
- `[auto]` Q: Cache the manifest listing only, or also individual question-bank file contents?
- **Chosen:** Manifest only — result of `findQuestionBanks('')` (array of `GitHubFile` with `sha`, `path`, `download_url`).
- **Why:** SC targets wizard warm-load (<400ms). Per-file bodies are fetched lazily inside `/interview/new` after tech selection; caching them now balloons memory without moving the target metric. File `sha` on the manifest already lets us detect per-file drift cheaply later if needed.

### D2. Cache key = `${owner}/${repo}@${branch}`
- `[auto]` Q: Key shape?
- **Chosen:** `owner/repo@branch` composite string. Owner/repo/branch currently hardcoded to `JesterCharles/mock-question-bank@main` in `src/app/api/github/route.ts`, but key structure is future-proof for per-cohort bank overrides.
- **Why:** Matches CACHE-01 "Per-repo+branch key". Cheap to compute; easy to invalidate per-scope.

### D3. TTL = 5 minutes + ETag conditional GET
- `[auto]` Q: TTL length + revalidation?
- **Chosen:** 5-minute TTL (const `MANIFEST_TTL_MS = 5 * 60_000`). On expiry, issue `If-None-Match: <cached_etag>` to GitHub Trees API. 304 → reset `expiresAt` to `now + TTL` without replacing body; 200 → replace body + ETag + reset `expiresAt`.
- **Why:** Matches REQ CACHE-01 + SC #2 + SC #5 exactly.

### D4. Storage = module-level `Map` in `src/lib/githubManifestCache.ts`
- `[auto]` Q: Class singleton vs module-level Map?
- **Chosen:** Module-level `Map<string, ManifestCacheEntry>`. No class.
- **Why:** Matches codebase convention (`rateLimitService.ts`, `historyService.ts` are module-level). Simplest thing that works in a single Node process. Keeps the cache invisible to the client.

### D5. Revalidation source = GitHub Git Trees API (recursive)
- `[auto]` Q: Current `findQuestionBanks` does recursive `contents/` walk — per-dir requests, no ETag stability. Swap to a single Trees call?
- **Chosen:** Add a single-call `fetchManifest()` path that hits `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`, filters to `*.md`, and returns the normalized `GitHubFile[]`. Store the response ETag. Keep legacy per-dir walk available for fallback until wizard migrates.
- **Why:** Trees API returns stable ETag across the full tree (matches CACHE-01's `If-None-Match` SC). Also eliminates N+1 dir fetches on cache misses → faster cold path. Legacy path kept for one release as safety net.

### D6. Stampede protection = single in-flight promise per key
- `[auto]` Q: Concurrent first-load dedupe?
- **Chosen:** Track `inFlight: Map<string, Promise<Manifest>>`. Second concurrent caller awaits the first call's promise; cleared on settle.
- **Why:** Wizard mounts fire fetch on load — two trainers opening the wizard simultaneously on a cold container shouldn't both punch GitHub. Trivial to implement, prevents reported-later pain.

### D7. API surface
- `[auto]` Q: Endpoint shape for the invalidate + for the manifest read?
- **Chosen:**
  - `GET /api/github?type=manifest` — new mode alongside existing `list`/`content`. Returns `{ files: GitHubFile[], lastSynced: string, etag: string }`. Cache-aware.
  - `POST /api/github/cache/invalidate` — trainer-only (`getCallerIdentity` → role `trainer` else 401). Body `{ scope?: "all" }` (omit → current default repo/branch). Returns `{ cleared: number }`.
- **Why:** Adds one new `type=` to existing proxy route instead of a separate path (keeps token boundary). Invalidate is its own route so trainer-only guard is colocated.

### D8. Client adoption = replace `findQuestionBanks('')` call sites
- `[auto]` Q: Touch both wizard entry (`/interview/new`) and legacy home (`/`) call sites, or only wizard?
- **Chosen:** Update both `src/app/interview/new/page.tsx` and `src/app/page.tsx` to use new `GitHubService.loadManifest()` that hits `type=manifest` and surfaces `lastSynced`. Wizard renders the "last synced" + Refresh affordance; home page uses the cache transparently but does not need the UI.
- **Why:** Both call sites use the same underlying fetch — cheaper to migrate both now than leave `/` on the slow recursive walk. UI affordances only where trainers land (wizard).

### D9. UI placement = Phase 1 of wizard, near repo selector
- `[auto]` Q: Where exactly in `/interview/new`?
- **Chosen:** Repo/branch field block on Phase 1 (Configure). Below repo selector, render small muted row: `Last synced {relative} · [↻ Refresh]`. Relative time (`2m ago`) with `title=` absolute ISO. Refresh button calls invalidate, then re-runs `loadManifest()`; button shows inline spinner while fetching; toast on success ("Manifest refreshed · {N} banks").
- **Why:** Trainers only think about manifest freshness when they're about to run an interview. Phase 1 is where they choose the repo — that's the moment.

### D10. Trainer gate on invalidate = cookie check only
- `[auto]` Q: Full `getCallerIdentity` or simple `nlm_session` presence check?
- **Chosen:** `getCallerIdentity(request)` → require `kind === 'trainer'`. Return 401 otherwise. No rate limit in Phase 16 (can add later if abused; trainers are trusted).
- **Why:** Matches the existing middleware pattern — no new auth primitive. Associates never see the Refresh button (wizard is trainer-only), but defense-in-depth on the endpoint is cheap.

### D11. Observability = lightweight counters
- `[auto]` Q: Logging / metrics?
- **Chosen:** `console.log('[manifest-cache] <event> key=<key> age=<ms>')` for events: `hit`, `miss`, `revalidate-304`, `revalidate-200`, `invalidate`, `stampede-dedup`. No Prometheus, no external telemetry.
- **Why:** Sufficient for dev-time validation of SC #1/#2. Structured enough that a future log shipper can pick it up.

### D12. Tests
- `[auto]` Q: Test strategy?
- **Chosen:** Vitest unit tests in `src/lib/githubManifestCache.test.ts` using a fake `fetchManifest` (dependency injection via module internal `__setFetcher` or constructor-style factory). Cover: cold fetch populates cache; warm read within TTL serves cached; expired TTL + 304 resets expiry without replacing body; expired TTL + 200 replaces body + ETag; invalidate clears key; in-flight dedupe (two concurrent calls → one fetch). Target: 6-8 tests.
- **Why:** Pure function surface — no DB, no Next runtime. Vitest is already the stack. Matches v1.1 testing conventions.

### D13. Config via constants, not env vars
- `[auto]` Q: Make TTL configurable via env?
- **Chosen:** `const MANIFEST_TTL_MS = 5 * 60_000;` at module top. No new env var.
- **Why:** 5 minutes is the product decision (REQ CACHE-01 wrote it). Env-configurable TTL is speculative abstraction (see CLAUDE.md "don't add configurability beyond what's asked").

---

## Non-Decisions (Claude's discretion during planning/execution)

- Exact `GitHubFile`-compatible shape returned by Trees API normalization — planner/researcher picks fields.
- Toast library already in codebase (if any) vs. simple inline banner for Refresh feedback.
- Whether to memoize `lastSynced` formatting on render or compute on each paint.

---

## Deferred Ideas (Out of Phase 16)

- **Per-file body cache with SHA invalidation** — Only worth doing if question-bank growth makes lazy file fetches a pain point. Revisit after Phase 22 (Analytics) loads.
- **Cross-container coherence (Redis/pub-sub)** — Blocked on future multi-replica deploy; v1.2 explicitly single-container.
- **Background refresh / cron sweep** — Deferred to v1.3 (OPS-02 covers readiness sweep; manifest sweep could piggyback).
- **Per-cohort bank override** — Key shape already supports it (D2), but wiring is out of scope here.

---

## Canonical Refs

- `src/app/api/github/route.ts` — existing proxy; extend with `type=manifest`
- `src/lib/github-service.ts` — client wrapper; add `loadManifest()`
- `src/app/interview/new/page.tsx:135` — wizard call site; migrate + add UI
- `src/app/page.tsx:195` — home call site; migrate (no UI)
- `src/lib/identity.ts` — `getCallerIdentity` for trainer gate
- `src/lib/rateLimitService.ts` — module-level state pattern reference
- `.planning/REQUIREMENTS.md#cache-01,cache-02` — acceptance criteria
- `.planning/ROADMAP.md` — Phase 16 SC (5 items)
- GitHub Git Trees API docs: https://docs.github.com/en/rest/git/trees (external)

---

## Success Criteria Traceability

| SC | Covered by decisions |
|----|---------------------|
| 1. First load fetches + populates cache | D5, D7, D8 |
| 2. Second load <5min TTL returns <400ms | D3, D4, D6 |
| 3. "last synced {time}" in wizard | D7, D9 |
| 4. Trainer Refresh → invalidate → next load fetches | D7, D9, D10 |
| 5. `If-None-Match` 304 resets TTL without re-download | D3, D5 |

---

## Next Step

→ `/gsd-plan-phase 16` to produce PLAN.md.
