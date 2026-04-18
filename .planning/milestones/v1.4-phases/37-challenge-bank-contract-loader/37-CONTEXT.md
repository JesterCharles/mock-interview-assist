# Phase 37: Challenge Bank Contract & Loader - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults captured inline)

<domain>
## Phase Boundary

Define and implement the two-repo challenge bank contract (public prompts/starters/visible-tests + private hidden-tests) and a server-side loader service that fetches, validates, and caches challenges. Persist loaded challenges into the Phase 36 `CodingChallenge` / `CodingTestCase` tables.

**In scope:**
- Public + private GitHub repo schema documentation (`docs/coding-bank-schema.md`)
- `src/lib/coding-challenge-service.ts` loader (mirrors `github-service.ts` pattern)
- `/api/coding/bank/refresh` trainer-only route (manual refresh trigger — cache path)
- Private-repo server-only fetch (token-scoped, never via `/api/github` proxy)
- Validation pipeline (schema, language allowlist, stdin/stdout sanity, duplicate-slug guard)
- In-memory manifest cache with ETag short-circuit + 5-min invalidation
- Seed path that writes `CodingChallenge` + `CodingTestCase` (isHidden=true for private) rows to DB
- Unit tests for validator + cache invalidation

**Out of scope (other phases):**
- Judge0 execution → Phase 38
- Submit/poll API → Phase 39
- UI browse/solve → Phase 40
- In-app authoring editor → v1.5
- Challenge archival / soft delete → v1.5

</domain>

<decisions>
## Implementation Decisions

### Repo Schema (locked per REQUIREMENTS + discovery)
- **D-01:** Public repo path layout: `challenges/<slug>/README.md`, `challenges/<slug>/starters/<lang>.{ext}`, `challenges/<slug>/visible-tests.json`, `challenges/<slug>/meta.json`. Language extensions: `.py` / `.js` / `.ts` / `.java` / `.sql` / `.cs`. (CODING-BANK-01)
- **D-02:** Private repo path layout: `challenges/<slug>/hidden-tests.json` only. Same slug keys as public repo. (CODING-BANK-02)
- **D-03:** `meta.json` fields: `slug`, `title`, `difficulty` (easy|medium|hard), `skillSlug` (joins CurriculumWeek.skillSlug), `cohortId` (null = global), `languages` (subset of allowlist). Validated by Zod.
- **D-04:** Test-case JSON shape: `[{id: string, stdin: string, expectedStdout: string, weight: number (default 1.0), orderIndex: number}]`. Same shape visible + hidden.

### Private Fetch Isolation (locked — security boundary)
- **D-05:** Private hidden-tests are fetched via a **dedicated server-only helper** `fetchPrivateChallenge(slug)` in `coding-challenge-service.ts` that calls GitHub directly (octokit-style or raw fetch to `api.github.com/repos/OWNER/PRIVATE_REPO/contents/...`) using `GITHUB_CODING_PRIVATE_TOKEN`. MUST NOT go through `/api/github` proxy (which returns raw content by path and is reachable via client).
- **D-06:** Public content continues to use existing `/api/github` proxy path (via `github-service.ts` style request), keeping `GITHUB_TOKEN` server-only.
- **D-07:** New env var `GITHUB_CODING_PRIVATE_TOKEN` + new repo-owner config vars: `GITHUB_CODING_PUBLIC_REPO` (default: same as existing question-banks repo or configurable), `GITHUB_CODING_PRIVATE_REPO`. Added to `.env.example`.

### Loader Pattern (mirror github-service.ts)
- **D-08:** `src/lib/coding-challenge-service.ts` exposes:
  - `listChallenges(cohortId?: number): Promise<CodingChallengeManifest[]>` — reads manifest (list of slugs) from public repo, filters by optional cohort.
  - `loadChallenge(slug: string): Promise<FullChallenge>` — fetches public README/starters/visible-tests + meta, validates, returns shape.
  - `loadHiddenTests(slug: string): Promise<HiddenTestCase[]>` — server-only; callers must be server-context (API route handlers / server components).
  - `syncChallengeToDb(slug: string): Promise<{challenge: CodingChallenge, cases: CodingTestCase[]}>` — validates + upserts into DB via Prisma (idempotent — uses `slug` as natural key).
- **D-09:** Validation pipeline is a Zod-composed chain executed inside `loadChallenge`. Rejects with structured `ChallengeValidationError` (field path + reason) so refresh route can surface readable messages.

### Cache Strategy (5-min TTL + ETag)
- **D-10:** In-memory cache singleton at module scope in `coding-challenge-service.ts`. Shape: `Map<CacheKey, {etag?: string, lastFetchedAt: number, payload: unknown}>`. Keys: `public:manifest`, `public:<slug>:readme`, `public:<slug>:meta`, `public:<slug>:visible-tests`, `public:<slug>:starter:<lang>`, `private:<slug>:hidden-tests`.
- **D-11:** TTL = 5 minutes (env-tunable via `CODING_BANK_CACHE_TTL_MS`, default `300000`). On each fetch: if `now - lastFetchedAt < ttl`, return payload. Otherwise revalidate via GitHub ETag (`If-None-Match` header) — 304 → extend TTL in place, 200 → overwrite.
- **D-12:** `invalidateCache(scope?: string)` exported for test/trainer-refresh use.

### Sync + Refresh
- **D-13:** `/api/coding/bank/refresh` is POST, trainer-only (via `getCallerIdentity()` → role check). Payload optional `{ slugs?: string[] }`. If `slugs` omitted → walks entire public manifest and syncs all changed ones. Returns `{ synced: number, skipped: number, errors: Array<{slug, reason}> }`.
- **D-14:** Sync is idempotent: `prisma.codingChallenge.upsert({ where: { slug } })`, then reconcile `CodingTestCase` rows by `(challengeId, id)` composite natural key (delete missing, upsert present). No partial writes — whole-challenge transaction.

### Validation Pipeline (locked per CODING-BANK-05)
- **D-15:** Checks in order, all must pass:
  1. Schema shape (Zod `MetaSchema`, `VisibleTestsSchema`, `HiddenTestsSchema`, `StarterSchema`)
  2. Language allowlist: `meta.languages ⊆ {python, javascript, typescript, java, sql, csharp}`; every language in `languages` MUST have matching `starters/<lang>.{ext}` file
  3. Test-case sanity: non-empty `stdin`, non-empty `expectedStdout`, distinct `id`s, positive `weight`, monotonic `orderIndex` (0-indexed contiguous)
  4. Duplicate-slug guard — in manifest walk, surfaces duplicate slug as hard failure
  5. Hidden/visible id disjointness — hidden test `id`s MUST NOT collide with visible test `id`s (avoids client-side shadowing attacks)

### Cohort/Curriculum Filter
- **D-16:** `meta.cohortId: null` → challenge is globally visible. Non-null → scoped to a single cohort. No multi-cohort list in v1.4 (defer to v1.5). Curriculum-week filter happens at list-API time (Phase 39) via `skillSlug` match against `CurriculumWeek.skillSlug` — Phase 37 just stores the `skillSlug`.

### Claude's Discretion
- Exact Zod schema module layout (single `schemas.ts` vs inline) — planner picks based on line count
- Whether manifest walk is one README per challenge or a top-level `challenges/manifest.json`. Recommended: top-level `manifest.json` with `[{slug}]` entries — simpler to cache, avoids N API calls during list
- Error reporting verbosity in refresh response (full error array vs truncated)
- Octokit vs raw fetch for private repo calls (raw fetch keeps zero new deps)

### Folded Todos
None — no matched pending todos for this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level
- `.planning/PROJECT.md` — v1.4 active section; MSA-from-day-1 principles
- `.planning/REQUIREMENTS.md` §CODING-BANK-01..05 — authoritative req text
- `.planning/ROADMAP.md` §Phase 37 — goal + success criteria
- `.planning/PIPELINE-DISCOVER.md` §Approach B + §Cross-Model Perspective §5 — private-repo decision + hidden-test leak threat
- `.planning/phases/36-data-model-schema/36-CONTEXT.md` — Phase 36 schema shape (CodingChallenge.slug unique, CodingTestCase.isHidden bool, cascade rules) — this phase's syncChallengeToDb must respect D-04..D-12 from Phase 36

### Existing code to mirror
- `src/lib/github-service.ts` — public-content loader pattern (token-hidden via `/api/github` proxy); mirror signature shape for public calls
- `src/app/api/github/route.ts` — proxy route — public-only, never touch for private fetch
- `src/app/api/github/cache/` — if cache utilities exist, reuse for v1.2 cache pattern (CODING-BANK-04)
- `src/lib/identity.ts` — `getCallerIdentity()` returns `{ role: 'trainer' | 'associate' | 'anonymous' }` — gate refresh route on trainer role
- `src/lib/rateLimitService.ts` — reuse shape for future coding-submit rate limit (not needed in 37; reference for Phase 39)
- `src/lib/curriculumService.ts` — `skillSlug` canonical matcher; 37's meta.json must use same slug format
- `src/generated/prisma/` — Prisma client types for CodingChallenge, CodingTestCase (Phase 36 output)

### Explicitly out-of-scope (do not touch in Phase 37)
- `src/app/api/github/route.ts` — do NOT extend to private repo (keep public-only by design)
- `docker-compose.yml` — Phase 38
- `/api/coding/submit` or `/api/coding/attempts` — Phase 39
- UI routes `/coding/*` — Phase 40

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`github-service.ts`**: Fetch pattern with error handling + rate-limit respect. `coding-challenge-service.ts` copies structure but keeps public-only via `/api/github` proxy AND adds private-only direct GitHub calls (different helper, different token).
- **ETag cache pattern**: Existing question-bank loader may already do `If-None-Match`; mirror that exactly for consistency. If not, build ETag handling from scratch (single fetch helper wrapped in memoized cache).
- **Zod validation**: Project convention — inline schema per service file (see `src/lib/auth-server.ts`, `src/lib/settingsService.ts`). New `CodingChallenge` validation lives adjacent to loader.
- **`getCallerIdentity()`** returns trainer/associate/anonymous — use for refresh route gating.

### Established Patterns
- Server-only env vars live under `process.env.*`, never surfaced to client. `GITHUB_CODING_PRIVATE_TOKEN` follows `GITHUB_TOKEN` pattern.
- Dual-write: Phase 37 persists to DB (Prisma) only — no file fallback. The GitHub repo IS the file source of truth; DB is the authoritative cache + join target.

### Integration Points
- Phase 36 models: this phase writes to them (upsert via Prisma). No schema changes.
- Phase 39 list API will `SELECT * FROM CodingChallenge WHERE cohortId IS NULL OR cohortId = $associateCohort`. Phase 37's sync populates rows consistent with that query.

### Known Constraints
- GitHub API rate limit (5000/hr authenticated) — ETag short-circuit critical to avoid burning quota on cache revalidation
- Private repo access requires `contents: read` scope on the token — document in `.env.example`
- Next.js runtime: route handlers default to Node runtime (not Edge) — fine for private fetch helper; no Edge-runtime constraints to worry about

</code_context>

<specifics>
## Specific Ideas

- Discovery §Cross-Model Perspective §5 (codex): "Public repo + hidden tests = associates fetch via DevTools and hardcode answers." This is the hard constraint driving D-05 (private-only helper, never via public proxy).
- REQUIREMENTS CODING-BANK-04 explicitly names the "v1.2 cache pattern" — look at how question-banks caches today and replicate it structurally, don't reinvent.
- Success criterion "authored in repo appears in app within 5 min" = TTL cap of 5 min (D-11) is what enforces this.
- ROADMAP success: "hidden tests never appear in public API responses" — this is a Phase 39 responsibility at the API layer, but Phase 37's `loadChallenge` public shape MUST NOT include hidden tests. Enforce at service-contract level: `FullChallenge` type excludes hidden tests; `loadHiddenTests` is a separate function.

</specifics>

<deferred>
## Deferred Ideas

- **In-app challenge authoring editor** — markdown editor + test runner UI for trainers. v1.5.
- **Multi-cohort challenge assignment** — `meta.cohortIds: number[]` for cross-cohort visibility. v1.5.
- **Challenge archival / soft delete** — `archived: boolean` flag + UI filter. v1.5.
- **Webhook-driven cache invalidation** — GitHub push webhook → POST to `/api/coding/bank/refresh`. Nice-to-have but 5-min TTL already hits success criterion. v1.5.
- **Function-level test harness** — wrap user code in per-language drivers instead of stdin/stdout. v1.5 seed.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 37-challenge-bank-contract-loader*
*Context gathered: 2026-04-18 (auto)*
