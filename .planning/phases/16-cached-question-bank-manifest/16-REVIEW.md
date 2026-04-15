---
phase: 16-cached-question-bank-manifest
reviewed: 2026-04-15T18:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/githubManifestCache.ts
  - src/lib/githubManifestCache.test.ts
  - src/app/api/github/route.ts
  - src/app/api/github/cache/invalidate/route.ts
  - src/lib/github-service.ts
  - src/app/interview/new/page.tsx
  - src/app/page.tsx
findings:
  blocker: 0
  high: 1
  medium: 3
  low: 4
  info: 2
  total: 10
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-04-15T18:00:00Z
**Depth:** standard
**Commits in scope:** 7447b87..2012710
**Status:** issues_found

## Summary

Phase 16 adds a single-process in-memory manifest cache with TTL + ETag revalidation, a trainer-gated invalidate endpoint, and wiring at two call sites. Code is well-structured, well-tested (8 Vitest cases, all passing), and follows the project's `pinAttemptLimiter` module-state convention.

No blockers. One HIGH concern around an invalidation race that can resurrect stale data, three MEDIUM items (CSRF on invalidate endpoint, over-broad client refresh scope, stale-error masking), and several small LOW/INFO polish items. Shipping as-is is safe for the current single-node GCE deployment; the race is only exploitable under concurrent refresh-during-stampede, which is unlikely in practice but worth a cheap fix before this ever lives behind a load balancer.

## High Issues

### HI-01: Invalidate-during-in-flight race resurrects stale data

**File:** `src/lib/githubManifestCache.ts:135-179, 189-204`
**Issue:** When a fetch is in flight and `invalidate()` is called concurrently, the invalidation removes the `inFlight` entry and the `store` entry, but the pending promise body (lines 164-170) still runs to completion and writes `store.set(key, entry)` with the pre-invalidate response. The post-invalidate caller can then get "hit" on stale data it just cleared.

Sequence:
1. T0: Caller A starts `getManifest()` → fetcher in flight, `inFlight.set(key, promise)`.
2. T1: Trainer clicks Refresh. Handler calls `invalidate('all')` → `store.clear()` + `inFlight.clear()`.
3. T2: Original fetch settles → executes `store.set(key, entry)` with pre-invalidate data.
4. T3: Caller B calls `getManifest()` → warm hit on stale entry.

In Phase 16's current flow, `handleRefresh` calls invalidate then `fetchTechs()` in sequence on the client, so the client itself is safe — but any other caller (home page load, concurrent tab) racing the invalidation can observe the ghost.

**Fix:** Track an invalidation generation counter and discard stale writes:

```typescript
let generation = 0;

export async function getManifest(...) {
  const gen = generation;
  // ...inside promise, before store.set:
  if (gen !== generation) {
    console.log(`[manifest-cache] discarding stale write key=${key} (invalidated mid-flight)`);
    return { files: response.files, lastSyncedAt: settledAt, etag: response.etag };
  }
  store.set(key, entry);
  // ...
}

export function invalidate(scope) {
  generation++;
  // ...existing clear logic
}
```

Cheap, preserves the current in-flight caller's result, prevents resurrection for later callers.

## Medium Issues

### ME-01: POST /api/github/cache/invalidate has no CSRF protection

**File:** `src/app/api/github/cache/invalidate/route.ts:13-44`
**Issue:** The endpoint is gated on `caller.type === 'trainer'` via the `nlm_session` cookie, but cookies are auto-attached on cross-site POSTs. The cookie's SameSite attribute is the only barrier. If `nlm_session` is issued without `SameSite=Lax` (the browser default for unset is now Lax, but explicit is safer) or is set to `None`, a malicious site could force a logged-in trainer's browser to POST to this endpoint and DoS the cache (force re-fetch). Blast radius is low (one extra GitHub round-trip, no data loss), but there's no rate limit either.

**Fix:** Verify `nlm_session` cookie is issued with `SameSite=Lax` or stricter (check `src/lib/auth-server.ts`). If not, add an `Origin`/`Referer` check here:

```typescript
const origin = request.headers.get('origin');
const host = request.headers.get('host');
if (origin && !origin.endsWith(host ?? '')) {
  return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
}
```

Alternatively require a custom header (`X-Requested-With: fetch`) and send it from `handleRefresh`.

### ME-02: Wizard Refresh uses `scope: 'all'` — broader than needed

**File:** `src/app/interview/new/page.tsx:188-193`
**Issue:** The wizard's Refresh button sends `{ scope: 'all' }` which clears every cached repo/branch key. Today there is only one default key so the effect is identical, but the client is leaking blast-radius that doesn't match its intent ("refresh my current repo"). If Phase 17+ ever caches multiple repos per trainer, this will nuke them all on any refresh.

**Fix:** Send an empty body (or explicit scope object) to hit the endpoint's default-key branch:

```typescript
const res = await fetch('/api/github/cache/invalidate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
```

The endpoint already maps empty body to `invalidate({owner, repo, branch})` of the default key.

### ME-03: Refresh error handling swallows the real cause

**File:** `src/app/interview/new/page.tsx:185-201`
**Issue:** `handleRefresh` wraps both the invalidate POST and `fetchTechs()` in one try/catch. `fetchTechs()` already has its own try/catch that sets a specific error message (`'Failed to fetch from GitHub. Check repository details.'`). If `fetchTechs` handles its own error and does NOT throw, the outer `handleRefresh` sees success. If it DOES propagate (it currently doesn't — the inner catch swallows), the outer catch overwrites the specific error with generic "Failed to refresh manifest." Today this is benign because `fetchTechs` never throws, but the two error pathways are tangled and brittle.

**Fix:** Check `res.ok` for invalidate separately and rely on `fetchTechs`'s own error handling for the refetch leg:

```typescript
const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    const res = await fetch('/api/github/cache/invalidate', { method: 'POST', body: '{}' });
    if (!res.ok) {
      setError('Failed to invalidate cache.');
      return;
    }
  } catch {
    setError('Failed to invalidate cache.');
    return;
  } finally {
    setIsRefreshing(false);
  }
  await fetchTechs(); // owns its own error state
}, [fetchTechs]);
```

## Low Issues

### LO-01: Dead constants kept alive with `void`

**File:** `src/lib/githubManifestCache.ts:21-22, 218-220`
**Issue:** `OWNER_DEFAULT` and `REPO_DEFAULT` are declared but unused, then silenced with `void OWNER_DEFAULT; void REPO_DEFAULT;`. This is dead code that the comment admits ("Silence unused-constant lints while keeping defaults colocated with caller docs."). If they're documentation, put them in a JSDoc; if they're unused, delete them.

**Fix:** Delete both constants and the `void` statements. The defaults already live in the route handlers where they are actually used.

### LO-02: `fetchFromGitHub` has identical branches in its URL ternary

**File:** `src/app/api/github/route.ts:10-13`
**Issue:** Pre-existing, but touched-adjacent:

```typescript
const fileUrl = isRaw
    ? `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`
    : `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
```

Both branches are byte-for-byte identical. The `isRaw` switch only meaningfully affects the `Accept` header below. Minor confusing dead logic.

**Fix:** Collapse to `const fileUrl = \`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}\`;`

### LO-03: Error message in 304-without-prior-entry throw leaks internals

**File:** `src/lib/githubManifestCache.ts:148`
**Issue:** `throw new Error('[manifest-cache] 304 without prior entry');` propagates to the `/api/github?type=manifest` handler, which returns it verbatim as `{ error: message }` with status 500. Internal cache diagnostics reach the client.

**Fix:** Either log + return a 200 with a fresh fetch (defensively clear and retry without etag), or strip the `[manifest-cache]` prefix from the thrown message so nothing internal leaks. Safest:

```typescript
if (!existing) {
  console.error('[manifest-cache] 304 without prior entry; retrying without etag');
  // fallthrough: retry
  const retry = await activeFetcher({ owner, repo, branch });
  if (retry.status === 304) throw new Error('Unexpected 304 from GitHub');
  // ...handle 200 path
}
```

### LO-04: Type casts in invalidate route body parsing are clumsy

**File:** `src/app/api/github/cache/invalidate/route.ts:19-40`
**Issue:** The body discriminant is unpacked via repeated `(body as { scope?: unknown }).scope` casts. The declared `InvalidateBody` union would let you `switch` on the shape once. This is style, not a bug, but it's harder to read than the PLAN's reference code suggested.

**Fix:** Parse once:

```typescript
const scope = (body as { scope?: unknown })?.scope;
if (scope === 'all') cleared = invalidate('all');
else if (scope && typeof scope === 'object') cleared = invalidate(scope as ...);
else cleared = invalidate({ owner: OWNER, repo: REPO, branch: BRANCH });
```

## Info

### IN-01: Cache is not cluster-safe — header comment is correct, consider runtime guard

**File:** `src/lib/githubManifestCache.ts:14`
**Issue:** The comment "Single-node deployment only (GCE Docker). For horizontal scale, move to Redis." is accurate. If/when NLM moves to Cloud Run (mentioned in MEMORY), each cold instance has its own cache and trainer invalidate calls hit only one instance. Worth tracking but not a Phase 16 fix.

### IN-02: `loadManifest` discards the returned `etag`

**File:** `src/lib/github-service.ts:69-76`
**Issue:** API returns `{ files, lastSynced, etag }`; client keeps `{ files, lastSynced }`. Currently unused on client, fine. If a future phase wants client-side conditional revalidation (e.g., SWR keyed on etag), the server already returns it — not a change, just flagging the vestigial field.

---

_Reviewed: 2026-04-15T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
