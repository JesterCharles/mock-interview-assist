# Domain Pitfalls — v1.2 Analytics & Auth Overhaul

**Domain:** Supabase Auth cutover + RLS + bulk magic-link onboarding + dashboard redesign + analytics + cached manifest
**Researched:** 2026-04-15
**Confidence:** HIGH (Supabase Auth/SSR/RLS pitfalls are well-documented and directly mapped to existing code paths)

---

## Critical Pitfalls

### 1. Prisma silently bypasses RLS (the #1 Supabase + Prisma footgun)

**What goes wrong:** RLS policies on `Session`, `GapScore`, `Cohort`, `CurriculumWeek` appear correct in SQL, but every Prisma query still returns all rows regardless of the authenticated user.

**Why it happens:** Prisma connects via a single pooled Postgres role (the one in `DATABASE_URL`). By default that role is either the Supabase `postgres` superuser-equivalent or a role with `BYPASSRLS`. Even when RLS is enabled on a table, `auth.uid()` inside policies evaluates to `NULL` because no JWT is attached to the connection — PostgREST/`supabase-js` inject the JWT per request via `SET LOCAL role` + `SET LOCAL request.jwt.claims`, but **Prisma does none of that**.

**Consequences:**
- "We have RLS" becomes a false sense of security in code review / audit. Cross-tenant data leak risk at moment of multi-tenant expansion.
- On the flip side, enabling RLS without compensating Prisma can silently return **zero** rows in production when a policy is strict and `auth.uid()` is null — looks like an outage, not a security bug.

**Prevention (decision required in planning):**
- **Option A (recommended for solo-dev timeline):** Treat RLS as defense-in-depth only. Keep all queries server-side through Prisma (service-role-equivalent), enforce tenancy in **application code** (every query filters by `associateId` / `cohortId` resolved from the Supabase session). Document loudly that RLS is not the enforcement boundary.
- **Option B (true RLS):** Every Prisma call wraps a transaction that does `SET LOCAL role authenticated; SET LOCAL request.jwt.claims = '{...}';` using the verified Supabase JWT. Requires a custom Prisma middleware/extension. High complexity.
- **Option C:** Read through `@supabase/supabase-js` server client (which DOES propagate JWT → RLS), writes through Prisma. Bifurcated data access layer — high maintenance cost, confusing.

**Detection:** Write a failing test that connects as user A and queries `prisma.session.findMany()` expecting only A's sessions. If it returns everyone's sessions, Option A is what you actually have.

**File references:**
- `src/lib/prisma.ts` — singleton Prisma client, no JWT plumbing
- `src/lib/sessionPersistence.ts`, `src/lib/gapPersistence.ts`, `src/lib/trainerService.ts` — every read/write happens here without tenancy filters in some paths (e.g., roster listing assumes "trainer sees everyone")

---

### 2. Supabase SSR cookie-jar confusion (request vs response) — silent session loss

**What goes wrong:** Users appear logged in but every server component sees them as anonymous. Or conversely, sessions refresh correctly on first load but never get re-persisted, so the user is logged out after 60 minutes.

**Why it happens:** `@supabase/ssr` requires you to supply both a `getAll` reader (from `request.cookies`) **and** a `setAll` writer (to `response.cookies`). The exact object you must write to differs in three contexts:
1. Middleware — write to `NextResponse.next()` response (not request)
2. Route handler — write via `cookies()` from `next/headers`
3. Server component — read-only; `setAll` must be a no-op or throw (Next.js forbids cookie writes from server components)

If middleware refreshes the token but doesn't propagate the new cookie onto the response, the refreshed JWT is lost and the client keeps sending the old (soon-expired) token.

**Consequences:** Intermittent 401s, "why does my session drop?" bug reports, can't repro locally.

**Prevention:**
- Follow the exact pattern from Supabase's official Next.js App Router guide. Do not improvise.
- Middleware MUST call `supabase.auth.getUser()` (not `getSession()`) to trigger refresh, and MUST return the response whose cookies were mutated.
- Put ALL Supabase session refresh logic in a single helper (`src/lib/supabase/middleware.ts`). Import from middleware. Don't duplicate.

**File references:**
- `src/middleware.ts:29-58` — current middleware is cookie-read-only; v1.2 needs to insert Supabase session refresh BEFORE the identity check.

**Source:** https://supabase.com/docs/guides/auth/server-side/nextjs (confidence HIGH — official docs, version-aware)

---

### 3. Middleware ordering: Supabase refresh must run before route guards

**What goes wrong:** Every protected route bounces to `/signin` on the exact moment the JWT expires, because the guard reads `auth.uid()` before `supabase.auth.getUser()` refreshes the cookie.

**Why it happens:** In our current middleware (`src/middleware.ts:37`), `getCallerIdentity` runs first and returns `anonymous` for a stale Supabase cookie. The route guard redirects before the Supabase client has a chance to auto-refresh.

**Prevention:** Rewrite middleware flow:
1. Create Supabase server client bound to `request` + `response`
2. `await supabase.auth.getUser()` — this may refresh + write new cookies to `response`
3. THEN run `getCallerIdentity` (rewritten to use the Supabase user)
4. Return the `response` (not `NextResponse.next()` fresh) so refreshed cookies propagate

**Detection:** Test with `JWT_EXPIRY=60` in a staging Supabase project — log in, wait 65 seconds, click a protected link. If you're bounced to `/signin`, middleware order is wrong.

**File references:** `src/middleware.ts` (full rewrite required)

---

### 4. Associate → auth.users migration: email conflicts + associates without emails

**What goes wrong:** Existing `Associate` rows have `slug` + `displayName` but no `email`. Migrating to `auth.users` FK requires every associate to have a unique email. Options:
- Backfill fake emails (e.g., `slug@placeholder.local`) → associates can't actually log in until a trainer sets a real email → bulk invite flow must be re-run for every existing associate
- Skip migration for emailless associates → orphaned rows, split schema (some associates have `authUserId`, some don't)
- Require trainer to paste email for every existing associate before cutover → manual toil

**Email collision risk:** If two associates share an email (rare but plausible — family members, trainers using personal email for testing), `auth.users.email` unique constraint fails the migration mid-run.

**Prevention:**
- Audit existing Associate rows BEFORE planning cutover: `SELECT id, slug, displayName FROM "Associate"` — eyeball count, check for expected emails elsewhere (session candidateName?)
- Decide: (a) hard cutover with email backfill from a trainer-provided CSV, or (b) soft migration where `authUserId` is nullable and PIN auth remains for emailless associates until they're invited
- Migration script must be idempotent and must SELECT FOR UPDATE the email before INSERT into `auth.users` (or use Supabase Admin API `createUser` with error-on-conflict)
- Pre-migration dry run: emit a report of "N associates ready, M missing email, K email collisions"

**File references:**
- `prisma/schema.prisma:16-33` — `Associate` has no `email` column today
- Migration must add `email String? @unique` + `authUserId String? @unique` before cutover

---

### 5. RLS policy recursion on Cohort ↔ CurriculumWeek ↔ Associate ↔ Session

**What goes wrong:** Writing a policy like "associate can read their cohort's curriculum" requires a subquery against `Associate`. If `Associate` itself has a policy "associate can read own row" that references `Cohort`, and `Cohort` policy references `Associate.cohortId`, you can hit Postgres `infinite recursion detected in rules for relation` or a policy that never terminates for service-role-bypassed writes.

**Why it happens:** RLS policies run as SQL subqueries under the same role. If policy A references table B, policy B must be evaluatable under the same role without triggering A again unboundedly.

**Prevention:**
- Keep policies flat: use `auth.uid()` directly, not JOINs through other RLS-protected tables.
- Define a SQL function `get_my_associate_id()` marked `SECURITY DEFINER` (runs as owner, bypasses RLS) that returns `associateId` for the current `auth.uid()`. Use that function in every policy.
- Explicitly test each policy in isolation with `SET LOCAL role authenticated; SET LOCAL request.jwt.claims '{...}'; SELECT ...`.

**File references:** Policies to write for `Session`, `GapScore`, `Cohort`, `CurriculumWeek`, `Associate`. All need to resolve current associate without cross-table recursion.

---

### 6. Magic-link bulk send: Supabase invite rate limits + partial failures

**What goes wrong:** Trainer pastes 50 emails, clicks "Invite cohort," the first 30 succeed, requests 31-50 return `429 Too Many Requests`. Half the cohort has accounts, the trainer doesn't know which half.

**Why it happens:**
- Supabase Auth has an **email rate limit** (default: ~2 emails/hour on free tier, higher on Pro but still rate-limited). Using `supabase.auth.admin.inviteUserByEmail` in a loop will trip the limiter.
- No built-in batch API. Idempotency is manual.
- If you swap to sending magic links through custom SMTP (Resend, already in the stack), you bypass Supabase's email limit but must implement your own idempotency, token generation happens server-side via `supabase.auth.admin.generateLink({ type: 'magiclink', email })` which is NOT rate-limited the same way.

**Consequences:**
- Silent partial failures in UI — trainer sees "Invited!" but 20 associates never got an email
- Double-invites when trainer clicks retry (Supabase creates `auth.users` row on first invite; second invite for same email returns error but email is already in `auth.users` — need to handle "user already exists, resend link" path separately)

**Prevention:**
- Use Supabase **Admin API** (`createUser` or `generateLink`) + **send the email ourselves via Resend**. Completely sidesteps Supabase email rate limit.
- Make the bulk endpoint **idempotent**: for each email, `UPSERT` (email) into `auth.users`; if user exists, skip creation and just generate a fresh magic link.
- Return a structured result: `[{ email, status: 'invited' | 'already-registered' | 'sent-new-link' | 'failed', error? }, ...]`. UI renders a table.
- Extend magic-link expiry: default is **1 hour** — too short for bulk onboarding where associates check email later. Set to 24h minimum via Supabase dashboard auth settings OR use `email_otp` with `expires_in` parameter.
- Queue sends with a 250ms delay between Resend calls to stay under Resend's rate limit (10 req/s on free tier).

**Source:** Supabase Auth rate limits documented at https://supabase.com/docs/guides/auth/auth-smtp (confidence HIGH). Resend rate limits at https://resend.com/docs/api-reference/api-rate-limit.

---

### 7. Email deliverability: magic links land in spam

**What goes wrong:** Associates never see the magic-link email. It lands in spam because Resend's default `onboarding@resend.dev` sender has no DMARC alignment with the organization's domain, or because the subject line ("Sign in to Next Level Mock") + single-link body triggers spam filters.

**Why it happens:**
- Resend + Supabase both recommend sending from a verified domain (`auth@nextlevelmock.example.com`) with SPF + DKIM + DMARC records published on DNS. If not configured, Gmail/Outlook heavily penalize.
- Magic-link emails are inherently spammy in content shape (short, single link, action-oriented verbiage). Without reputation, they fail Bayesian filters.

**Prevention:**
- Verify sending domain in Resend dashboard BEFORE v1.2 ships. Publish SPF (`v=spf1 include:amazonses.com ~all`), DKIM (Resend provides the DKIM key), DMARC (`v=DMARC1; p=none; rua=mailto:postmaster@...`).
- Use a plausible "from" address matching the domain.
- Add plaintext alternative + reasonable body copy (not just a button).
- Test deliverability: send to a Gmail account, a Yahoo account, an Outlook.com account, AND a corporate-O365 tenant. Check spam folders.
- Stagger sends (see Pitfall 6) so spam filters don't flag as bulk-blast.

**Source:** Resend deliverability guide https://resend.com/docs/dashboard/domains/introduction (confidence HIGH).

---

### 8. Removing `ENABLE_ASSOCIATE_AUTH` — dangling references crash at runtime

**What goes wrong:** Flag is removed from `featureFlags.ts`, but `isAssociateAuthEnabled()` calls in server components, API routes, and tests reference it — TypeScript compiles (flag becomes always-true constant), tests pass, but prod crashes when a code path expects the old PIN endpoint to return 404 and instead gets a 500.

**Files with references (from grep):**
- `src/lib/featureFlags.ts` — function to delete
- `src/app/api/associate/pin/verify/route.ts` — entire file to delete
- `src/app/api/associate/pin/generate/route.ts` — entire file to delete
- `src/app/api/associate/interview/complete/route.ts` — currently flag-gated
- `src/app/api/associate/logout/route.ts` — associate logout, replace with Supabase signOut
- `src/app/api/associate/me/route.ts` — replace with Supabase getUser
- `src/app/api/associate/status/route.ts` — entire endpoint becomes obsolete
- `src/lib/identity.ts` — remove associate branch, replace with Supabase user resolution
- `src/lib/auth-server.ts` — remove `resolveAssociate` + `verifyAssociateToken` path
- `src/lib/associateSession.ts` — **entire file deletable post-cutover**
- `src/lib/pinService.ts` — **entire file deletable post-cutover**
- `src/lib/pinAttemptLimiter.ts` — deletable
- UI: `/signin` tabs, `GeneratePinButton.tsx`, any "PIN" copy
- DB migration: `ALTER TABLE "Associate" DROP COLUMN pinHash, DROP COLUMN pinGeneratedAt`

**Tests to rewrite:**
- `src/middleware.test.ts`
- `src/lib/identity.test.ts`
- `src/lib/auth-server.test.ts`
- `src/lib/pinService.test.ts` (delete)
- `src/app/api/associate/pin/verify/route.test.ts` (delete)
- `src/app/api/public/interview/complete/route.test.ts` — adjust

**Prevention:**
- Do cutover in TWO phases: (a) stop READING the flag (hard-code to true in code, migrate users to Supabase while PIN system is still present as fallback), (b) delete PIN code + columns only after a grace period and after every session in production has a Supabase-auth'd counterpart.
- Write a grep-based pre-ship check: `rg -n "ENABLE_ASSOCIATE_AUTH|pinHash|pinGeneratedAt|associate_session|verifyAssociateToken|isAssociateAuthEnabled" src/` must return zero before column-drop migration.
- Migration `DROP COLUMN` must be separate, reversible, and guarded — production runs it only after step (a) has been live for at least one full associate session cycle.

---

### 9. Active PIN sessions at cutover moment — mass-logout UX

**What goes wrong:** Deploy happens Monday 9am, 30 associates are mid-interview or logged in with `associate_session` cookies. Cutover invalidates those cookies instantly. Mid-interview sessions lose state, associates see "sign in" screen, panic.

**Why it happens:** The HMAC cookie (`associate_session` signed with `ASSOCIATE_SESSION_SECRET`, `src/lib/associateSession.ts:24-39`) is verified by `verifyAssociateToken`. Removing that verifier on cutover day = every cookie is instantly invalid.

**Prevention:**
- **Schedule cutover for a known-quiet window** (weekend, between cohorts).
- **Grace-period plan:** Keep `verifyAssociateToken` + `resolveAssociate` alive for ONE deploy cycle. Middleware accepts EITHER Supabase session OR legacy HMAC cookie. Banner in UI: "We've upgraded sign-in — your next login will use email magic link." After 2 weeks, delete legacy path.
- **Preserve interview state:** Zustand store persists to localStorage (`src/store/interviewStore.ts`). Even if cookie dies, the interview-in-progress survives page reload. Verify this manually before cutover.
- Drop `ASSOCIATE_SESSION_SECRET` from env ONLY after legacy verifier is deleted.

---

### 10. OAuth / redirect URL misconfiguration per environment

**What goes wrong:** Magic link in email points to `http://localhost:3000/auth/callback` in production, because the `emailRedirectTo` was hard-coded during dev and never env-scoped. Associates click the link → browser shows `ERR_CONNECTION_REFUSED`.

**Why it happens:** Supabase sends whatever URL you pass to `signInWithOtp({ options: { emailRedirectTo } })`. If you pass `http://localhost:3000/...`, that's what ends up in the email. Also: Supabase dashboard has an **allowlist** of redirect URLs — any URL not on the list is rejected, and the default after a new project is created is only `http://localhost:3000/**`.

**Prevention:**
- Compute `emailRedirectTo` from `NEXT_PUBLIC_SITE_URL` env var (set per environment: local, staging, prod).
- In Supabase dashboard → Authentication → URL Configuration, add both `https://nextlevelmock.example.com/**` AND `http://localhost:3000/**` (for local dev) AND any preview-deploy URL pattern.
- Add a boot-time assert in server code: if `NODE_ENV === 'production'` and `NEXT_PUBLIC_SITE_URL` starts with `http://localhost`, throw.

---

## Moderate Pitfalls

### 11. N+1 queries on roster sparklines

**What goes wrong:** Roster page renders 50 associates, each with a sparkline of last-10-session scores. Naive implementation: one query per associate for their sessions = 51 queries per page load. Page takes 3+ seconds.

**Prevention:**
- Single query: `SELECT associateId, date, overallTechnicalScore FROM "Session" WHERE associateId IN (...) ORDER BY date DESC LIMIT 10 PER associateId` — Postgres window function: `ROW_NUMBER() OVER (PARTITION BY associateId ORDER BY date DESC)`.
- Or compute sparkline data into a materialized denormalized column on Associate (`lastTenScores Float[]`) updated by the readiness pipeline.
- Add index on `Session(associateId, date DESC)` if not already present (schema currently indexes `cohortId` and `readinessRecomputeStatus` — check — `prisma/schema.prisma:60-61`).

---

### 12. PDF analytics export memory blowup with recharts SVG

**What goes wrong:** Cohort analytics PDF includes 10 sparklines + 1 gap-aggregation bar chart + 1 readiness-trend line chart. Each recharts component renders to SVG, then `@react-pdf/renderer` converts to its internal primitives. On a GCE `e2-micro` (1 GB RAM), the node process OOM-kills mid-render.

**Prevention:**
- Don't render recharts inside the PDF pipeline. Either: (a) server-generate simple SVG directly with a tiny helper (200 lines of `<polyline>` math), (b) use `@react-pdf/renderer`'s native chart primitives if they exist, or (c) render charts client-side, export PNG via `html-to-image`, embed PNG in PDF.
- Option (a) is cheapest: pre-v1.2 spike to write `sparkline(points: number[]): string` returning `<svg>...</svg>` takes ~1 hour.
- Memory cap: set Docker `mem_limit: 768m` on node container, test with a full cohort PDF.

---

### 13. Cache staleness on question-bank manifest

**What goes wrong:** Trainer pushes new questions to the GitHub repo. Setup wizard doesn't show them. Trainer reports a bug. Actual cause: in-memory manifest cache TTL is 1 hour.

**Prevention:**
- Use **hash-based invalidation**, not TTL. Fetch GitHub `ref` commit SHA cheaply (single GraphQL call or `GET /repos/{o}/{r}/commits/{branch}` returns SHA in <50ms). Cache key = SHA. If SHA changed → invalidate.
- OR: TTL of 5 minutes + explicit "Refresh" button in trainer UI that clears the cache.
- Surface cache age in the wizard ("Questions last synced 2 min ago") so trainer understands staleness.

---

### 14. Multi-worker cache divergence

**What goes wrong:** If Docker ever scales to 2 replicas, each has its own in-memory manifest cache. Worker A refetches at T=0, Worker B at T=30s. Trainer's "refresh" request hits A; next request hits B with stale data.

**Prevention:**
- Today NLM runs single-container on GCE. Document "single replica assumption" in code comment at the cache site.
- When scaling: move cache to Redis (Upstash free tier) or Supabase itself (table with single row + `updatedAt`).
- Trivially: skip the cache, always fetch from GitHub — 300ms overhead on wizard load is acceptable for now.

---

### 15. KPI staleness vs real-time tradeoff

**What goes wrong:** KPI strip shows "Mocks This Week: 12" but a trainer just completed the 13th interview 30 seconds ago. They refresh — still 12. Confusion.

**Prevention:**
- KPI queries are cheap aggregates (`SELECT COUNT(*) FROM Session WHERE date >= ...`). Compute on every request — no cache needed.
- Use Next.js `dynamic = 'force-dynamic'` or `revalidate = 0` on the analytics dashboard route to defeat RSC output caching.
- If perf becomes an issue later, add Postgres materialized view refreshed by the readiness sweep.

---

### 16. Sidebar layout shift on route change

**What goes wrong:** Clicking "Gap Analysis" in sidebar causes the sidebar to flicker / reflow because it's rendered inside the page component instead of a shared App Router layout.

**Prevention:**
- Put sidebar in `src/app/trainer/layout.tsx` (or `src/app/(dashboard)/layout.tsx` route group). App Router preserves layout across navigations — only the `page.tsx` re-renders.
- Sidebar must be a Server Component or Client Component with stable key; avoid `key={pathname}` which forces remount.

---

### 17. Mobile sidebar: touch/gesture + focus trap

**What goes wrong:** Off-canvas sidebar opens on hamburger tap, but users can't dismiss it by tapping the backdrop, or Tab-key focus escapes to the hidden page behind it.

**Prevention:**
- Use a known-good primitive: Radix UI `Dialog` in sheet mode, or shadcn/ui `Sheet` (wraps Radix). Handles focus trap, backdrop click, Escape key, scroll lock.
- Test with a screen reader; announce drawer open/close.

---

### 18. URL / bookmark preservation across dashboard redesign

**What goes wrong:** Trainers have `/trainer/alice-smith` bookmarked. Redesign moves it to `/dashboard/associates/alice-smith`. Bookmarks 404.

**Prevention:**
- Keep `/trainer` + `/trainer/[slug]` URLs. Redesign is a layout/styling change, not a URL change.
- If URLs MUST change, add `next.config.ts` redirects (`{ source: '/trainer/:slug', destination: '/dashboard/associates/:slug', permanent: true }`).

---

### 19. DESIGN.md token drift during redesign

**What goes wrong:** New dashboard components use hard-coded Tailwind classes (`bg-orange-500`, `text-slate-900`) instead of DESIGN.md tokens. Six months later, dark-mode palette change requires grepping 40 files.

**Prevention:**
- Pre-redesign audit: enumerate every token the new design needs. If `finalized.html` uses a color not in DESIGN.md, decide: add to DESIGN.md, or change the design.
- Codex review gate: any PR that introduces hard-coded hex / non-token color FAILS review.
- Keep DESIGN.md as the style guide; `globals.css` as the token source; components reference `var(--nlm-...)` or Tailwind theme tokens only.

---

## Minor Pitfalls

### 20. `auth.uid()` returns null in service-role context

**What goes wrong:** Service-role clients (the one Prisma uses) have `auth.uid()` = NULL. Policies written like `USING (associate_id = auth.uid())` will silently return no rows when accessed via service role — easy to mistake for "RLS is working."

**Prevention:** When testing RLS, always use an authenticated client with a real JWT. Never test RLS via `psql` + service-role.

### 21. Session-cookie version bump on PIN rotation — carried over incorrectly

**What goes wrong:** Current code (`src/lib/auth-server.ts:40`) compares cookie `ver` to `Associate.pinGeneratedAt`. Post-cutover, `pinGeneratedAt` is dropped → version check dies → type errors hidden by Supabase taking over.

**Prevention:** Delete version-check code in same PR as column drop. Don't leave orphaned references to `pinGeneratedAt`.

### 22. Forgetting to delete `ASSOCIATE_SESSION_SECRET` from prod env

**What goes wrong:** After cutover, the env var is no longer used but remains in `.env.docker`, `docker-compose.yml`, `.env.example`. Clutter + security surface (it's a live HMAC key sitting idle).

**Prevention:** Delete from all env files in the same commit as the code that references it. Rotate prod secret management.

### 23. Bulk-invite uses wrong cohort

**What goes wrong:** Trainer selects "Cohort Fall-2026" in the dropdown, pastes 50 emails, submits. UI state got stale — actually sent to "Cohort Spring-2026". 50 associates are in the wrong cohort.

**Prevention:**
- Confirmation step: "You are about to invite 50 associates to **Cohort Fall-2026** with curriculum **React/Node/Postgres**. Proceed?" — shows cohort name + week count as a receipt.
- Reversibility: after submit, show a "Undo (deletes invites)" option for 60 seconds.

### 24. Associate dashboard exposes other associates' data

**What goes wrong:** Associate dashboard calls `/api/trainer/[slug]` by accident (copy-paste from trainer code), returns another associate's gap scores. Trainer-only endpoint never checked the caller.

**Prevention:**
- Audit every `/api/associate/*` route post-v1.2 to confirm `getAssociateIdentity()` (renamed to Supabase equivalent) is called and the slug in the URL matches.
- Unit test: GET `/api/associate/alice/...` with Bob's session → expect 403.

### 25. Magic link in email client preview = auto-consumed

**What goes wrong:** Outlook / corporate security scanners follow every link in an email to check for malware. Supabase magic-link is single-use — scanner consumes it, real click fails "Link already used."

**Prevention:**
- Supabase supports **PKCE flow** for magic links — scanner fetch doesn't complete sign-in because the code-verifier is only in the user's browser. Enable PKCE in Supabase Auth config.
- Alternative: send a "click to sign in" landing page URL that, on click, fires the real magic-link request — keeps the consumed URL off the email.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Supabase Auth adoption | Middleware order (Pitfall 3) + SSR cookies (Pitfall 2) | Copy Supabase's official Next.js App Router template verbatim, don't improvise |
| RLS policies | Prisma bypass (Pitfall 1) | Decide Option A vs B in PLAN before writing SQL; document in PROJECT.md |
| Associate migration | Email backfill (Pitfall 4) | Dry-run migration script reports conflicts; trainer approves CSV before hard cutover |
| Bulk magic-link | Rate limits + idempotency (Pitfall 6, 7) | Admin API + Resend SMTP + per-email result table in UI |
| PIN removal | Dangling refs (Pitfall 8) + active sessions (Pitfall 9) | Two-phase removal; grep-gate in CI; grace period |
| Dashboard redesign | URL preservation (Pitfall 18) + layout shift (Pitfall 16) | Keep `/trainer` URLs; use App Router layout groups |
| Analytics PDF | recharts OOM (Pitfall 12) | Don't render recharts inside react-pdf; pre-render as SVG strings |
| Cached manifest | Stale data (Pitfall 13) | Hash-based invalidation using commit SHA, not TTL |

---

## Sources

- Supabase SSR for Next.js — https://supabase.com/docs/guides/auth/server-side/nextjs (HIGH confidence, official, version-current)
- Supabase Auth rate limits — https://supabase.com/docs/guides/auth/auth-smtp (HIGH)
- Supabase RLS guide — https://supabase.com/docs/guides/database/postgres/row-level-security (HIGH)
- Prisma + RLS discussion — https://github.com/prisma/prisma/issues/5128 (MEDIUM — open issue, community consensus is "Prisma bypasses RLS unless you wrap transactions")
- Resend deliverability — https://resend.com/docs/dashboard/domains/introduction (HIGH)
- PKCE flow for magic links — https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow (HIGH)
- Existing code references (cited inline) — `src/middleware.ts`, `src/lib/identity.ts`, `src/lib/auth-server.ts`, `src/lib/associateSession.ts`, `src/lib/pinService.ts`, `src/lib/featureFlags.ts`, `prisma/schema.prisma`
