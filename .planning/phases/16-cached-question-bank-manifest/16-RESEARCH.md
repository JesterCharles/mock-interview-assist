# Phase 16: Cached Question-Bank Manifest — Research

**Researched:** 2026-04-15
**Domain:** In-memory HTTP cache + conditional GET + trainer-only invalidate endpoint (Next.js 16 App Router, Node runtime)
**Confidence:** HIGH

## Summary

Phase 16 adds an in-memory manifest cache between `/api/github` and the GitHub REST API, backed by a module-level `Map`, a 5-min TTL, and an ETag `If-None-Match` revalidation short-circuit. Trainers can force-refresh via a new `POST /api/github/cache/invalidate` endpoint, and the wizard surfaces a "last synced {relative time} · Refresh" affordance on Phase 1.

All 13 CONTEXT.md decisions are locked. Research below informs execution: GitHub Trees API request shape, ETag/304 semantics (verified), module-state persistence in Next 16 Node runtime (verified), idiomatic stampede pattern, Vitest reset pattern (already used in this codebase via `__resetAll`), and shape-compatible normalization from Trees entries → existing `GitHubFile`.

**Primary recommendation:** Implement `src/lib/githubManifestCache.ts` as a pure module with `getManifest(key)`, `invalidate(key|all)`, and a `__setFetcher`/`__reset` pair for tests — mirroring the existing `pinAttemptLimiter.ts` module-state pattern exactly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D1.** Cache unit = manifest only (not file bodies). Cache `findQuestionBanks('')` result (array of `GitHubFile`).
- **D2.** Cache key = `${owner}/${repo}@${branch}` composite string.
- **D3.** TTL = 5 minutes (`MANIFEST_TTL_MS = 5 * 60_000`) + ETag conditional GET. On expiry issue `If-None-Match: <cached_etag>`. 304 → reset `expiresAt`; 200 → replace body + ETag + reset `expiresAt`.
- **D4.** Storage = module-level `Map<string, ManifestCacheEntry>` in `src/lib/githubManifestCache.ts`. No class.
- **D5.** Revalidation source = GitHub Git Trees API (recursive) `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`. Filter `*.md`. Keep legacy per-dir walk as fallback for one release.
- **D6.** Stampede protection = single `inFlight: Map<string, Promise<Manifest>>` per key; cleared on settle.
- **D7.** API surface:
  - `GET /api/github?type=manifest` → `{ files: GitHubFile[], lastSynced: string, etag: string }`
  - `POST /api/github/cache/invalidate` → trainer-only, body `{ scope?: "all" }`, returns `{ cleared: number }`
- **D8.** Client adoption = replace `findQuestionBanks('')` call sites in both `src/app/interview/new/page.tsx` (line 135) AND `src/app/page.tsx` (line 195). Home page uses cache transparently; wizard gets UI affordances.
- **D9.** UI placement = Phase 1 of wizard, below repo selector. `Last synced {relative} · [↻ Refresh]`. `title=` holds absolute ISO. Toast on refresh success.
- **D10.** Trainer gate on invalidate = `getCallerIdentity(request)` → require `kind === 'trainer'` else 401. No rate limit.
- **D11.** Observability = `console.log('[manifest-cache] <event> key=<key> age=<ms>')` for `hit`, `miss`, `revalidate-304`, `revalidate-200`, `invalidate`, `stampede-dedup`.
- **D12.** Tests = Vitest unit tests in `src/lib/githubManifestCache.test.ts` using injected fetcher. 6-8 tests covering cold/warm/304/200/invalidate/dedupe.
- **D13.** Config via constants, no env vars.

### Claude's Discretion

- Exact `GitHubFile`-compatible shape returned by Trees API normalization — researcher/planner picks fields.
- Toast library vs inline banner for Refresh feedback.
- Whether to memoize `lastSynced` formatting on render.

### Deferred Ideas (OUT OF SCOPE)

- Per-file body cache with SHA invalidation (revisit after Phase 22).
- Cross-container coherence / Redis (blocked on multi-replica deploy).
- Background refresh / cron sweep (deferred to v1.3).
- Per-cohort bank override wiring (key shape ready, wiring deferred).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CACHE-01 | `/api/github` manifest responses cached in-memory (Map + 5-min TTL + ETag `If-None-Match` short-circuit), per-repo+branch key; wizard warm hits <400ms | Trees API ETag verified; module-level `Map` pattern matches `pinAttemptLimiter.ts`; stampede dedupe pattern is idiomatic; 304 does not count against rate limit |
| CACHE-02 | Trainer-only `/api/github/cache/invalidate` endpoint (scope: one key or all); wizard shows "last synced {time}" + Refresh button | `getCallerIdentity` pattern verified in `src/lib/identity.ts`; `react-hot-toast` already available; `Intl.RelativeTimeFormat` is native (no new dep) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No new heavy deps** — `react-hot-toast` already in `package.json` (`^2.6.0`), `Intl.RelativeTimeFormat` is native. Don't add anything else.
- **No speculative abstractions** — TTL stays a constant (D13 confirms).
- **No env-var configurability beyond what's asked** — do not expose `MANIFEST_TTL_MS` via env.
- **Trust internal code** — don't re-validate already-typed data passing between `githubManifestCache.ts` and the route handler.
- **Codex owns code review** — planner should budget for Codex review pass.
- **TDD inside worktrees** — Wave 0 must create the Vitest file before impl.
- **Use GSD workflow** — this research drives `/gsd-plan-phase 16` next.
- **Design system** — any UI work (D9) must use `DESIGN.md` tokens (`--surface`, `--ink`, `--border`, `--font-mono`, etc.). No new colors.

## Standard Stack

All dependencies already present — this phase adds **zero new packages**.

### Core (all existing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16.2.3 | App Router route handlers (`/api/github/*`) | Already the framework; Node runtime required for module-state persistence |
| TypeScript | ^5 | Strict typing on cache entry + `GitHubFile` compat | Project standard |
| Vitest | ^4.1.4 | Unit tests with `vi.useFakeTimers()` for TTL, injected fetcher | Already the test runner; `pinAttemptLimiter.test.ts` is the reference pattern |
| react-hot-toast | ^2.6.0 | Refresh success/failure toast (D9) | Already imported in `src/app/pdf/page.tsx`; confirm a `<Toaster>` mount is reachable from `/interview/new` — if not, wizard can use an inline banner (Discretion per CONTEXT) |
| lucide-react | (existing) | `RefreshCw` icon for Refresh button | Already used across wizard |

### Supporting (native / no install)
| API | Purpose | Notes |
|-----|---------|-------|
| `Intl.RelativeTimeFormat` | Format "2m ago", "1h ago" for last-synced row | Native since Node 14 / all modern browsers. No dep. |
| `global.fetch` | GitHub API call from the route handler | Native in Next 16 / Node 22 |
| `Map` + `Promise` | Cache + in-flight dedupe | Standard JS |

### Alternatives Considered
| Instead of | Could Use | Tradeoff (why rejected) |
|------------|-----------|-------------------------|
| `react-hot-toast` | Inline banner beside Refresh button | Simpler, no Toaster dependency; CONTEXT marks toast-vs-banner as Claude's discretion — pick based on whether `<Toaster>` is already mounted in the layout |
| Module-level `Map` | Next `unstable_cache` / `revalidateTag` | [VERIFIED: rejected] — less control over ETag short-circuit; `unstable_cache` is data-cache, not HTTP conditional-GET aware; single-container deploy doesn't need it |
| `date-fns` `formatDistance` | `Intl.RelativeTimeFormat` | Adds ~50KB dep for one call site; native API covers the need [VERIFIED: MDN] |
| Separate `/api/manifest` route | Extending `/api/github?type=manifest` | CONTEXT D7 locks the extension; keeps GITHUB_TOKEN boundary colocated |

**Installation:** None. Confirm versions:
```bash
npm view react-hot-toast version   # expect ^2.6.0 in package.json
npm view next version              # expect ^16.2.3
```

## Architecture Patterns

### Recommended File Structure
```
src/
├── lib/
│   ├── githubManifestCache.ts         # NEW — module-level cache + fetcher + inflight
│   ├── githubManifestCache.test.ts    # NEW — Vitest unit tests (6-8)
│   ├── github-service.ts              # MODIFIED — add loadManifest() client method
│   ├── identity.ts                    # UNCHANGED — used by invalidate route
│   └── relativeTime.ts                # OPTIONAL NEW — tiny Intl.RelativeTimeFormat helper
├── app/
│   ├── api/
│   │   └── github/
│   │       ├── route.ts               # MODIFIED — add type=manifest branch
│   │       └── cache/
│   │           └── invalidate/
│   │               └── route.ts       # NEW — POST, trainer-only
│   ├── interview/new/page.tsx         # MODIFIED — swap findQuestionBanks → loadManifest; add UI row
│   └── page.tsx                       # MODIFIED — swap findQuestionBanks → loadManifest; no UI
```

### Pattern 1: Module-level singleton with test reset
**What:** Export pure functions that close over a `Map` declared at module top. Provide `__reset()`/`__setFetcher()` test hooks.
**When to use:** Single-node, process-lifetime state. Matches existing `pinAttemptLimiter.ts` exactly.
**Example** (distilled from `src/lib/pinAttemptLimiter.ts`):
```typescript
// Source: src/lib/pinAttemptLimiter.ts (lines 1-50)
const store = new Map<string, Entry>();

export function doThing(key: string): Result { /* reads/mutates store */ }

// Test-only helper.
export function __resetAll(): void {
  store.clear();
}
```
[VERIFIED: codebase pattern]

### Pattern 2: Stampede dedupe via in-flight Promise map
**What:** Second concurrent caller awaits the first caller's Promise instead of issuing its own fetch.
**Example:**
```typescript
const inFlight = new Map<string, Promise<Manifest>>();

async function getManifest(key: string): Promise<Manifest> {
  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[manifest-cache] hit key=${key} age=${Date.now() - cached.fetchedAt}`);
    return cached.manifest;
  }

  const existing = inFlight.get(key);
  if (existing) {
    console.log(`[manifest-cache] stampede-dedup key=${key}`);
    return existing;
  }

  const promise = fetchAndStore(key).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
```
[CITED: idiomatic TS pattern; `.finally()` ensures cleanup on both resolve and reject]

### Pattern 3: Conditional GET revalidation
**What:** On TTL expiry, re-fetch with `If-None-Match: <cached.etag>`. 304 → body stays, expiry resets. 200 → body + ETag replaced, expiry resets.
**Example:**
```typescript
async function revalidate(key: string, cached: Entry): Promise<Manifest> {
  const res = await fetch(treesUrl(key), {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'If-None-Match': cached.etag,
    },
  });

  if (res.status === 304) {
    console.log(`[manifest-cache] revalidate-304 key=${key}`);
    cached.expiresAt = Date.now() + MANIFEST_TTL_MS;
    cached.fetchedAt = Date.now();          // "last synced" = last revalidation check
    return cached.manifest;
  }

  if (!res.ok) throw new Error(`GitHub ${res.status}`);

  console.log(`[manifest-cache] revalidate-200 key=${key}`);
  const body = await res.json();
  const etag = res.headers.get('etag') ?? '';
  const manifest = normalizeTrees(body, key);
  const entry: Entry = {
    manifest,
    etag,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + MANIFEST_TTL_MS,
  };
  store.set(key, entry);
  return manifest;
}
```
[VERIFIED: GitHub docs — 304 responses do NOT count against rate limit]

### Pattern 4: Trees → GitHubFile normalization
**Trees API returns:**
```json
{
  "sha": "abc…",
  "tree": [
    { "path": "react/hooks.md", "mode": "100644", "type": "blob", "sha": "def…", "size": 1234, "url": "https://api.github.com/…/blobs/def…" }
  ],
  "truncated": false
}
```

**Existing `GitHubFile` expected by consumers:** `name`, `path`, `sha`, `size`, `url`, `html_url`, `git_url`, `download_url`, `type: 'file' | 'dir'`.

**Consumer field usage audit** (what actually gets read):
| Field | Read by | Required in normalized output? |
|-------|---------|--------------------------------|
| `path` | `interview/new/page.tsx:181` (`getFileContent(techFile.path)`) | YES |
| `name` | Wizard tech list rendering, home page `fileName` toggles | YES (derive from `path` basename, strip `.md`) |
| `sha` | Not currently read by wizard; useful for future per-file cache | YES (comes free) |
| `type` | `findQuestionBanks` filter (`type === 'file'`) | YES (`blob` → `'file'`) |
| `download_url` | Not currently read by wizard (content flows through `/api/github?type=content`) | Nice-to-have — synthesize as `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` |
| `url`, `git_url`, `html_url`, `size` | Not read by any current consumer | Synthesize or set to empty string — consumers don't touch them |

**Normalization function:**
```typescript
function normalizeTrees(treesResponse, key: ParsedKey): GitHubFile[] {
  if (treesResponse.truncated) {
    console.warn('[manifest-cache] tree truncated — repo exceeds 100k entries or 7MB');
  }
  return treesResponse.tree
    .filter(e => e.type === 'blob' && e.path.endsWith('.md'))
    .map(e => ({
      name: e.path.split('/').pop()!,                   // basename (keeps .md ext — matches existing contents API output)
      path: e.path,
      sha: e.sha,
      size: e.size ?? 0,
      url: e.url ?? '',
      html_url: `https://github.com/${key.owner}/${key.repo}/blob/${key.branch}/${e.path}`,
      git_url: e.url ?? '',
      download_url: `https://raw.githubusercontent.com/${key.owner}/${key.repo}/${key.branch}/${e.path}`,
      type: 'file',
    }));
}
```
[VERIFIED: contents API returns `name` with `.md` extension, so keep it]

### Anti-Patterns to Avoid

- **Don't use `unstable_cache` / `revalidateTag`** — they're for Next's data cache, not HTTP conditional GET. Locked out by D4.
- **Don't set `cache: 'no-store'` on the fetch** — default fetch in route handlers is fine; this cache IS the caching layer.
- **Don't write to disk** — CONTEXT locked in-memory only.
- **Don't touch module state from tests without `__reset`** — causes cross-test pollution. See D12.
- **Don't parse `If-Modified-Since`** — GitHub uses ETag, not Last-Modified on trees endpoints.
- **Don't forget to delete `inFlight` on rejection** — use `.finally()`, not `.then()`.
- **Don't gate the GET route** — only the invalidate POST is trainer-only. The manifest GET is already behind `/api/github` which is effectively open (returns public repo data, hides token).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom "minutes ago" math | `Intl.RelativeTimeFormat` | Native, i18n-correct, no dep |
| Toast notifications | Custom floating div | `react-hot-toast` (already installed) or inline banner | Dep already paid for |
| Trainer role check | New helper | `getCallerIdentity(request)` from `src/lib/identity.ts` | Canonical source |
| Recursive tree walk | Loop over directory contents endpoints | GitHub Trees API `?recursive=1` | One call, stable ETag, no N+1 |
| Cache TTL bookkeeping | Timer / setInterval | Inline `Date.now() > entry.expiresAt` check on read | No leaky timers; survives container freeze |

**Key insight:** Every problem in this phase already has a native-or-already-installed solution. Net new dep count should be zero.

## Common Pitfalls

### Pitfall 1: Turbopack dev HMR wipes module state
**What goes wrong:** During `npm run dev`, Turbopack's Fast Refresh can reset module-level singletons when `githubManifestCache.ts` (or its importer) changes, making the cache appear to flake between hits and misses.
**Why it happens:** Next 16 uses Turbopack by default; HMR replaces modules and re-evaluates their top-level code.
**How to avoid:** Accept it — this is dev-only. Production `next start` (and Docker) keep module state for the lifetime of the Node process. Document in the module comment: "Module state persists for process lifetime in production; HMR may reset it in dev."
**Warning signs:** Manifest seems to re-fetch on every wizard mount in dev — check if you just edited the cache file.

### Pitfall 2: Weak ETags (`W/"abc…"`)
**What goes wrong:** Fetch's response.headers.get('etag') returns the ETag verbatim, including any `W/` prefix. Sending it back in `If-None-Match` is correct — GitHub accepts both weak and strong ETags for comparison — but string-comparing ETags across requests requires preserving the `W/` prefix.
**Why it happens:** HTTP ETag spec distinguishes weak vs strong; GitHub uses weak ETags (`W/"…"`) for some endpoints.
**How to avoid:** Store `res.headers.get('etag')` verbatim. Send it back verbatim. Don't strip quotes or `W/`.
**Warning signs:** GitHub returns 200 on every revalidation despite unchanged data.
[VERIFIED: GitHub docs + HTTP RFC 7232]

### Pitfall 3: Stampede dedupe race on rejection
**What goes wrong:** If `fetchAndStore` throws and you only delete `inFlight` in `.then()`, subsequent calls get stuck awaiting a rejected promise and never retry.
**Why it happens:** `.then()` doesn't run on rejection.
**How to avoid:** Use `.finally(() => inFlight.delete(key))`. Test this with a fetcher that throws.
**Warning signs:** First GitHub 500 permanently breaks the manifest route until container restart.

### Pitfall 4: "Truncated" tree silently drops banks
**What goes wrong:** If repo grows past 100k entries or 7MB, Trees API returns `truncated: true` and clips the tree array. You get a partial manifest with no loud error.
**Why it happens:** GitHub's recursive tree limit.
**How to avoid:** Log a warning when `truncated === true`. Current `mock-question-bank` is nowhere near this, but log so a future surprise is visible.
**Warning signs:** Some question banks disappear from wizard without errors.
[VERIFIED: GitHub docs — 100k entries / 7MB limit]

### Pitfall 5: Trainer gate on GET instead of POST
**What goes wrong:** Gating `GET /api/github?type=manifest` behind trainer auth would break the home page (`src/app/page.tsx`) which is unauthenticated.
**Why it happens:** Overreading D10.
**How to avoid:** Only `POST /api/github/cache/invalidate` is trainer-only. The manifest GET stays open (matches existing `/api/github` behavior).

### Pitfall 6: `<Toaster>` not mounted
**What goes wrong:** Calling `toast.success(…)` without `<Toaster>` in the tree silently no-ops.
**Why it happens:** `react-hot-toast` requires a `<Toaster />` somewhere in the render tree.
**How to avoid:** Grep for `<Toaster` in the wizard's layout chain. If absent, either (a) mount `<Toaster />` in the wizard page, or (b) fall back to inline banner next to the Refresh button.
**Warning signs:** Clicking Refresh works but no visual feedback appears.

### Pitfall 7: Clock-based TTL tests flake
**What goes wrong:** Tests that `await sleep(300_001)` to expire TTL are slow and flaky.
**How to avoid:** `vi.useFakeTimers()` + `vi.setSystemTime(…)` in the test. Inject a clock or just advance system time — the cache reads `Date.now()`.

## Runtime State Inventory

N/A — this is a greenfield addition, not a rename/refactor/migration phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `GITHUB_TOKEN` env var | Authenticated Trees API calls (raises rate limit from 60/hr unauth → 5000/hr auth) | Assumed yes (existing `/api/github` requires it) | — | Unauth fetch works but rate-limited; not viable for production |
| Node 22 (Docker) | `global.fetch`, `Intl.RelativeTimeFormat`, `Map`, `Promise` | ✓ | Node 22 (per Dockerfile `node:22-alpine`) | — |
| `react-hot-toast` | Refresh success feedback (D9) | ✓ | ^2.6.0 | Inline banner |
| `lucide-react` `RefreshCw` | Refresh button icon | ✓ (already used) | — | — |
| `getCallerIdentity` | Trainer gate on invalidate | ✓ (`src/lib/identity.ts`) | — | — |
| GitHub API reachability from server | ETag revalidation | ✓ (existing `/api/github` already calls out) | — | — |

**Missing with no fallback:** None.
**Missing with fallback:** Only `<Toaster>` mount — if not in tree, use inline banner.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.4 |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npx vitest run src/lib/githubManifestCache.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CACHE-01 | Cold fetch populates cache (miss → populate) | unit | `npx vitest run src/lib/githubManifestCache.test.ts -t "cold fetch"` | ❌ Wave 0 |
| CACHE-01 | Warm read within TTL returns cached without fetching | unit | `npx vitest run -t "warm hit"` | ❌ Wave 0 |
| CACHE-01 | Expired + 304 resets expiry, keeps body | unit | `npx vitest run -t "304"` | ❌ Wave 0 |
| CACHE-01 | Expired + 200 replaces body + etag | unit | `npx vitest run -t "200 revalidate"` | ❌ Wave 0 |
| CACHE-01 | Two concurrent calls on cold key → single fetcher invocation | unit | `npx vitest run -t "stampede"` | ❌ Wave 0 |
| CACHE-01 | Warm wizard load <400ms (manual, local) | manual | Browser devtools Network tab, 5 reloads within 5min | — |
| CACHE-02 | Invalidate clears single key | unit | `npx vitest run -t "invalidate single"` | ❌ Wave 0 |
| CACHE-02 | Invalidate all clears entire Map | unit | `npx vitest run -t "invalidate all"` | ❌ Wave 0 |
| CACHE-02 | POST /api/github/cache/invalidate returns 401 for non-trainer | integration (optional) | `npx vitest run src/app/api/github/cache/invalidate/route.test.ts` | ❌ Wave 0 (optional) |
| CACHE-02 | Wizard "last synced" renders + Refresh triggers invalidate + refetch | e2e-manual / playwright-cli (future) | — | — |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/githubManifestCache.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green + manual <400ms verification + manual Refresh loop before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/githubManifestCache.test.ts` — 6-8 unit tests covering D12 matrix
- [ ] (Optional) `src/app/api/github/cache/invalidate/route.test.ts` — trainer gate integration test
- [ ] No framework install — Vitest 4 already configured

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (invalidate POST) | `getCallerIdentity` → `type === 'trainer'` check |
| V3 Session Management | no (no new session state) | — |
| V4 Access Control | yes | Trainer-only guard on invalidate; GET manifest stays public like existing `/api/github` |
| V5 Input Validation | yes (minimal) | Invalidate body `{ scope?: "all" }` — single optional string enum. Use narrow typeguard, no Zod needed for one field |
| V6 Cryptography | no | — |
| V9 Communications | yes (transitively) | HTTPS to GitHub enforced by default fetch |
| V11 Business Logic | no | — |
| V12 Files | no | — |

### Known Threat Patterns for Next.js route handler + in-memory cache

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cache poisoning via crafted query string | Tampering | Cache key is server-constructed from hardcoded `owner/repo@branch` (per current `/api/github/route.ts`), not user input |
| CSRF on POST invalidate | Tampering / Spoofing | Same-origin only; trainer cookie is HttpOnly; no token leak. Low risk — invalidate is idempotent and merely causes a re-fetch. Add `SameSite=Lax` check is implicit via cookie flags |
| DoS via repeated invalidate | DoS | Trainer-only gate is sufficient; trainers are trusted. No rate limit per D10 |
| Token leak via error message | Info disclosure | Existing route handler already catches errors and returns `{ error: error.message }` — ensure we don't leak `Authorization: Bearer …` in thrown strings |
| Unauthenticated cache write via 200 response forgery | Tampering | Not applicable — GitHub API is HTTPS, response is trusted |

**Note on CSRF:** The invalidate endpoint is POST + cookie-auth. Next 16 App Router does not auto-generate CSRF tokens. For a same-origin-only, idempotent, low-impact trainer endpoint, cookie-based auth is acceptable. If the security bar rises later, add a custom header check (e.g., require `X-Requested-With: fetch`) — out of scope for this phase.

## Code Examples

### Cache module skeleton (canonical)
```typescript
// src/lib/githubManifestCache.ts
import type { GitHubFile } from './github-service';

const MANIFEST_TTL_MS = 5 * 60_000;

interface CacheEntry {
  manifest: GitHubFile[];
  etag: string;
  fetchedAt: number;
  expiresAt: number;
}

interface ParsedKey { owner: string; repo: string; branch: string; }

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<GetResult>>();

export interface GetResult {
  files: GitHubFile[];
  lastSynced: string;  // ISO
  etag: string;
}

type Fetcher = (key: ParsedKey, ifNoneMatch?: string) =>
  Promise<{ status: 200; etag: string; manifest: GitHubFile[] } | { status: 304 }>;

let fetcher: Fetcher = defaultFetcher;

export function makeKey(owner: string, repo: string, branch: string): string {
  return `${owner}/${repo}@${branch}`;
}

export async function getManifest(owner: string, repo: string, branch: string): Promise<GetResult> {
  const key = makeKey(owner, repo, branch);
  const cached = store.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    console.log(`[manifest-cache] hit key=${key} age=${now - cached.fetchedAt}`);
    return { files: cached.manifest, lastSynced: new Date(cached.fetchedAt).toISOString(), etag: cached.etag };
  }

  const existing = inFlight.get(key);
  if (existing) {
    console.log(`[manifest-cache] stampede-dedup key=${key}`);
    return existing;
  }

  const promise = (async (): Promise<GetResult> => {
    const parsed = { owner, repo, branch };
    const res = await fetcher(parsed, cached?.etag);

    if (res.status === 304 && cached) {
      console.log(`[manifest-cache] revalidate-304 key=${key}`);
      cached.expiresAt = now + MANIFEST_TTL_MS;
      cached.fetchedAt = now;
      return { files: cached.manifest, lastSynced: new Date(now).toISOString(), etag: cached.etag };
    }

    if (res.status === 200) {
      const evt = cached ? 'revalidate-200' : 'miss';
      console.log(`[manifest-cache] ${evt} key=${key}`);
      const entry: CacheEntry = {
        manifest: res.manifest,
        etag: res.etag,
        fetchedAt: now,
        expiresAt: now + MANIFEST_TTL_MS,
      };
      store.set(key, entry);
      return { files: entry.manifest, lastSynced: new Date(now).toISOString(), etag: entry.etag };
    }

    throw new Error(`Unexpected fetcher result for ${key}`);
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

export function invalidate(key?: string): number {
  if (!key) {
    const n = store.size;
    store.clear();
    console.log(`[manifest-cache] invalidate scope=all cleared=${n}`);
    return n;
  }
  const had = store.delete(key);
  console.log(`[manifest-cache] invalidate key=${key} cleared=${had ? 1 : 0}`);
  return had ? 1 : 0;
}

// Test-only helpers (mirror pinAttemptLimiter.__resetAll pattern)
export function __reset(): void { store.clear(); inFlight.clear(); }
export function __setFetcher(f: Fetcher): void { fetcher = f; }
export function __restoreFetcher(): void { fetcher = defaultFetcher; }

async function defaultFetcher(key: ParsedKey, ifNoneMatch?: string): Promise<
  { status: 200; etag: string; manifest: GitHubFile[] } | { status: 304 }
> {
  const url = `https://api.github.com/repos/${key.owner}/${key.repo}/git/trees/${key.branch}?recursive=1`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

  const res = await fetch(url, { headers });
  if (res.status === 304) return { status: 304 };
  if (!res.ok) throw new Error(`GitHub Trees API ${res.status} ${res.statusText}`);

  const etag = res.headers.get('etag') ?? '';
  const body = await res.json();
  if (body.truncated) console.warn(`[manifest-cache] truncated key=${key.owner}/${key.repo}@${key.branch}`);
  const manifest = normalizeTrees(body, key);
  return { status: 200, etag, manifest };
}

function normalizeTrees(body: { tree: Array<{ path: string; type: string; sha: string; size?: number; url?: string }> }, key: ParsedKey): GitHubFile[] {
  return body.tree
    .filter(e => e.type === 'blob' && e.path.endsWith('.md'))
    .map(e => ({
      name: e.path.split('/').pop()!,
      path: e.path,
      sha: e.sha,
      size: e.size ?? 0,
      url: e.url ?? '',
      html_url: `https://github.com/${key.owner}/${key.repo}/blob/${key.branch}/${e.path}`,
      git_url: e.url ?? '',
      download_url: `https://raw.githubusercontent.com/${key.owner}/${key.repo}/${key.branch}/${e.path}`,
      type: 'file' as const,
    }));
}
```

### Relative time helper
```typescript
// src/lib/relativeTime.ts (optional — or inline in component)
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelative(iso: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  const abs = Math.abs(diffMs);
  if (abs < 60_000)  return rtf.format(Math.round(diffMs / 1000), 'second');
  if (abs < 3.6e6)   return rtf.format(Math.round(diffMs / 60_000), 'minute');
  if (abs < 8.64e7)  return rtf.format(Math.round(diffMs / 3.6e6), 'hour');
  return rtf.format(Math.round(diffMs / 8.64e7), 'day');
}
```

### Invalidate route
```typescript
// src/app/api/github/cache/invalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { invalidate, makeKey } from '@/lib/githubManifestCache';

const OWNER = 'JesterCharles';
const REPO = 'mock-question-bank';
const BRANCH = 'main';

export async function POST(request: NextRequest) {
  const identity = await getCallerIdentity(request);
  if (identity.type !== 'trainer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const scope = body?.scope === 'all' ? 'all' : undefined;
  const cleared = scope === 'all' ? invalidate() : invalidate(makeKey(OWNER, REPO, BRANCH));
  return NextResponse.json({ cleared });
}
```

### Extended `/api/github` route
```typescript
// src/app/api/github/route.ts (add branch; keep existing list/content paths)
import { getManifest } from '@/lib/githubManifestCache';

// ... existing code

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');

  if (type === 'manifest') {
    try {
      const result = await getManifest(OWNER, REPO, BRANCH);
      return NextResponse.json(result);
    } catch (err: any) {
      console.error('Manifest fetch error:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ... existing list/content handling
}
```

### Client wrapper
```typescript
// src/lib/github-service.ts — add method
async loadManifest(): Promise<{ files: GitHubFile[]; lastSynced: string; etag: string }> {
  const res = await fetch('/api/github?type=manifest');
  if (!res.ok) throw new Error('Failed to load manifest');
  return res.json();
}

async refreshManifest(): Promise<{ cleared: number }> {
  const res = await fetch('/api/github/cache/invalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to refresh manifest');
  return res.json();
}
```

### Vitest pattern (fake timers + injected fetcher)
```typescript
// src/lib/githubManifestCache.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getManifest, invalidate, __reset, __setFetcher, __restoreFetcher } from './githubManifestCache';

beforeEach(() => { __reset(); vi.useFakeTimers(); });
afterEach(() => { __restoreFetcher(); vi.useRealTimers(); });

it('cold fetch populates cache', async () => {
  const spy = vi.fn().mockResolvedValue({ status: 200, etag: 'W/"v1"', manifest: [{ path: 'a.md', name: 'a.md', /* … */ } as any] });
  __setFetcher(spy);
  const r = await getManifest('o', 'r', 'main');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(r.files).toHaveLength(1);
  expect(r.etag).toBe('W/"v1"');
});

it('stampede: two concurrent calls hit fetcher once', async () => {
  const spy = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ status: 200, etag: 'e', manifest: [] }), 50)));
  __setFetcher(spy);
  const [a, b] = await Promise.all([getManifest('o', 'r', 'main'), getManifest('o', 'r', 'main')]);
  expect(spy).toHaveBeenCalledTimes(1);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recursive `/contents` walk (current `findQuestionBanks`) | Single Trees API call with ETag | This phase | N+1 → 1 call; stable ETag enables 304 short-circuit |
| Per-request GitHub hit | In-memory `Map` cache (5-min TTL) | This phase | Warm load <400ms; GitHub rate limit relief |
| `unstable_cache` / `revalidateTag` (Next data cache) | Not used | — | Data cache doesn't support HTTP conditional GET; module `Map` is simpler and more controllable |

**Deprecated/outdated:**
- Nothing deprecated by this phase. Legacy `contents` walk kept as fallback per D5.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GitHub Trees API returns ETag header on `/git/trees/{branch}?recursive=1` | Architecture Pattern 3 | [ASSUMED — GitHub docs confirm ETag + 304 on REST endpoints generally; specific trees endpoint ETag not called out verbatim]. Risk: 304 short-circuit never fires; cache still works but always re-downloads body on TTL expiry. Mitigation: Phase verification step = `curl -I` with token against the real endpoint and confirm `ETag:` header present. Low risk. |
| A2 | `<Toaster />` is not currently mounted in the wizard render tree | Pitfall 6 | [ASSUMED — only found `toast` import in `src/app/pdf/page.tsx`, no `<Toaster>` grep match performed exhaustively]. Risk: Toasts silently no-op. Mitigation: Planner grep-audits `<Toaster` before committing to toast vs banner. |
| A3 | Wizard call site at `src/app/interview/new/page.tsx:135` is only invocation needing UI update | D8 coverage | [VERIFIED — grep confirmed 3 invocations: wizard:135, wizard:177 (selected-tech content fetch, not manifest), home:195]. Low risk. |
| A4 | Home page (`src/app/page.tsx`) is public/unauthenticated and `getCallerIdentity` returns `anonymous` there | Pitfall 5 | [VERIFIED — home page has no auth guard; confirmed via route file read]. Low risk. |
| A5 | `GITHUB_TOKEN` env var is set in all deploy environments | Environment Availability | [VERIFIED — existing `/api/github` route already requires it and CLAUDE.md documents it]. Low risk. |
| A6 | Module-level state persists across requests in Next 16 Node runtime route handlers | D4 | [VERIFIED — same pattern already used successfully in `pinAttemptLimiter.ts`; Node runtime (not Edge) is the default for route handlers]. Low risk. |

## Open Questions

1. **Toast vs inline banner**
   - What we know: `react-hot-toast` is installed and used in `/pdf`. No `<Toaster>` found in wizard chain.
   - What's unclear: Is `<Toaster>` mounted in `layout.tsx` or similar, or only in `/pdf`?
   - Recommendation: Planner grep-audits. If no `<Toaster>` reaches wizard, use inline banner (simpler, one fewer moving part). CONTEXT marks this as Claude's discretion.

2. **Stale-while-revalidate on 304?**
   - What we know: D3 locks "TTL + conditional GET". 304 resets `expiresAt` to `now + TTL`.
   - What's unclear: Should `fetchedAt` (which drives "last synced" UI) also reset on 304? Yes, because we DID just confirm freshness. Implemented in skeleton above.
   - Recommendation: Confirmed — `fetchedAt` resets on 304. Update this in the PLAN explicitly.

3. **Should `/api/github?type=manifest` include cache headers for browser caching?**
   - What we know: Not in scope per D7.
   - Recommendation: No — respond with default headers. Cache lives server-side only; the browser refetch on wizard remount is what triggers a cache hit. Adding browser `Cache-Control` would bypass the server cache on navigation and break the UI freshness model.

## Sources

### Primary (HIGH confidence)
- `src/lib/pinAttemptLimiter.ts` — canonical module-state + `__resetAll` pattern
- `src/lib/identity.ts` — `getCallerIdentity` pattern for trainer gate
- `src/app/api/github/route.ts` — existing GitHub proxy to extend
- `src/lib/github-service.ts` — `GitHubFile` interface + existing `findQuestionBanks` to replace
- `src/app/interview/new/page.tsx:134-149` — wizard call site + state shape
- `src/app/page.tsx:190-202` — home call site
- `package.json` — versions: next@^16.2.3, vitest@^4.1.4, react-hot-toast@^2.6.0, lucide-react (existing)
- [GitHub REST API — Git Trees](https://docs.github.com/en/rest/git/trees) — request URL, truncated field, tree entry shape, rate limits
- [GitHub API best practices — conditional requests](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#conditional-requests) — 304 doesn't count against rate limit

### Secondary (MEDIUM confidence)
- [GitHub Community Discussion #156480 — rate limit best practices](https://github.com/orgs/community/discussions/156480) — ETag + If-None-Match confirmed for polling
- MDN `Intl.RelativeTimeFormat` — native, no dep

### Tertiary (LOW confidence)
- None — all critical claims verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already installed, versions confirmed via `package.json`
- Architecture: HIGH — mirrors existing `pinAttemptLimiter.ts` pattern 1:1
- Trees API ETag: MEDIUM — general GitHub conditional-request guarantee is confirmed; specific ETag header on trees endpoint is assumption A1, verifiable in 30 seconds with `curl`
- Normalization mapping: HIGH — audited actual consumer field usage in wizard + home page
- Pitfalls: HIGH — drawn from Next 16 + HTTP ETag spec + existing codebase conventions

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (30 days — stack stable, no pending Next 16 breaking changes identified)
