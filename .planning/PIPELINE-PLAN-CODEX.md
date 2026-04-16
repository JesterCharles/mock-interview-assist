# Phase 18 Architecture Assessment

Date: 2026-04-15  
Reviewer: Codex  
Scope read: `18-01-PLAN.md`, `18-02-PLAN.md`, `18-03-PLAN.md`, `18-04-PLAN.md`, `18-CONTEXT.md`, `18-RESEARCH.md`, and the Phase 18 section of `.planning/ROADMAP.md`.

## ARCHITECTURAL RISKS

- **Legacy cookie/session overlap is not explicitly neutralized.** `18-CONTEXT.md` `decisions / PIN Grace Flag - REMOVED FROM SCOPE` says Phase 18 should stop reading PIN cookies but leave PIN-related files for Phase 25, and `18-RESEARCH.md` `Pattern 9: SignInTabs Replacement Sketch` says the old `/api/auth` route and `nlm_session` cookie remain as parallel infrastructure until Phase 20. `18-02-PLAN.md` `Task 2: Rewrite getCallerIdentity` removes PIN verification, but the plans do not include a route-level audit proving no protected handler still trusts `nlm_session` or `associate_session` through `auth-server.ts`, middleware gaps, or stale client context. The structural risk is a split auth boundary where Supabase protects new paths while legacy cookies still authenticate older surfaces.

- **Middleware matcher and public-path logic may leave route handlers dependent on fresh Supabase cookies without refresh.** `18-02-PLAN.md` `Task 1: Rewrite middleware` says the matcher config must remain unchanged, while `18-RESEARCH.md` `Pattern 4: Middleware Rewrite` matches only `/dashboard`, `/interview`, `/review`, `/trainer`, and `/associate`. `18-02-PLAN.md` `Task 2` updates several `/api/trainer/*` and `/api/github/cache/invalidate` handlers to call `getCallerIdentity()` from cookies, but those API routes are not necessarily covered by middleware refresh if the matcher is unchanged. That can create inconsistent behavior between page routes and API routes when Supabase tokens need rotation.

- **Redirect cookie forwarding is specified, but not consistently represented across research and plan examples.** `18-02-PLAN.md` `Task 1` correctly requires forwarding `response.headers.getSetCookie()` onto redirects, while `18-RESEARCH.md` `Pattern 4: Middleware Rewrite` returns `NextResponse.redirect(url)` directly and `Common Pitfalls / Pitfall 1` suggests forwarding headers. This inconsistency increases implementation risk because the most important invariant is "same mutated response or copied Set-Cookie headers on redirect," and one canonical snippet violates it.

- **Role source is centralized but has no invalid-role policy.** `18-CONTEXT.md` `Role Model (three roles)` and `18-02-PLAN.md` `Task 2: Rewrite getCallerIdentity` store roles in `auth.users.user_metadata.role`; `18-02-PLAN.md` defaults any missing role to associate. The plans do not state what happens for malformed roles, stale role strings, or a user manually created without metadata but intended as a trainer. Middleware and `getCallerIdentity()` may diverge if one treats unknown roles as associate and another only checks trainer/admin paths.

- **Supabase/Prisma identity sync has a first-sign-in race.** `18-04-PLAN.md` `Task 1: Magic link API route + PKCE callback + authUserId linkage` links an associate by email when `authUserId` is null. The plan does not specify transactional handling for two concurrent callback exchanges for the same email, nor how to handle a unique-constraint race on `Associate.authUserId`. The resulting failure mode is a valid Supabase session that redirects to an error because the database linkage update raced.

- **Magic link callback depends on an associate destination that remains uncertain.** `18-04-PLAN.md` `Task 1` says an associate with a linked row redirects to `/associate/${associate.slug}/dashboard`, while `18-RESEARCH.md` `Open Questions / Callback redirect after magic link for associate` says associates do not yet have a dashboard and recommends confirming a redirect such as `/associate/{slug}/interview`. The plan assumes a post-login route that may not exist or may still be covered by old associate routing semantics.

- **Password recovery callback is incomplete as an end-to-end reset flow.** `18-04-PLAN.md` `Task 1` redirects recovery links to `/auth/update-password` and calls it a placeholder route, while `18-03-PLAN.md` `Task 2` implements only `/api/auth/reset/request`. The roadmap Phase 18 success criteria require trainer sign-in and role receipt, not necessarily a completed password update page, but `18-CONTEXT.md` `Password Reset Flow` says password reset is enabled this phase. Without an update-password route and `supabase.auth.updateUser()` handling, reset email delivery can succeed while the user cannot finish the reset.

- **AuthEvent persistence is used for durable abuse signals, but rate limiting itself is in-memory.** `18-01-PLAN.md` `Task 2` chooses an in-memory sliding window Map and lazy cleanup, while `18-CONTEXT.md` `Password Reset Flow` and `Self-Serve Magic-Link Rate Limits` define abuse controls as phase requirements. In-memory limits reset on deploy and are per-process, so serverless or horizontally scaled deployments can exceed the intended 3/hr/email and 10/hr/IP ceilings unless upstream infrastructure pins traffic to one process.

- **Password reset abuse flag deduplication ordering is ambiguous.** `18-03-PLAN.md` `Task 2` says after count >= 5, record a `reset-abuse-flag`, then check whether such a flag exists in the last 24h and send admin email if not. Recording before checking can cause the dedupe query to always find the just-created flag and suppress the first admin email, depending on implementation. The plan intent is sound, but the algorithm order needs correction.

- **Manual dashboard settings are hard dependencies on automated success criteria.** `18-01-PLAN.md` `user_setup` requires PKCE, redirect URLs, and OTP expiry; `18-04-PLAN.md` `must_haves` says magic links expire after 7 days; `18-RESEARCH.md` `Common Pitfalls / Pitfall 6` says `generateLink` uses project-level OTP expiry. The code plans cannot enforce these settings, so Phase 18 can pass local tests while production magic links use wrong expiry or fail redirect allow-list checks.

## CHALLENGED ASSUMPTIONS

- **Assumption: `@supabase/ssr` cookies will coexist cleanly with legacy cookies.** `18-CONTEXT.md` `Middleware Behavior` says to use `@supabase/ssr` defaults and leave race handling to defaults, while `18-RESEARCH.md` `Pattern 9` says `nlm_session` remains until Phase 20 and `18-CONTEXT.md` says PIN files remain until Phase 25. The plans take for granted that adding Supabase cookie chunks beside `nlm_session` and `associate_session` will not create request-size, naming, or precedence confusion in current middleware and auth context code.

- **Assumption: every protected identity path reaches a refreshed Supabase session first.** `18-02-PLAN.md` `Task 1` guarantees middleware refresh before route guard for matched routes, and `18-02-PLAN.md` `Task 2` rewrites API handlers to call `getCallerIdentity()`. Because the matcher is kept unchanged, the plan assumes route handlers can safely refresh through the server client alone or do not need the middleware-mutated response. That should be validated specifically for API calls that happen after access-token expiry.

- **Assumption: `user_metadata.role` is reliable enough for authorization.** `18-CONTEXT.md` `Role Model` locks role storage to `auth.users.user_metadata.role`, and `18-RESEARCH.md` `Assumptions Log / A4` explicitly notes the risk if the claim path changes. The plans do not add a cross-check against `ADMIN_EMAILS`, a Prisma role table, or `app_metadata`, so a metadata write mistake in the Supabase dashboard directly affects route access.

- **Assumption: PKCE is active for `admin.generateLink` links.** `18-04-PLAN.md` `Task 1` uses `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })`, and `18-RESEARCH.md` `Assumptions Log / A2` flags that this must generate a PKCE-compatible link. The plan relies on dashboard PKCE configuration plus Supabase SDK behavior; it does not include an automated test that verifies a generated link contains the callback shape expected by `exchangeCodeForSession`.

- **Assumption: 7-day magic link expiry is available and correctly configured.** `18-01-PLAN.md` `user_setup` requires setting OTP expiry to 604800 seconds, and `18-RESEARCH.md` `Open Questions / OTP expiry setting in Supabase dashboard` says the current dashboard value is unknown. The implementation cannot prove the 7-day requirement without a deployment checklist or manual verification gate that reads the actual Supabase project setting.

- **Assumption: Resend delivery latency and domain configuration are acceptable for auth.** `18-CONTEXT.md` `Magic-Link Flow` and `Password Reset Flow` require Resend delivery, while `18-RESEARCH.md` `Open Questions / Resend sending domain configuration` says verification status is unknown. The plans assume the existing report-email Resend setup is suitable for auth links, but auth email from `auth@nextlevelmock.com` may need separate domain/from-address verification and deliverability testing.

- **Assumption: Supabase and Resend coordination can be treated as lossless enough.** `18-03-PLAN.md` `Task 2` and `18-04-PLAN.md` `Task 1` generate a Supabase link first, then send through Resend, and return generic success in several failure cases to avoid account enumeration. If Resend send fails after a link is generated, the user sees success but receives no usable link; the plans do not define retry, dead-letter logging, or an explicit AuthEvent failure type for operator visibility.

- **Assumption: in-memory rate limits are acceptable for production abuse controls.** `18-01-PLAN.md` `Task 2` follows an in-memory Map pattern, while `18-RESEARCH.md` `Don't Hand-Roll / Rate limiting state` endorses in-memory hot path plus AuthEvent persistence. That assumes a single long-lived process or acceptable soft enforcement. If NLM deploys as multiple instances, the effective rate limit is multiplied by instance count.

- **Assumption: callback email matching is safe after Phase 17 backfill.** `18-04-PLAN.md` `Task 1` links by `Associate.email`, and `18-CONTEXT.md` `getCallerIdentity() Contract` depends on `Associate.authUserId` from Phase 17. The roadmap says Phase 18 depends on Phase 17, but `18-RESEARCH.md` summary says Phase 19 bulk invite will backfill `authUserId`; the plan assumes Phase 17 email data is complete enough for first-login linkage.

## ALTERNATIVE APPROACHES

### 18-01

- Keep the Supabase client scaffold and boot-time env assertion as planned, but move auth rate limits from process memory to a database-backed atomic counter or existing managed limiter before auth is publicly exposed. This is safer if production can run multiple Next.js instances.
- Split `AuthEvent` into two concepts: durable audit events and limiter state. The current single model is fine for visibility, but it is not sufficient to enforce quotas under concurrency or horizontal scale.
- Add a small deployment verification document or script for non-code Supabase settings: redirect allow-list, PKCE, OTP expiry, and Resend sender. This addresses the dashboard dependencies identified in `18-01-PLAN.md` `user_setup`.

### 18-02

- Migrate identity reads first while leaving trainer page middleware on legacy cookie auth for one short bridge release, then switch middleware once all API handlers are confirmed to use Supabase. This lowers blast radius but temporarily violates the "Supabase session only" target from `18-CONTEXT.md`.
- If Phase 18 must be atomic, broaden middleware matcher coverage to include the API routes that call `getCallerIdentity()` or document that every such route refreshes cookies independently. This is simpler than debugging expired-token behavior after rollout.
- Consider a dual-read diagnostic mode for one release: compute legacy identity and Supabase identity server-side, authorize only by Supabase, and log mismatches. This helps detect lingering `nlm_session` or `associate_session` dependencies before Phase 20/25 cleanup.

### 18-03

- Defer password reset completion to a clearly scoped follow-up only if the phase explicitly narrows success to reset-email request delivery. If "password reset enabled" remains in Phase 18, include `/auth/update-password` and `supabase.auth.updateUser()` in this sub-plan instead of relying on a placeholder.
- Use Supabase-hosted password recovery email temporarily, then move recovery delivery to Resend after trainer sign-in is stable. This sacrifices branding consistency but removes one `generateLink` + Resend coordination path during the initial auth cutover.
- Keep the existing trainer password cookie flow for trainers while migrating only associates to Supabase magic links first. This is safer operationally but conflicts with the locked decision that Supabase is the sole auth provider and should be chosen only if schedule risk dominates architecture cleanliness.

### 18-04

- Before full magic-link UX, implement callback exchange and associate `authUserId` linkage behind a manually generated test link. That isolates the highest-risk PKCE and Prisma sync path before wiring self-serve email delivery.
- Use Supabase Auth only for associates in Phase 18 and leave trainer/admin migration to a later phase. This reduces role complexity and dashboard bootstrap risk, but it delays `getCallerIdentity()` unification and keeps dual identity longer.
- Defer self-serve magic links to Phase 19 bulk invite and start with trainer-created associate users only. This avoids open self-serve rate-limit and enumeration pressure during install, but it changes the current Phase 18 success criterion that associates can request a link from `/signin`.
- Add transaction-aware linkage behavior in the callback: catch unique-constraint races, re-read by `authUserId`, and continue if another concurrent callback already linked the row. This keeps the existing architecture but hardens the main dual-identity sync edge.

## CONFIDENCE RATING

| Plan | Rating | Reasoning |
|---|---|---|
| 18-01 | Medium | The client scaffold, env assertions, and package installation are straightforward and well researched. Confidence drops because the plan includes `npx prisma migrate dev` despite action safety concerns in many environments, relies on manual Supabase dashboard settings for key success criteria, and implements production-facing rate limits with process-local memory. |
| 18-02 | Medium | The middleware ordering and `getUser()` guidance address the main Supabase SSR pitfalls directly. The risky part is the cutover boundary: old cookies remain in the app, matcher coverage may not include all API callers of `getCallerIdentity()`, and a breaking identity shape change touches multiple route handlers at once. |
| 18-03 | Low | Trainer email/password sign-in is a standard Supabase path, but the reset flow is not complete if `/auth/update-password` is only a placeholder. The abuse-flag dedupe algorithm is ambiguous, and the plan assumes Resend auth-email deliverability without a validated sender/domain gate. |
| 18-04 | Medium | The magic-link route and PKCE callback follow the right primitives: `generateLink`, Resend delivery, `exchangeCodeForSession`, and `Associate.authUserId` linkage. Confidence is limited by the unresolved associate post-login destination, lack of concurrency handling for first-sign-in linkage, and reliance on project-level PKCE/OTP dashboard configuration. |

## Executive Summary

- Make middleware coverage explicit for every route handler that calls `getCallerIdentity()`, especially `/api/trainer/*` and cache invalidation routes, so session refresh behavior is not page-only.
- Add a legacy-auth audit before merge: confirm no guarded path still accepts `nlm_session` or `associate_session` after `getCallerIdentity()` stops reading them.
- Treat `/auth/update-password` as required if Phase 18 claims password reset is enabled; otherwise rename the scope to "reset email request only."
- Harden associate first-login linkage with race handling and a confirmed redirect target that exists today.
- Convert manual Supabase/Resend dashboard prerequisites into a deploy checklist or verification artifact: PKCE, redirect URLs, OTP expiry, and auth sender domain.
