---
phase: 18-supabase-auth-install
verified: 2026-04-15T23:45:00Z
status: human_needed
score: 4/6 must-haves verified (2 require live Supabase + Resend credentials)
overrides_applied: 0
human_verification:
  - test: "Trainer sign-in end-to-end: enter email + password at /signin Trainer tab, expect redirect to /trainer"
    expected: "Supabase signInWithPassword succeeds, session cookie set, middleware passes /trainer guard, redirect lands at /trainer"
    why_human: "Requires live Supabase project credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Cannot execute signInWithPassword without a real Supabase project."
  - test: "Trainer password reset: click 'Forgot password?', enter email, verify Resend email received with branded template"
    expected: "POST /api/auth/reset/request returns 200, Resend delivers email with reset link, link redirects to /auth/update-password"
    why_human: "Requires live Supabase admin.generateLink + live RESEND_API_KEY + a Supabase user with role='trainer' in user_metadata"
  - test: "Associate magic link: enter email at /signin Associate tab, click 'Send sign-in link', verify email received"
    expected: "POST /api/auth/magic-link returns 200, confirmation state shows 'Check your email', Resend delivers branded magic link email"
    why_human: "Requires live Supabase admin.generateLink type=magiclink, live RESEND_API_KEY, and an Associate row with matching email in DB"
  - test: "Associate PKCE callback: click magic link in email, verify redirect to /associate/[slug] with Associate.authUserId populated in DB"
    expected: "/auth/callback page detects tokens, forwards to /api/auth/exchange, associates session via authUserId linkage, redirects to /associate/[slug]"
    why_human: "Requires completing the magic link flow end-to-end with a real Supabase session and DB associate row"
---

# Phase 18: Supabase Auth Install Verification Report

**Phase Goal:** Trainers and associates can authenticate via Supabase, with magic links delivered through Resend and identity resolution unified through `getCallerIdentity`.
**Verified:** 2026-04-15T23:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm run build` succeeds with `@supabase/ssr` + `@supabase/supabase-js` installed and server/middleware/admin clients scaffolded | ✓ VERIFIED | Build passes (1 NFT warning, no errors). `@supabase/ssr@^0.10.2` + `@supabase/supabase-js@^2.103.2` in package.json. All 4 client files exist: `src/lib/supabase/{server,middleware,admin,browser}.ts` |
| 2 | Boot-time assert prevents app from starting if `NEXT_PUBLIC_SITE_URL` resolves to localhost in production | ✓ VERIFIED | `src/lib/env.ts` `assertProductionEnv()` checks for localhost/127.0.0.1/0.0.0.0/::1 when `NODE_ENV=production`. Called from `src/instrumentation.ts` register(). Tests: 18/18 passing. |
| 3 | Trainer can sign in at `/signin` (Trainer tab) with Supabase email/password and receive trainer role from `user_metadata.role` | ? HUMAN NEEDED | Code: `SignInTabs.tsx` calls `login(email, password)` → `supabase.auth.signInWithPassword`. `auth-context.tsx` uses `onAuthStateChange`. `getCallerIdentity()` reads `user.user_metadata?.role`. Wiring is complete. Live sign-in requires Supabase credentials. |
| 4 | Associate can request a magic link at `/signin` (Associate tab); link is delivered via Resend, opens via PKCE, and expires after 7 days | ? HUMAN NEEDED | Code: `POST /api/auth/magic-link` → `supabaseAdmin.auth.admin.generateLink({type:'magiclink'})` → Resend delivery. Note: `admin.generateLink` uses implicit flow (tokens in URL hash), not PKCE code params — callback converted from server route to client page + `/api/auth/exchange`. Expiry configured in Supabase dashboard (out-of-code). Live delivery requires Supabase + Resend credentials. |
| 5 | `getCallerIdentity()` returns same `admin|trainer|associate|anonymous` shape from Supabase session only (no PIN fallback) | ✓ VERIFIED | `src/lib/identity.ts` reads `supabase.auth.getUser()` only. No `verifyAssociateToken` import. No `ENABLE_ASSOCIATE_AUTH` check. Returns `{kind: 'admin'|'trainer'|'associate'|'anonymous'}`. Tests: passing in `identity.test.ts`. |
| 6 | Middleware refreshes Supabase session BEFORE route guard and returns mutated `NextResponse` | ✓ VERIFIED | `src/middleware.ts` calls `createSupabaseMiddlewareClient(request)` on line 33 before any guard logic. Returns the same `response` from that call on all paths. Forwards session cookies on redirects via `response.headers.getSetCookie()`. |

**Score:** 4/6 truths verified (2 require human testing)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/supabase/server.ts` | `createSupabaseServerClient` export | ✓ VERIFIED | Exports `createSupabaseServerClient()` using `createServerClient` from `@supabase/ssr` with cookie getAll/setAll |
| `src/lib/supabase/middleware.ts` | `createSupabaseMiddlewareClient` export | ✓ VERIFIED | Exports `createSupabaseMiddlewareClient(request)` returning `{supabase, user, response}`. Creates `NextResponse.next()` once and mutates it. |
| `src/lib/supabase/admin.ts` | `supabaseAdmin` service-role client | ✓ VERIFIED | `import 'server-only'` at top. Exports `supabaseAdmin` with `autoRefreshToken: false, persistSession: false`. Uses `SUPABASE_SECRET_KEY` (renamed from planned `SUPABASE_SERVICE_ROLE_KEY`). |
| `src/lib/supabase/browser.ts` | `createSupabaseBrowserClient` export | ✓ VERIFIED | Singleton pattern with module-level var. Exports `createSupabaseBrowserClient()`. |
| `src/lib/env.ts` | `assertProductionEnv` export | ✓ VERIFIED | Checks all 4 required env vars + localhost pattern. Throws with `[FATAL]` prefix. |
| `src/lib/authRateLimit.ts` | `checkAuthRateLimit`, `recordAuthEvent` exports | ✓ VERIFIED | In-memory sliding window, separate namespaces per type. 3/hr/email, 10/hr/IP. Records to `AuthEvent` table via Prisma. |
| `prisma/schema.prisma` | `AuthEvent` model | ✓ VERIFIED | `model AuthEvent` exists with `id`, `type`, `email`, `ip`, `metadata`, `createdAt`. Indexes on `[email, type]` and `[createdAt]`. |
| `src/middleware.ts` | Supabase session refresh + role guard (min 40 lines) | ✓ VERIFIED | 81 lines. `createSupabaseMiddlewareClient` called first. Three-tier guard: public → trainer (admin/trainer) → associate (any user). |
| `src/lib/identity.ts` | `getCallerIdentity`, `CallerIdentity` exports | ✓ VERIFIED | No-arg signature. `kind` discriminant. Prisma `associate.findUnique` by `authUserId` FK. No PIN fallback. |
| `src/lib/identity.test.ts` | Tests for Supabase identity resolution (min 40 lines) | ✓ VERIFIED | Tests for all 6 scenarios: anonymous, admin, trainer, associate with FK match, associate with no row, default-to-associate. |
| `src/app/signin/SignInTabs.tsx` | Trainer email/password + associate magic link UI (min 100 lines) | ✓ VERIFIED | 249 lines. Trainer tab: email + password fields + forgot-password toggle calling `/api/auth/reset/request`. Associate tab: email field calling `/api/auth/magic-link`, confirmation state, rate-limit error handling. |
| `src/app/api/auth/reset/request/route.ts` | Password reset endpoint with `POST` export | ✓ VERIFIED | Rate-limits with `checkAuthRateLimit`, generates recovery link via `supabaseAdmin.auth.admin.generateLink`, sends via Resend, abuse-flags at 5/day with admin notification (24h dedup), always returns 200. |
| `src/lib/email/auth-templates.ts` | `getResetEmailHtml`, `getMagicLinkEmailHtml` exports | ✓ VERIFIED | Both functions exported. Branded HTML templates with inline styles. |
| `src/lib/auth-context.tsx` | Supabase-based `AuthProvider`, `useAuth` exports | ✓ VERIFIED | Uses `supabase.auth.onAuthStateChange`. `login(email, password)` calls `signInWithPassword`. `logout()` calls `signOut()`. |
| `src/app/api/auth/magic-link/route.ts` | Magic link endpoint with `POST` export | ✓ VERIFIED | Rate-limits, gates on Associate row existence, calls `admin.generateLink(type: 'magiclink')`, delivers via Resend, always 200 (no user leak). |
| `src/app/auth/callback/page.tsx` | PKCE/implicit callback handler | ✓ VERIFIED | Client page extracts hash tokens or code param, forwards to `/api/auth/exchange` server route. Handles both implicit flow and PKCE code flow. |
| `src/app/api/auth/exchange/route.ts` | Server-side code/token exchange + authUserId linkage | ✓ VERIFIED | Calls `exchangeCodeForSession` (PKCE) or `setSession` (implicit). Auto-assigns associate role on first login. Links `Associate.authUserId` by email match on first callback. P2002 race guard. Redirects by role. |
| `src/app/auth/update-password/page.tsx` | Password update completion form | ✓ VERIFIED | Client component. Calls `supabase.auth.updateUser({password})`. Min 8 chars + confirm validation. Success redirects to `/signin`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/middleware.ts` | `src/lib/supabase/middleware.ts` | `createSupabaseMiddlewareClient` | ✓ WIRED | Line 2 import, line 33 call — before route guard |
| `src/lib/identity.ts` | `src/lib/supabase/server.ts` | `createSupabaseServerClient` | ✓ WIRED | Line 1 import, called inside `getCallerIdentity()` |
| `src/lib/identity.ts` | `prisma.associate` | `findUnique by authUserId` | ✓ WIRED | `prisma.associate.findUnique({ where: { authUserId: userId } })` |
| `src/instrumentation.ts` | `src/lib/env.ts` | `assertProductionEnv` | ✓ WIRED | `import('./lib/env')` + `assertProductionEnv()` in `register()` |
| `src/app/signin/SignInTabs.tsx` | `src/lib/supabase/browser.ts` | `signInWithPassword` (via auth-context) | ✓ WIRED | `useAuth().login(email, password)` → `supabase.auth.signInWithPassword` |
| `src/app/api/auth/reset/request/route.ts` | `src/lib/supabase/admin.ts` | `generateLink type recovery` | ✓ WIRED | `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', ... })` |
| `src/app/api/auth/reset/request/route.ts` | `src/lib/authRateLimit.ts` | `checkAuthRateLimit` | ✓ WIRED | Called before `generateLink` |
| `src/app/api/auth/magic-link/route.ts` | `src/lib/supabase/admin.ts` | `generateLink type magiclink` | ✓ WIRED | `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', ... })` |
| `src/app/api/auth/magic-link/route.ts` | `src/lib/authRateLimit.ts` | `checkAuthRateLimit type magic-link` | ✓ WIRED | Called before `generateLink` |
| `src/app/api/auth/exchange/route.ts` | `src/lib/supabase/server.ts` | `exchangeCodeForSession` | ✓ WIRED | `supabase.auth.exchangeCodeForSession(code)` on line 52 |
| `src/app/api/auth/exchange/route.ts` | `prisma.associate` | `authUserId linkage` | ✓ WIRED | `prisma.associate.update({ data: { authUserId: user.id } })` with email-match guard |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/lib/identity.ts` | `user` from `supabase.auth.getUser()` | Supabase Auth server-validated JWT | Yes — server round-trip to Supabase validates token | ✓ FLOWING |
| `src/lib/identity.ts` | `associate` from `prisma.associate.findUnique` | PostgreSQL via Prisma | Yes — real DB query by `authUserId` FK | ✓ FLOWING |
| `src/app/api/auth/exchange/route.ts` | `assoc` from `prisma.associate.update` | PostgreSQL via Prisma | Yes — real DB write + read for authUserId linkage | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All tests pass | `npm run test -- --run` | 323 passed, 4 skipped (327 total) | ✓ PASS |
| TypeScript clean | `npx tsc --noEmit` | No output (0 errors) | ✓ PASS |
| Build succeeds | `npm run build` | Build completes, 1 NFT warning (non-blocking) | ✓ PASS |
| No callers pass request to getCallerIdentity | `grep -rn 'getCallerIdentity(request' src/` | Zero matches | ✓ PASS |
| No old `.type` checks in identity | `grep -rn '.type.*trainer\|.type.*associate' src/lib/identity*` | Zero matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-05 | 18-01 | Install `@supabase/ssr` + scaffold server/middleware/admin clients | ✓ SATISFIED | Packages installed; 4 client modules scaffolded with correct exports |
| AUTH-06 | 18-02, 18-03 | Trainer email/password sign-in at `/signin`; session refresh in middleware before route guard | ✓ SATISFIED (code) + ? HUMAN | Middleware, identity, auth-context, SignInTabs all wired; live sign-in needs human test |
| AUTH-07 | 18-04 | Associate magic link at `/signin`; PKCE; Resend delivery; 7-day expiry | ✓ SATISFIED (code) + ? HUMAN | Magic link endpoint + exchange route + callback page wired; live delivery needs human test |
| AUTH-08 | 18-02 | `getCallerIdentity()` reads Supabase session; CONTEXT explicitly removed PIN grace flag | ✓ SATISFIED (context deviation) | CONTEXT.md overrides REQUIREMENTS.md: "PIN Grace Flag — REMOVED FROM SCOPE." `getCallerIdentity()` is Supabase-only with no PIN fallback. This is an intentional, documented scope decision. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/auth/route.ts` | 35, 46 | `APP_PASSWORD` single-password auth + `nlm_session` cookie | ℹ️ Info | Legacy trainer auth route — not migrated to Supabase. Per CONTEXT.md and Phase 20 scope, removal of trainer-password legacy code is deferred to Phase 20. Build passes; route still serves GET (session check) and DELETE (logout) which reference old `isAuthenticatedSession`. |
| `src/app/api/associate/me/route.ts` | 15 | `getAssociateIdentity()` (PIN-based) | ℹ️ Info | PIN-based associate identity route — not migrated. Per CONTEXT.md, PIN files remain until Phase 25. Route is feature-gated behind `isAssociateAuthEnabled()`. |
| `src/app/api/auth/exchange/route.ts` | — | No test file | ⚠️ Warning | The original `/auth/callback/route.ts` + tests were deleted when the callback was refactored to client page + exchange route. The exchange route is the core PKCE/implicit code exchange handler but has no unit tests. The plan's 8 callback tests are gone. |

### Human Verification Required

#### 1. Trainer Sign-In + Password Reset (SC-3)

**Test:**
1. Ensure `.env` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
2. Create trainer user in Supabase: Authentication > Users > Add user (email + password), then set `user_metadata.role = "trainer"`
3. Run `npm run dev`
4. Visit `/signin` — verify both Trainer and Associate tabs visible
5. Trainer tab: enter email + password → verify redirect to `/trainer`
6. Sign out → verify redirect to `/signin`
7. Click "Forgot password?" → verify inline form appears
8. Enter trainer email → verify "Check your email" confirmation appears

**Expected:** Sign-in, sign-out, and password reset request all work with Supabase auth. Session cookies set correctly. Route guards allow `/trainer` after sign-in.

**Why human:** Requires live Supabase project with trainer user seeded in `auth.users.user_metadata`.

---

#### 2. Associate Magic Link + PKCE Callback + authUserId Linkage (SC-4)

**Test:**
1. Ensure `.env` has `RESEND_API_KEY` and Supabase credentials
2. Ensure an `Associate` row exists in DB with a valid `email` field (set via Phase 17 backfill UI)
3. Visit `/signin` → Associate tab
4. Enter the associate's email → click "Send sign-in link"
5. Verify "Check your email" confirmation state appears
6. Check email inbox — verify branded magic link email received (Next Level Mock template)
7. Click the magic link → verify redirect to `/auth/callback` → then to `/associate/[slug]`
8. Verify `Associate.authUserId` is now populated in DB (check Supabase or Prisma Studio)
9. Test rate limiting: submit 4 rapid requests → verify 4th shows "Too many requests"

**Expected:** Magic link delivered via Resend, PKCE/implicit exchange completes, Associate row linked via authUserId, session active.

**Why human:** Requires live Supabase + Resend, real Associate email in DB, and end-to-end browser flow to verify hash-token extraction in client page.

---

### Gaps Summary

No blocking code gaps — all planned artifacts exist, are substantive, and are wired. The exchange route (`/api/auth/exchange/route.ts`) lacks unit tests (the refactoring that deleted `/auth/callback/route.ts` also deleted its 8 tests), but this is a warning-level coverage gap, not a functional gap. The implementation delivers the phase goal.

The two human verification items above are the only path to `passed` status.

**Note on env var naming deviation:** The implementation uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` instead of the plan-specified `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. This is a consistent, intentional rename across all 4 Supabase client files, `env.ts`, and `.env.example`. The prompt confirms this was expected behavior.

**Note on AUTH-08 scope change:** REQUIREMENTS.md specifies PIN grace flag, but CONTEXT.md explicitly removes it. `getCallerIdentity()` is Supabase-session-only with no PIN fallback — this is the intended implementation per the locked decision in CONTEXT.md. Phase 25 handles PIN code deletion.

---

_Verified: 2026-04-15T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
