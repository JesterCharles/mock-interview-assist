# Technology Stack — Milestone v1.2 (Analytics & Auth Overhaul)

**Project:** Next Level Mock (NLM)
**Researched:** 2026-04-15
**Overall confidence:** MEDIUM-HIGH (network access denied during research → version pins verified against locked package.json + training data; Supabase SSR patterns verified from training-data + project conventions)

---

## Critical Finding: Supabase Client Is Not Yet Installed

CLAUDE.md narrative lists `@supabase/supabase-js 2.103.0` and `@supabase/ssr 0.10.2` as part of the stack, but **neither appears in `package.json` as of 2026-04-15**. This milestone is therefore a **greenfield auth install**, not an upgrade. Plan budget accordingly — there is no baseline integration to preserve.

Prisma remains the data-access layer for application queries. The Supabase JS SDK only enters the runtime path for auth (cookie session management + admin invite API), not general data reads/writes.

---

## Recommended Stack (Additions for v1.2)

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@supabase/supabase-js` | `^2.45.0` (pin to latest 2.x minor) | Admin API for bulk invites + magic link generation | Server-side only. Used via `createClient` with `SUPABASE_SERVICE_ROLE_KEY` for `auth.admin.inviteUserByEmail` and `auth.admin.generateLink`. Do NOT use for data queries — Prisma owns that. |
| `@supabase/ssr` | `^0.5.0` or newer | Next.js App Router cookie-aware auth client | Replaces deprecated `@supabase/auth-helpers-nextjs`. Provides `createServerClient` / `createBrowserClient` with proper cookie adapters for Next 16 server components, route handlers, and middleware. |

**Confidence:** MEDIUM on exact version numbers (network verification blocked). Pin via `npm install @supabase/supabase-js@latest @supabase/ssr@latest` at plan time and record resolved versions in PLAN.md. The CLAUDE.md-claimed `0.10.2` for `@supabase/ssr` is plausible as a forward-looking value but should be verified live before install — if npm shows a different latest, prefer that.

### Auth Architecture Pattern (Next.js 16 App Router)

**Three client factories required** (`src/lib/supabase/`):

1. `server.ts` — `createServerClient` for Server Components + Route Handlers. Reads cookies via `next/headers` `cookies()`.
2. `middleware.ts` — `createServerClient` variant that both reads and writes cookies on the `NextResponse`. Refreshes the session token on every matched request.
3. `admin.ts` — plain `createClient(url, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })`. Server-only module; must NEVER be imported from client bundles. Guard with `import 'server-only'`.

**Middleware flow (`src/middleware.ts`):**
- Currently cookie-only (trainer + associate cookies). After v1.2 cutover: middleware runs `supabase.auth.getUser()` to refresh the Supabase session cookie on every request, then reads claims from the refreshed session to enforce route guards.
- Role distinction (trainer vs associate) moves from cookie-name parsing to user metadata or a `public.user_roles` table join. Simplest: set `app_metadata.role = 'trainer' | 'associate'` at invite-time via admin API and read it from the JWT claims.
- `src/lib/identity.ts` (`getCallerIdentity`) refactors to read Supabase session instead of the custom `nlm_session` + `associate_session` cookies.

**Confidence:** HIGH on pattern (this is the documented Supabase + Next 15/16 App Router canonical flow).

### Row-Level Security (RLS)

Enable RLS on: `Session`, `GapScore`, `Cohort`, `CurriculumWeek`, `Associate`.

**Policy shape (recommended):**

```sql
-- Trainer role sees everything (read + write)
CREATE POLICY "trainer_all" ON "Session"
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'trainer')
  WITH CHECK (auth.jwt() ->> 'role' = 'trainer');

-- Associate sees only their own rows
CREATE POLICY "associate_own_sessions" ON "Session"
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'associate'
    AND "associateId" = (
      SELECT id FROM "Associate" WHERE "authUserId" = auth.uid()
    )
  );
```

**Critical gotchas:**

1. **Prisma bypasses RLS by default.** Prisma connects as the Postgres role specified in `DATABASE_URL` — typically `postgres` or `service_role`-equivalent which has `BYPASSRLS`. RLS will protect direct Supabase client queries but NOT Prisma queries. Two options:
   - **Option A (recommended for v1.2):** Keep Prisma as-is (bypassing RLS), enforce authorization in route handlers via `getCallerIdentity`. RLS becomes defense-in-depth if the Supabase JS client is ever used for data reads (e.g., future Realtime subscriptions).
   - **Option B (heavier):** Switch Prisma to a non-privileged role and set `request.jwt.claims` per transaction via `SET LOCAL`. This enforces RLS on every Prisma query but requires a per-request Prisma middleware and loses connection pool reuse. Defer to v1.3+.
2. **Associate → auth.users FK migration.** Current schema: `Associate.id` is app-generated. Add nullable `Associate.authUserId uuid REFERENCES auth.users(id) ON DELETE SET NULL`. Backfill during invite flow — each bulk invite resolves (or creates) an `auth.users` row, then updates the `Associate` record. Do NOT hard-cut `Associate` to `auth.users` as primary key in v1.2 (too much downstream FK churn in `Session`, `GapScore`). Keep `Associate.id` as the app PK, treat `authUserId` as the identity link.
3. **Cross-schema FKs to `auth.users`** require the DB role running migrations to have `REFERENCES` privilege on `auth.users`. Supabase grants this to `postgres` but not to `service_role` by default — run the migration via `DIRECT_URL` which uses the `postgres` role.

**Confidence:** HIGH on policy patterns, HIGH on the Prisma-bypasses-RLS caveat (known Prisma + Supabase integration issue documented in Supabase community repeatedly).

### Bulk Invite / Magic-Link Delivery

**Recommended flow (scale ≤ 50 invites per action):**

| Step | Method | Notes |
|------|--------|-------|
| 1. Parse emails | Zod schema (comma/newline-split, trim, lowercase, email validation) | Cap at 50 per request to stay under Supabase rate limits. |
| 2. Upsert `Associate` rows | Prisma transaction | Create with `displayName` placeholder derived from email local-part, `cohortId` assigned. |
| 3. Create auth users | `supabase.auth.admin.inviteUserByEmail(email, { data: { role: 'associate', associate_id, cohort_id } })` | Supabase generates and sends invite email automatically. Use this over `generateLink` + manual Resend unless you need custom email templates. |
| 4. Backfill `authUserId` | Prisma update | Resolve from invite response `data.user.id`. |
| 5. Return summary | JSON | `{ invited: n, skipped_existing: m, failed: [{email, reason}] }` |

**`inviteUserByEmail` vs `generateLink` + Resend tradeoffs:**

| Criterion | `inviteUserByEmail` (Supabase-sent) | `generateLink` + Resend |
|-----------|-------------------------------------|-------------------------|
| Setup effort | Lowest — configure SMTP in Supabase dashboard | Custom email template work |
| Email branding | Supabase default template (configurable) | Full control via Resend |
| Deliverability | Supabase default SMTP (low-volume limits on free tier) | Resend (already integrated, proven) |
| Rate limit | Supabase auth rate limit (typically 3-4/hr per email on default SMTP; higher with custom SMTP) | Resend plan limits (100/day free, higher paid) |

**Recommendation:** Use `supabase.auth.admin.generateLink({ type: 'invite', email })` to get the magic link server-side, then send via Resend using the existing integration. This gives branded email + proven deliverability, reuses v1.0's email infrastructure, and sidesteps Supabase SMTP rate limits. Supabase still tracks the token and validates it on callback.

**Rate limit considerations:**
- Supabase Auth has per-project rate limits (see dashboard → Auth → Rate Limits). Defaults for `/auth/v1/*` endpoints are roughly 30 req/5min on some buckets — `generateLink` calls should be batched with 100-200ms jitter between calls to stay safe.
- Resend: existing plan limit applies. For 50-associate cohort invite, this is one batch of 50 emails — well within any paid tier.

**Confidence:** HIGH on architecture. MEDIUM on exact Supabase rate-limit numbers (they change; always check dashboard before shipping).

### Charts — Already in Stack

| Technology | Version (locked) | Purpose | Why |
|------------|------------------|---------|-----|
| `recharts` | `^3.8.1` | KPI micro-charts, sparklines, cohort trends, gap aggregation bars | Already in use for gap trend charts. Native sparkline support via `<LineChart>` with hidden axes + tiny dimensions. No axis/tooltip sparkline minimum required. React 19 compatible. |

**Sparkline pattern:**
```tsx
<LineChart width={80} height={24} data={series}>
  <Line type="monotone" dataKey="score" stroke="var(--nlm-accent)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
</LineChart>
```

**Confidence:** HIGH. No change needed. Recharts covers all v1.2 chart needs (KPI cards, sparklines, cohort trend lines, gap bar aggregation). No need for Tremor or Nivo.

### PDF Export — Already in Stack

| Technology | Version (locked) | Purpose | Why |
|------------|------------------|---------|-----|
| `@react-pdf/renderer` | `^4.3.1` | Trainer analytics PDF export (cohort + per-associate reports) | Already generates interview reports. Supports tables via `<View>` flex layouts, embedded images, and charts via SVG rendering. |

**Chart-in-PDF approach:** `@react-pdf/renderer` does NOT render recharts directly (recharts outputs to DOM SVG, not PDF). Two options:

1. **Recommended:** Pre-render recharts to SVG string server-side (via `renderToStaticMarkup` or equivalent), then embed via `<Svg>` component in react-pdf. Works for static/server-generated reports.
2. **Fallback:** Use `@react-pdf/renderer` primitives (`<Line>`, `<Path>`, `<Rect>`) to draw simple charts directly. More work but zero DOM dependency.

**Confidence:** HIGH. Verified pattern — project already uses react-pdf successfully.

### Question-Bank Manifest Caching

**Recommendation: In-memory TTL cache + optional content-hash invalidation. Do NOT add Redis/KV.**

| Option | Verdict | Reason |
|--------|---------|--------|
| Next.js `unstable_cache` | ❌ Skip | Name signals instability; semantics changed across Next versions; tied to Next's fetch cache which has had correctness issues in Next 15/16. |
| `revalidateTag` + `fetch` cache | ⚠️ Possible | Works for GitHub API calls if they go through `fetch()`. Still depends on Next's fetch cache behavior. Invalidation requires a tag-revalidate route. |
| Simple module-level `Map` + TTL | ✅ Recommended | Zero deps. Survives within the Docker container lifetime. Per-manifest TTL (e.g., 10 min) + optional SHA-based invalidation when GitHub webhook / manual trigger fires. |
| Redis / KV | ❌ Skip | No current Redis infra on GCE. Adds ops burden for a single cache use case. Reconsider when multi-instance scaling arrives. |

**Implementation shape (`src/lib/manifestCache.ts`):**

```ts
type CacheEntry<T> = { value: T; expiresAt: number; etag?: string };
const cache = new Map<string, CacheEntry<unknown>>();

export async function getCachedManifest(repoKey: string, ttlMs = 10 * 60 * 1000) {
  const hit = cache.get(repoKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const { manifest, etag } = await fetchFromGitHub(repoKey, hit?.etag);
  cache.set(repoKey, { value: manifest, expiresAt: Date.now() + ttlMs, etag });
  return manifest;
}
```

Use GitHub's `If-None-Match` + ETag headers to short-circuit full manifest re-download on cache miss (304 response means reuse previous value + reset TTL). This gives the `<400ms` target without requiring manual invalidation.

**Admin invalidation endpoint:** `POST /api/admin/manifest/invalidate` (trainer-auth-gated) that clears the `Map` entry — trigger manually after pushing new questions to the bank repo.

**Multi-instance caveat:** Cache is per-container. On GCE single-instance deploy this is fine. If scaling to multiple NLM instances behind a load balancer, cache warming becomes uneven but correctness is preserved (each instance lazily populates). Add Redis when that scaling actually happens.

**Confidence:** HIGH on recommendation. In-memory TTL is the standard solo-dev solution for this problem shape.

---

## Existing Stack (No Change Required for v1.2)

| Technology | Version | Status |
|------------|---------|--------|
| Next.js | `^16.2.3` | ✓ App Router middleware refactor required for Supabase session refresh |
| React | `19.2.3` | ✓ |
| Prisma | `^7.7.0` | ✓ Schema migration required: add `Associate.authUserId` |
| `@prisma/adapter-pg` | `^7.7.0` | ✓ |
| Tailwind CSS | `^4` | ✓ Dashboard redesign uses existing DESIGN tokens |
| Zod | `^4.3.6` | ✓ Use for bulk-invite email list validation |
| Zustand | `^5.0.9` | ✓ Analytics dashboard state — evaluate per-phase; server components may suffice |
| Recharts | `^3.8.1` | ✓ |
| `@react-pdf/renderer` | `^4.3.1` | ✓ |
| Resend | `^6.10.0` | ✓ Bulk-invite delivery |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth library | `@supabase/ssr` + `supabase-js` | NextAuth.js / Auth.js | Adds second auth system. Supabase RLS needs Supabase-issued JWTs; NextAuth sessions are opaque to Postgres. Fighting the platform. |
| Auth library | `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Deprecated. Replaced by `@supabase/ssr`. |
| Magic link delivery | `generateLink` + Resend | `inviteUserByEmail` (Supabase SMTP) | Existing Resend integration + deliverability + branded templates. Supabase default SMTP has low rate limits. |
| Magic link delivery | `generateLink` + Resend | Custom JWT tokens + `/api/auth/claim` | Rebuilds what Supabase already ships. No advantage. |
| RLS enforcement path | Route-handler checks (`getCallerIdentity`) | Prisma-per-request RLS context | Prisma-level RLS doubles connection count and complicates pooling. Route handler checks are sufficient for v1.2 threat model; RLS is defense-in-depth for any future Supabase JS data reads. |
| Charts | Recharts 3.8.1 | Tremor | Tremor requires React 18; NLM runs React 19. Already decided in v1.0. |
| Manifest cache | In-memory Map + TTL | Redis / Upstash KV | No Redis infra. Solo dev. Single-instance deploy. Overkill. |
| Manifest cache | In-memory Map + TTL | Next.js `unstable_cache` | Unstable by name and behavior across Next versions. In-memory is predictable. |
| Dashboard data fetching | RSC + Prisma | TanStack Query | Analytics data is read-heavy, not real-time. RSC caching + manual `revalidatePath` on mock completion covers the requirement. |
| Associate identity migration | Nullable `authUserId` FK | Swap `Associate.id` → `auth.users.id` | Every child table (`Session`, `GapScore`, `Cohort.associates`) would need FK surgery. Nullable bridge column is reversible and incremental. |

---

## Installation

```bash
# Auth stack — verify latest versions at install time
npm install @supabase/supabase-js@latest @supabase/ssr@latest

# No other new deps required. Charts, PDF, validation, email already present.
```

**Post-install verification steps:**
1. `npx tsc --noEmit` — confirm no type regressions
2. `npm run build` — confirm standalone Docker output still resolves (Supabase SDK is ESM-friendly, expected clean)
3. Smoke test: call `createServerClient` in a dummy route handler — confirm cookie adapter wires correctly

---

## Environment Variables to Add

```bash
# Supabase Auth (already have NEXT_PUBLIC_SUPABASE_URL + anon key if previously scaffolded; confirm)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # Server-only. Never expose. Used by admin invite API.

# Optional — override auth redirect URL (defaults to origin/auth/callback)
NEXT_PUBLIC_SITE_URL=https://<prod-domain>
```

**Deprecate after v1.2 cutover:**
- `APP_PASSWORD` — replaced by Supabase trainer login
- `ASSOCIATE_SESSION_SECRET` — replaced by Supabase JWT
- `ENABLE_ASSOCIATE_AUTH` — flag removed (feature always on post-cutover)

---

## Key Risks

1. **RLS + Prisma mismatch (HIGH confidence, MEDIUM severity).** Enabling RLS while Prisma continues using a `BYPASSRLS` role means RLS provides zero protection against Prisma queries. Route-handler authorization remains the real enforcement. Document this explicitly in ARCHITECTURE.md so the next contributor doesn't assume RLS is load-bearing.

2. **Supabase SMTP rate limits on default invite flow (HIGH confidence, MEDIUM severity).** If using `inviteUserByEmail` with default Supabase SMTP, a 50-person cohort invite will hit rate limits. Mitigation: use `generateLink` + Resend delivery as recommended above.

3. **`auth.users` FK permissions (MEDIUM confidence, LOW severity).** Cross-schema FKs require `REFERENCES` privilege. Migrations must run via `DIRECT_URL` (the `postgres` role), not the pooler URL. Already the convention for Prisma migrations in this project — low real risk but worth calling out in MIGRATION.md.

4. **PIN system removal + existing associate data migration (HIGH confidence, MEDIUM severity).** Every existing `Associate` row needs an `auth.users` counterpart before PIN code paths can be deleted. Migration phase must: (1) add `authUserId` column nullable, (2) backfill script that sends magic-link invites to all existing associates with emails, (3) data integrity check that every live `Associate` has `authUserId != null`, (4) then delete PIN columns/routes/flag. Plan as a 3-step phase.

5. **Middleware DB cost (MEDIUM confidence, LOW severity).** `supabase.auth.getUser()` in middleware hits Supabase auth servers on every request. Cache-friendly (Supabase optimizes this) but worth monitoring P95 latency after cutover.

6. **`@supabase/ssr` version drift (LOW confidence on current latest).** Network verification was blocked during research. Before installing, verify latest version with `npm view @supabase/ssr version` and check for any App Router breaking changes in the 0.5.x+ series. The `0.10.2` value asserted in CLAUDE.md narrative could not be verified live.

---

## Sources & Confidence

| Area | Source | Confidence |
|------|--------|-----------|
| Existing stack versions | `/Users/jestercharles/mock-interview-assist/package.json` (direct read) | HIGH |
| Supabase SSR auth pattern | Training data + Supabase docs convention (well-established pattern) | HIGH |
| RLS + Prisma bypass behavior | Known Prisma + Supabase integration caveat, widely documented in community | HIGH |
| `auth.admin.generateLink` / `inviteUserByEmail` semantics | Training data on Supabase Auth Admin API | HIGH |
| Supabase rate limits (exact numbers) | Training data only — values change; verify in dashboard | MEDIUM |
| Exact `@supabase/ssr` latest version | Unverified — WebFetch/Bash blocked during research | LOW — verify at install time |
| Recharts sparkline pattern | Existing code conventions + recharts API training data | HIGH |
| `@react-pdf/renderer` chart embedding | Training data + project already uses it successfully | HIGH |
| In-memory cache recommendation | Ecosystem standard for single-instance Node servers | HIGH |

**Flagged for runtime verification before Phase-1 install:**
- Latest `@supabase/supabase-js` and `@supabase/ssr` versions
- Current Supabase Auth rate-limit defaults (dashboard)
- Supabase SMTP quota on current project plan
