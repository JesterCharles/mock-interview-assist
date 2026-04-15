# Architecture: v1.2 Analytics & Auth Overhaul

**Milestone:** v1.2
**Researched:** 2026-04-15
**Confidence:** HIGH (direct code inspection + Supabase official docs patterns)

This document defines how v1.2 features (Supabase Auth cutover, RLS, analytics, dashboard redesign, associate self-dashboard, cached manifest, bulk onboarding) slot atop the existing v1.1 codebase. Opinionated recommendations, not menus.

---

## 1. Auth Migration Architecture

### 1.1 Target State

- **Single auth system:** Supabase Auth (`auth.users`) for both trainers and associates. Role distinguished by a column on `Associate` or a `user_metadata.role` claim.
- **Trainer login:** Supabase email/password (OAuth deferred — email/password keeps scope tight).
- **Associate login:** Supabase magic link (email-based, no password).
- **Session transport:** `@supabase/ssr` cookie (HttpOnly, chunked `sb-<ref>-auth-token.*`). Replaces both `nlm_session` and `associate_session` cookies.
- **No feature flag.** Flag delete is a gate in the migration plan — once Supabase is live, `ENABLE_ASSOCIATE_AUTH` and all gated code paths are removed in the same PR as flag removal.

### 1.2 Schema Changes

Add to `Associate`:

```prisma
model Associate {
  // existing fields...
  authUserId String? @unique  // FK to auth.users.id (UUID); nullable during migration
  email      String? @unique  // denormalized for bulk invite / display; synced from auth.users
  role       String  @default("associate")  // 'associate' | 'trainer' — future-proof for multi-role
  // REMOVE: pinHash, pinGeneratedAt (after cutover migration)
}
```

Add a `TrainerProfile` model (or extend `Settings`) OR: trainers authenticate via Supabase but have no `Associate` row — `role` is resolved by checking `auth.users.user_metadata.role = 'trainer'`. **Recommendation:** use `user_metadata.role` claim on the Supabase user. Keeps Prisma schema lean; trainer accounts do not pollute `Associate`.

### 1.3 Data Migration Plan (Existing Associate → auth.users)

Order of operations in a single migration script (`scripts/migrate-to-supabase-auth.ts`):

1. For each `Associate` with a populated `slug`:
   - If `email` is known (from prior manual entry or cohort roster), call `supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { role: 'associate', slug } })`.
   - If `email` is NOT known, insert a **placeholder ghost user** with `email = ${slug}@placeholder.local`, flag `Associate.authUserId` but keep `Associate.email = null`. Trainer resolves via bulk invite flow in-product (promotes ghost to real email).
2. Store returned `auth.users.id` into `Associate.authUserId`.
3. After backfill verified (row count match, `authUserId` NOT NULL on all rows that had sessions): deploy RLS + flip middleware to Supabase session check.
4. Deprecation step (follow-up commit): drop `pinHash`, `pinGeneratedAt` columns, drop `associate_session` cookie handlers, delete `pinService.ts`, `pinAttemptLimiter.ts`, `associateSession.ts`, `featureFlags.ts`, PIN routes, `/signin` associate-PIN tab.

**Zero data loss guarantee:** `Associate.id` (int) remains stable. All FKs (`Session.associateId`, `GapScore.associateId`) keep pointing at the same rows. `authUserId` is additive.

### 1.4 Identity Resolution Replacement

Replace `src/lib/identity.ts` `getCallerIdentity()`:

```ts
// New src/lib/identity.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type CallerIdentity =
  | { type: 'trainer'; userId: string; email: string }
  | { type: 'associate'; userId: string; associateId: number; slug: string; email: string }
  | { type: 'anonymous' };

export async function getCallerIdentity(): Promise<CallerIdentity> {
  const supabase = createServerClient(/* ... cookies adapter ... */);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { type: 'anonymous' };

  const role = user.user_metadata?.role ?? 'associate';
  if (role === 'trainer') {
    return { type: 'trainer', userId: user.id, email: user.email! };
  }

  // Associate: resolve authUserId → Associate row (via Prisma, server-side)
  const associate = await prisma.associate.findUnique({ where: { authUserId: user.id } });
  if (!associate) return { type: 'anonymous' };
  return { type: 'associate', userId: user.id, associateId: associate.id, slug: associate.slug, email: user.email! };
}
```

**Key change:** the signature drops `NextRequest` — it now uses `cookies()` from `next/headers` directly, which works in both server components and route handlers. Middleware gets a dedicated variant (see 1.5) because it still needs `NextRequest`.

### 1.5 Middleware Changes

Current `src/middleware.ts` is cookie-only and synchronous-feeling (no DB). Replace with `@supabase/ssr`'s `createServerClient` bound to `NextRequest`/`NextResponse`. Recommended pattern (directly from Supabase Next.js App Router docs):

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const TRAINER_PATHS = ['/dashboard', '/interview', '/review', '/trainer'];
const ASSOCIATE_PATH = '/associate';
const PUBLIC_SIGNIN = '/signin';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role ?? (user ? 'associate' : null);
  const { pathname } = request.nextUrl;

  // Trainer paths
  if (TRAINER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (role !== 'trainer') return NextResponse.redirect(new URL('/signin', request.url));
    return response;
  }

  // Associate paths
  if (pathname.startsWith(ASSOCIATE_PATH) && pathname !== '/associate/login') {
    if (!user) {
      const url = new URL('/signin', request.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  return response;
}
```

**Critical detail (Supabase SSR doc):** `supabase.auth.getUser()` in middleware **refreshes the token** and writes new cookies to `response`. You MUST return the same `response` object that was mutated — do not create a fresh `NextResponse.next()` at the end. This is the #1 footgun in Supabase middleware integrations.

**No DB work in middleware still holds** — `getUser()` validates the JWT locally via JWKS (cached) and only hits Supabase auth server on token refresh. No Prisma call.

### 1.6 Cleanup Scope (Files to Delete at Cutover)

| File / Path | Action |
|---|---|
| `src/lib/pinService.ts` | Delete |
| `src/lib/pinService.test.ts` | Delete |
| `src/lib/pinAttemptLimiter.ts` | Delete |
| `src/lib/associateSession.ts` | Delete |
| `src/lib/featureFlags.ts` | Delete |
| `src/app/api/associate/pin/generate/route.ts` | Delete |
| `src/app/api/associate/pin/verify/route.ts` | Delete |
| `src/app/api/associate/status/route.ts` | Delete (flag is gone) |
| `src/app/api/associate/logout/route.ts` | Replace with Supabase sign-out |
| `src/app/api/associate/me/route.ts` | Replace — reads Supabase session |
| `src/app/associate/login/page.tsx` | Delete (redirect to `/signin`) |
| `src/components/.../SignInTabs.tsx` | Simplify — one form (email/password for trainer, magic-link for associate), detect role by email lookup OR a tab toggle. |
| `src/lib/auth-server.ts` | Replace — wrap Supabase server client helpers |
| `src/lib/auth-context.tsx` | Replace — `useAuth()` reads Supabase session via browser client |
| `ASSOCIATE_SESSION_SECRET`, `APP_PASSWORD`, `ENABLE_ASSOCIATE_AUTH`, `NLM_TRUSTED_PROXY` env vars | Remove (keep `NLM_TRUSTED_PROXY` only if still needed for rate-limit — it can go) |
| Schema: `Associate.pinHash`, `Associate.pinGeneratedAt` | Drop (migration after backfill verified) |

**Migration order (critical):** introduce Supabase alongside old auth → migrate data → flip middleware → remove old auth. Four commits minimum, not one mega-PR.

---

## 2. RLS Policy Design

### 2.1 Prisma + RLS Pattern — Decision

**Recommendation: service-role key for server routes + app-layer authorization. Do NOT use per-request scoped anon-key Prisma clients.**

Rationale:
- Prisma's adapter-pg uses a connection pool; per-request JWT context on each connection is a known pain point. Setting `request.jwt.claim.sub` via `SET LOCAL` requires careful transaction wrapping and is easy to leak between requests with pooling.
- Our existing code is structured around server-side authorization (e.g., `getCallerIdentity` → explicit query filters). Extending that is cheaper than retrofitting RLS-aware Prisma.
- Prisma uses Supabase's **Transaction Pooler** (pgBouncer transaction mode) — prepared statements and session-level GUCs do not survive across statements in this mode. RLS via `SET LOCAL` would require explicit `BEGIN; SET LOCAL ...; SELECT ...; COMMIT;` per query, killing ergonomics.

**Defense-in-depth RLS:** Still deploy RLS policies as a safety net. Policies written against `auth.uid()` will reject any query from a misconfigured non-service-role client. Prisma (service-role) bypasses them; direct client-side queries (if any creep in) are protected.

### 2.2 Policy Table

All tables have RLS enabled. Service-role connection bypasses. Policies target `anon` and `authenticated` roles.

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `Associate` | trainer | ALL | ALL | ALL | ALL |
| `Associate` | associate | `auth.uid() = authUserId` | — | `auth.uid() = authUserId` (only `displayName`) | — |
| `Session` | trainer | ALL | ALL | ALL | ALL |
| `Session` | associate | `associateId IN (SELECT id FROM Associate WHERE authUserId = auth.uid())` | — | — | — |
| `GapScore` | trainer | ALL | ALL | ALL | ALL |
| `GapScore` | associate | same subquery as Session | — | — | — |
| `Cohort` | trainer | ALL | ALL | ALL | ALL |
| `Cohort` | associate | `id IN (SELECT cohortId FROM Associate WHERE authUserId = auth.uid())` | — | — | — |
| `CurriculumWeek` | trainer | ALL | ALL | ALL | ALL |
| `CurriculumWeek` | associate | `cohortId IN (SELECT cohortId FROM Associate WHERE authUserId = auth.uid())` | — | — | — |
| `Settings` | trainer | ALL | — | ALL | — |
| `Settings` | associate | `true` (threshold is public-ish; value affects UI) | — | — | — |

**Trainer detection in policy:** `(auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'trainer'`. Wrap in a SQL function `is_trainer()` for readability.

```sql
create or replace function public.is_trainer() returns boolean
language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'trainer',
    false
  )
$$;
```

Then policies read `using (public.is_trainer() or <associate scope>)`.

### 2.3 Migration Delivery

Deliver RLS as Prisma-managed raw SQL migration (`prisma migrate` supports raw SQL in `migration.sql`). Or use a dedicated Supabase SQL migration. **Recommendation: keep it in Prisma migrations** — single source of truth for schema, CI runs `prisma migrate deploy` already.

---

## 3. Analytics Data Layer

### 3.1 Scale Assessment

At current scale (single training org, expected <500 associates, <50 sessions/associate = <25k rows in `Session`, <150k in `GapScore`), **inline aggregation is fine**. No materialized views needed.

### 3.2 Query Patterns

**KPI strip (top of `/trainer`):**

```sql
-- Avg Readiness (across filtered cohort)
SELECT AVG(overallTechnicalScore * 0.7 + overallSoftSkillScore * 0.3)
FROM "Session" s
JOIN "Associate" a ON s.associateId = a.id
WHERE a.cohortId = $1 AND s.createdAt > NOW() - INTERVAL '30 days';

-- Mocks This Week
SELECT COUNT(*) FROM "Session" WHERE createdAt > NOW() - INTERVAL '7 days' AND cohortId = $1;

-- Top Gap (skill with lowest weighted score across cohort)
SELECT skill, AVG(weightedScore) AS avg_score
FROM "GapScore" g
JOIN "Associate" a ON g.associateId = a.id
WHERE a.cohortId = $1
GROUP BY skill ORDER BY avg_score ASC LIMIT 1;

-- AI/Trainer Variance — diff of auto-scored vs overridden per question assessment
-- Requires schema addition OR JSON-path queries on Session.assessments. See 3.3.
```

**Execution pattern:** single server component at `/trainer` fetches all KPIs in parallel via `Promise.all` calling a new `src/lib/analyticsService.ts` module. Raw SQL via `prisma.$queryRaw` — these are aggregations, not ORM fits.

**Sparklines in roster:** include last-N session scores as a Postgres array per associate in the existing `/api/trainer` roster response. Use a single query with a lateral join:

```sql
SELECT a.*, (
  SELECT array_agg(s.overallTechnicalScore ORDER BY s.createdAt DESC)
  FROM "Session" s WHERE s.associateId = a.id LIMIT 10
) AS recent_scores
FROM "Associate" a WHERE a.cohortId = $1;
```

### 3.3 AI/Trainer Variance — Schema Decision

Current: `Session.assessments` is `Json` containing per-question scores with `validated: boolean` flag (per existing scoring system). Variance = `|aiScore - finalScore|` averaged across questions where trainer overrode.

**Option A (no schema change):** Aggregate via `jsonb_path_query` in Postgres. Slow for large session count but feasible at scale.

**Option B (denormalize):** Add `Session.aiTrainerVariance Float?` column, computed at session save and stored. Fast queries, cheap to maintain.

**Recommendation: Option B.** Analytics queries stay simple and fast; computation is a trivial addition to the existing session save pipeline in `sessionPersistence.ts`.

### 3.4 Cohort Trends Chart

Time-series: avg readiness per week over last 12 weeks.

```sql
SELECT date_trunc('week', s.createdAt) AS week,
       AVG(s.overallTechnicalScore) AS avg_tech
FROM "Session" s JOIN "Associate" a ON s.associateId = a.id
WHERE a.cohortId = $1 AND s.createdAt > NOW() - INTERVAL '12 weeks'
GROUP BY week ORDER BY week;
```

Runs in <50ms on expected data volumes. No materialized view.

### 3.5 When to Add Materialized Views

Add when: (a) roster page p95 > 500ms, OR (b) cohort size exceeds 2000 associates. Revisit in v1.4+.

---

## 4. Dashboard Redesign Integration

### 4.1 Target Shell Pattern

Per `finalized.html`: persistent topbar + left sidebar, child routes render in main area.

**Implementation: Next.js App Router nested layout.**

```
src/app/trainer/
├── layout.tsx           # NEW — topbar + sidebar shell; guards trainer auth
├── page.tsx             # KEEP — roster (now the index route "/trainer")
├── gap-analysis/
│   └── page.tsx         # NEW — cohort gap heatmap / skill breakdown
├── calibration/
│   └── page.tsx         # NEW — variance review (moved from /trainer/[slug] subview)
├── reports/
│   └── page.tsx         # NEW — PDF export gallery
├── cohorts/             # EXISTING — cohort CRUD
└── [slug]/              # EXISTING — associate detail
    └── page.tsx
```

`layout.tsx` renders the topbar + sidebar; children render into `{children}`. This is the canonical App Router pattern and fits v1.1's existing `/trainer/[slug]` naturally.

### 4.2 Where `/trainer/[slug]` Fits — Child Route, NOT Modal

**Recommendation: keep it as a child route.**

- **Shareable URLs:** critical for trainer workflows (send link to colleague, deep-link from email).
- **Browser back button:** works naturally.
- **Layout inheritance:** the shell's sidebar stays visible; `[slug]/page.tsx` renders in main area alongside roster context.
- **No modal gymnastics:** intercepting routes (`(..)[slug]`) for modal overlays is elegant but adds complexity the solo dev doesn't need now.

If a quick-peek "drawer" experience is desired without losing roster context, use Next.js **parallel routes + intercepting routes** as a v1.3 enhancement. For v1.2, child route is correct.

### 4.3 Sidebar State

Sidebar active-link highlighting uses `usePathname()` in a small client component (`TrainerSidebar.tsx`). No global state needed. Collapse/expand state persists in `localStorage` (trivial `useEffect` + state).

### 4.4 KPI Cards — Server-Rendered

The KPI strip renders in the shell `layout.tsx` via a server component that fetches aggregates. Re-renders on navigation between sidebar routes would be wasteful — use a **segment-level layout** (`trainer/(dashboard)/layout.tsx` with route group) OR just fetch once in the topmost layout and accept that data is fresh only on full navigations. For MVP, latter is fine.

---

## 5. Associate Dashboard Scope Boundary

**Recommendation: NEW route `/associate/[slug]/dashboard` — do NOT extend existing `/associate/[slug]`.**

Rationale:

1. **Semantics:** the existing `/associate/[slug]` is a **profile** — identity, session list, readiness badge. The dashboard is an **active workspace** — trends, CTA to book next mock, goals. Conflating them overloads a single page.
2. **Auth boundary clarity:** post-Supabase, `/associate/[slug]/dashboard` is strictly `auth.uid() = slug-owner`. `/associate/[slug]` (profile) can remain trainer-viewable for roster drill-down. Splitting routes makes the guard rules obvious.
3. **Nested layout opportunity:** `/associate/[slug]/layout.tsx` can provide shared chrome; `page.tsx` = profile, `dashboard/page.tsx` = dashboard, `interview/page.tsx` = existing interview entry.
4. **Navigation UX:** self-serve associates land on `/associate/[slug]/dashboard` post-login. Trainers viewing a roster entry land on `/associate/[slug]` (the profile). Different users, different default views.

Implementation plan:
- `/associate/[slug]/page.tsx` — stays as profile (minor trim: remove duplicate session list that will live on dashboard).
- `/associate/[slug]/dashboard/page.tsx` — NEW. Renders gap chart, recommended next area, streak widget, "Book Next Mock" CTA.
- `/associate/[slug]/layout.tsx` — NEW. Shared `AssociateNav` with tabs: Overview (profile), Dashboard, History.

---

## 6. Cached Manifest Layer

### 6.1 Location & Pattern

**Cache in the `/api/github` route handler (server-side), NOT in `src/lib/github-service.ts`** (which currently runs client-side — it calls `/api/github`).

Recommended: new module `src/lib/github-manifest-cache.ts` imported by `/api/github/route.ts`.

```ts
// src/lib/github-manifest-cache.ts
interface CacheEntry {
  data: unknown;
  etag: string | null;
  fetchedAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 min
const cache = new Map<string, CacheEntry>();

export async function getCachedManifest(path: string, fetchFn: () => Promise<{ data: unknown; etag: string | null }>): Promise<unknown> {
  const key = path;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit.data;

  // Stale or missing — conditional GET with If-None-Match
  const fresh = await fetchFn(); // fetchFn sends If-None-Match: hit?.etag internally
  cache.set(key, { data: fresh.data, etag: fresh.etag, fetchedAt: Date.now() });
  return fresh.data;
}
```

### 6.2 Per-Process or Shared?

**Per-process is fine.** Single Docker container on GCE = single Node process = single Map instance. No cross-instance coordination needed.

If the deploy scales horizontally (v1.3 Cloud Run), migrate to Redis (Upstash free tier) or Supabase Postgres with a `manifest_cache` table. Out of scope for v1.2.

### 6.3 Invalidation Strategy — TTL + ETag Hybrid

- **TTL:** 5 minutes — hard upper bound on staleness.
- **ETag:** on cache miss OR TTL expiry, send `If-None-Match` to GitHub. On `304 Not Modified`, refresh the `fetchedAt` timestamp without re-parsing (extends TTL without re-downloading). On `200`, parse and store new ETag.
- **Manual bust:** expose `/api/github/cache/invalidate` (trainer-only, POST) for editor-driven immediate refresh after a question bank update. Clears the Map.

**Why hybrid:** TTL alone is wasteful on unchanged repos (refetches every 5min); ETag alone requires a round-trip on every request. Combined: 1 round-trip per 5min per path, and that round-trip is a 304 (bytes-cheap) most of the time.

### 6.4 Target Perf

Wizard manifest fetch: current ~2-4s (cold) → cached hit <5ms (in-memory Map lookup), 304 path ~150ms. Meets stated <400ms target comfortably.

---

## 7. Bulk Invite Pipeline

### 7.1 Route & Contract

`POST /api/trainer/invites/bulk` — trainer-only.

```ts
// Request
{
  emails: string[];              // comma-sep parsed client-side into array
  cohortId: number;
  displayNames?: Record<string, string>;  // optional email -> name map
}

// Response
{
  created: Array<{ email: string; associateId: number; slug: string }>;
  skipped: Array<{ email: string; reason: 'duplicate' | 'invalid_email' }>;
  failed:  Array<{ email: string; reason: string }>;
}
```

### 7.2 Transaction Boundaries

**Per-email transaction, not batch.** Rationale:

- Supabase Auth `admin.createUser` + magic-link send are network calls that can partially fail.
- Wrapping all 50 emails in one DB transaction means a single Supabase Auth hiccup rolls back all work.
- Per-email: `Associate` upsert + (optional) cohort assignment + curriculum inheritance all in one Prisma `$transaction`. Supabase Auth call happens INSIDE the transaction **after** the DB write succeeds, but a failed Supabase call rolls back that single associate.

```ts
for (const email of emails) {
  try {
    await prisma.$transaction(async (tx) => {
      const slug = deriveSlugFromEmail(email);
      const associate = await tx.associate.upsert({
        where: { email },
        create: { email, slug, cohortId, displayName: displayNames?.[email] },
        update: { cohortId }, // reassign cohort if existing
      });

      // Create Supabase auth user + send magic link
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { role: 'associate', slug, associateId: associate.id },
      });
      if (error) throw error;

      await tx.associate.update({
        where: { id: associate.id },
        data: { authUserId: data.user.id },
      });
    });
    created.push({ email, ... });
  } catch (err) {
    failed.push({ email, reason: String(err) });
  }
}
```

### 7.3 Idempotency

**Key: `email` is unique on `Associate`.** Re-running the same bulk invite:

- Existing associate, same cohort: skip (record as `skipped: 'duplicate'`).
- Existing associate, different cohort: reassign cohort (update-only, no new auth user, no new magic link).
- Net-new email: full create flow.

Supabase Auth `inviteUserByEmail` is itself idempotent-ish — calling it twice for the same email re-sends the magic link. Add a `lastInvitedAt` field on `Associate` and throttle: reject re-invite if sent within last 5 minutes (prevents trainer mis-click spam).

### 7.4 Rate Limiting

- **Trainer action level:** max 1 bulk invite call per trainer per 30 seconds (prevents accidental double-submit). Use existing `rateLimitService.ts` with a new key `bulk-invite:{trainerUserId}`.
- **Per-email send rate:** cap batch size at 50 emails per call. If trainer needs more, paginate client-side.
- **Supabase Auth limits:** Supabase free tier sends up to ~30 emails/hour via built-in SMTP. **Plan for custom SMTP (Resend — already in stack)** configured in Supabase Auth settings. This unlocks Resend's rate limits (plenty for training-org scale).

### 7.5 Curriculum Assignment

Curriculum is already cohort-scoped (`CurriculumWeek.cohortId`). No per-associate curriculum assignment — when the associate lands in a cohort, they see that cohort's curriculum via existing `curriculumFilter.ts`. **No new schema, no new logic here.** The "cohort + curriculum assignment" mentioned in PIPELINE.md reduces to "assign cohort" in the bulk flow.

---

## Component Boundaries Summary

| Component | Responsibility | Communicates With |
|---|---|---|
| `src/lib/identity.ts` (rewritten) | Supabase session → CallerIdentity | Supabase server client, Prisma |
| `src/middleware.ts` (rewritten) | Cookie-only Supabase session check + role gate | Supabase SSR client |
| `src/lib/analyticsService.ts` (NEW) | KPI aggregates, cohort trends, variance queries | Prisma `$queryRaw` |
| `src/lib/github-manifest-cache.ts` (NEW) | In-memory cached manifest with ETag | GitHub API (via existing fetch) |
| `src/lib/supabase-admin.ts` (NEW) | Service-role client for auth user provisioning | Supabase JS SDK |
| `src/lib/bulk-invite.ts` (NEW) | Bulk invite orchestration, idempotency, throttling | Prisma, supabase-admin |
| `src/app/trainer/layout.tsx` (NEW) | Topbar + sidebar shell | Child routes, auth guard |
| `src/app/associate/[slug]/dashboard/page.tsx` (NEW) | Associate self-view dashboard | Prisma, analytics service |

---

## Patterns to Follow

### Pattern 1: Supabase Server Client Per Request
Next.js App Router + `@supabase/ssr` — create a fresh server client per request via `cookies()` adapter. Never cache across requests.

### Pattern 2: RLS as Defense, App Layer as Primary
All Prisma queries go through service-role key with explicit authorization filters in application code (e.g., `WHERE associateId = $identityAssociateId`). RLS policies exist as a safety net.

### Pattern 3: Nested Layouts for Shells
Use Next.js layout.tsx files for persistent shells (trainer dashboard topbar+sidebar, associate tab nav). Do NOT put shell chrome in every page.tsx.

### Pattern 4: Raw SQL for Aggregations
Prisma `$queryRaw` with tagged template literals (safe from injection) for analytics queries. ORM query builder is wrong fit for `GROUP BY date_trunc(...)` style work.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Request Prisma Client with `SET LOCAL`
**Why bad:** Transaction Pooler (pgBouncer transaction mode) does not preserve session GUCs. Will cause subtle "RLS works sometimes" bugs.
**Instead:** service-role Prisma + app-layer auth + RLS as defense.

### Anti-Pattern 2: Big-Bang Auth Migration
**Why bad:** One PR that rips out PIN + adds Supabase + deletes feature flag = high blast radius, hard rollback.
**Instead:** Four sequential commits — (1) Supabase alongside PIN, (2) data migration, (3) flip middleware, (4) delete PIN + flag.

### Anti-Pattern 3: Modal for `/trainer/[slug]`
**Why bad:** Breaks deep-linking, back button, layout inheritance.
**Instead:** child route. Intercepting routes for drawer UX is a v1.3 polish.

### Anti-Pattern 4: Forgetting to Return Same `response` from Middleware
**Why bad:** Supabase's `getUser()` writes refreshed cookies onto the response object; creating a fresh `NextResponse.next()` at the end discards them, causing auth flapping on every request.
**Instead:** mutate + return same response.

### Anti-Pattern 5: Materialized Views at Current Scale
**Why bad:** Adds refresh scheduling complexity; premature optimization for <25k session rows.
**Instead:** inline aggregation with raw SQL. Revisit at 2000+ associates.

---

## Scalability Considerations

| Concern | Current (<500 assoc) | 2k assoc | 10k assoc |
|---|---|---|---|
| Roster query | inline SQL, <100ms | inline + index on `cohortId` | materialized view, 5min refresh |
| Manifest cache | in-memory Map | in-memory Map | Redis/Upstash |
| Bulk invite | per-email serial, batch 50 | batch 200 + queue | job queue (BullMQ or pgboss) |
| RLS policies | defense only (service-role Prisma) | same | same |
| Session count per associate | unbounded | archive >180d to cold storage | partition `Session` by month |

---

## Sources

- Supabase SSR + Next.js App Router official guide: https://supabase.com/docs/guides/auth/server-side/nextjs (HIGH — direct pattern match, verified current 2026)
- Supabase RLS policies with `auth.uid()` and `auth.jwt()`: https://supabase.com/docs/guides/database/postgres/row-level-security (HIGH)
- Supabase Admin API `inviteUserByEmail`: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail (HIGH)
- Prisma + Supabase Transaction Pooler connection pattern: https://supabase.com/docs/guides/database/prisma (HIGH — confirms `SET LOCAL` RLS integration is not pooler-friendly)
- Next.js 16 App Router layouts: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates (HIGH)
- Direct code inspection: `src/lib/identity.ts`, `src/middleware.ts`, `src/lib/associateSession.ts`, `src/lib/pinService.ts`, `src/lib/auth-server.ts`, `src/lib/prisma.ts`, `src/lib/github-service.ts`, `src/lib/featureFlags.ts`, `prisma/schema.prisma`, `src/app/trainer/page.tsx`, `src/app/associate/[slug]/page.tsx`, `.planning/PROJECT.md`, `.planning/PIPELINE.md` (HIGH — current codebase state, 2026-04-15)
