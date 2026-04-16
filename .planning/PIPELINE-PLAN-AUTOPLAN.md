# PIPELINE-PLAN-AUTOPLAN — Phase 18: Supabase Auth Install

**Date:** 2026-04-15
**Scope:** Phase 18 (4 plans across 3 waves)
**Reviewer:** autoplan (4 lenses: CEO / eng / design / DX)
**Overall confidence:** HIGH (8.8/10) — plans are thorough, research is verified, threat model is solid. Ship as-is with the flags below.

---

## Decision Principles

1. **Is there only one reasonable approach?** Auto-decide.
2. **Does context/research already lock this?** Auto-decide per locked decision.
3. **Is the risk low and reversible?** Auto-decide.
4. **Does it match an established project pattern?** Auto-decide.
5. **Are the approaches close (80/20)?** Auto-decide with best option.
6. **Is this a genuine taste/direction call?** Surface to human.

---

## Auto-decisions (resolved via 6 decision principles)

### CEO lens (scope, user value, 10-star ops)

- **AD-01** Three-role model (`admin`/`trainer`/`associate`) installed now even though admin-promote UI deferred to Phase 21. Correct: avoids a second auth migration. One-time infrastructure cost, zero user-facing complexity until Phase 21 activates it. ACCEPT. (Principle 2: locked decision)
- **AD-02** PIN removal from scope is the highest-leverage scoping call in the phase. PIN never shipped to production; eliminating the grace window removes ~2 weeks of coexistence code + testing surface. `getCallerIdentity()` becomes clean single-source. ACCEPT. (Principle 2: locked decision)
- **AD-03** Password reset as a Phase 18 deliverable alongside sign-in. This is table-stakes UX for email/password auth — shipping sign-in without reset would be a production blocker. ACCEPT. (Principle 1: only one reasonable approach)
- **AD-04** 7-day magic link expiry configured via Supabase dashboard (not per-call). Research confirms per-call override isn't reliably supported. Dashboard setting is the right control surface. Documented in `user_setup` section of 18-01-PLAN. ACCEPT. (Principle 2: research locks this)
- **AD-05** Advisory-only abuse flag (log + admin email) rather than auto-lockout for password reset. Correct for a product where the trainer IS the primary user — auto-lockout risks locking out the only person who manages the system. ACCEPT. (Principle 1)
- **AD-06** Both tabs always visible on `/signin` (remove `showAssociateTab` prop / `ENABLE_ASSOCIATE_AUTH` check). Correct: with Supabase magic links replacing PIN, the feature gate is no longer meaningful. ACCEPT. (Principle 2)

### Engineering lens (architecture, risk, testability)

- **AD-07** Middleware pattern: session refresh BEFORE route guard, return same mutated `NextResponse`. Research Pattern 2 + Pitfall 1 confirm this is the canonical Supabase+Next.js pattern. Plan 02 Task 1 follows it exactly. ACCEPT. (Principle 2)
- **AD-08** `getCallerIdentity()` signature change from `(request: NextRequest)` to `()`. Breaking change affecting 5 callsites. Plan 02 Task 2 lists all callers (grep-verified) and updates them atomically. Pitfall 8 in research explicitly warns about this. Handled correctly. ACCEPT. (Principle 1)
- **AD-09** `kind` discriminant replacing `type` on `CallerIdentity`. Prevents collision with TypeScript `type` keyword in destructuring patterns. Slightly better DX. Low risk, all callers updated in same PR. ACCEPT. (Principle 3: low risk, reversible)
- **AD-10** In-memory `Map` + Prisma `AuthEvent` hybrid for rate limiting. Matches existing `rateLimitService.ts` pattern. Hot path stays in-memory; DB provides persistence + admin visibility. ACCEPT. (Principle 4: matches project pattern)
- **AD-11** `authUserId` linkage in `/auth/callback` (match by email, update FK on first sign-in). Pitfall 5 in research identifies this exact gap. Plan 04 Task 1 handles it with the correct guard (only link when `authUserId` is currently null — prevents hijack). ACCEPT. (Principle 2)
- **AD-12** Browser client (`src/lib/supabase/browser.ts`) added as 4th client module beyond the 3 specified in CONTEXT.md. Necessary for `signInWithPassword` in the Trainer tab (client component). Research Pattern 9 confirms this need. ACCEPT. (Principle 1)
- **AD-13** Plan 02 middleware redirect forwards cookies via `response.headers.getSetCookie().forEach(...)`. This preserves refreshed session cookies on redirect responses — critical for the "bounce to /signin" flow. ACCEPT. (Principle 2: Pitfall 1 mitigation)
- **AD-14** Wave structure: W1 (foundation) -> W2 (middleware + identity) -> W3 (sign-in flows). Correct dependency chain. Plans 03 and 04 run in parallel (same wave 3) since they share Wave 1+2 outputs but don't depend on each other. ACCEPT. (Principle 1)
- **AD-15** Both Plan 03 and Plan 04 are `autonomous: false` with human-verify checkpoints. Correct for auth flows — these need manual smoke tests with real Supabase credentials. ACCEPT. (Principle 1)
- **AD-16** `import 'server-only'` on `admin.ts`. Research anti-pattern section explicitly warns about omitting this. Plan 01 Task 1 includes it. Threat T-18-01 covers it. ACCEPT. (Principle 2)

### Design lens (UX, visual, consistency)

- **AD-17** Trainer tab: single password field replaced with email + password. Standard email/password UX. Plan 03 Task 1 specifies `inputBase` pattern from existing design system. ACCEPT. (Principle 4)
- **AD-18** "Forgot password?" link inline (not a new page). Plan 03 specifies `color: var(--accent)`, `fontSize: 13`, `cursor: pointer`. Matches the terse, in-context design approach established in DESIGN.md. ACCEPT. (Principle 4)
- **AD-19** Associate tab: email field replacing 6-digit PIN input. Full-width input vs narrow PIN boxes. Plan 04 Task 2 specifies `inputBase` pattern, full width. "Check your email" confirmation state on success, rate-limit error state on 429. ACCEPT. (Principle 4)
- **AD-20** "Send sign-in link" button text (idle) / "Sending..." (submitting). Clear, non-ambiguous loading state. ACCEPT. (Principle 5)
- **AD-21** Error messages: "Invalid email or password." (trainer), "Too many requests. Please try again later." (429), "Something went wrong. Please try again." (generic). Consistent with existing error copy patterns. Never leaks user existence. ACCEPT. (Principle 4 + security requirement)

### DX lens (developer experience, maintainability, onboarding)

- **AD-22** `user_setup` section in Plan 01 frontmatter lists all Supabase dashboard configuration steps (OTP expiry, PKCE, redirect URLs) with exact navigation paths. Excellent onboarding DX for the solo dev returning to this after a break. ACCEPT. (Principle 5)
- **AD-23** `.env.example` and `.env.docker` updated with all 5 new vars + comments. Standard practice. ACCEPT. (Principle 4)
- **AD-24** Boot-time assert (`src/lib/env.ts`) called from `instrumentation.ts register()`. Fail-fast pattern prevents silent deployment failures. Test coverage in `env.test.ts`. ACCEPT. (Principle 2: SC-2 requirement)
- **AD-25** Old `/api/auth` route and `nlm_session` cookie kept alive (not deleted). Research Pattern 9 explicitly notes Phase 20 handles deletion. Plan 18 correctly avoids touching them beyond stopping the new sign-in surface from calling into them. ACCEPT. (Principle 2)
- **AD-26** Rate limiter key schema with namespaces (`auth:magic-link:email:{hash}`, `auth:reset:email:{hash}`) prevents collision. Pitfall 7 in research warns about this exact issue. Plan 01 Task 2 action step 6 implements it. ACCEPT. (Principle 2)

---

## Flags (potential issues)

### FLAG-01: Middleware redirect cookie forwarding (Plan 02, Task 1, step 7)

**Severity:** Medium
**Issue:** The plan specifies `response.headers.getSetCookie().forEach(c => redirect.headers.append('set-cookie', c))` for cookie forwarding on redirect. This is correct, but `getSetCookie()` is a relatively new Web API (added in Node 19+). The project runs Node 24 locally and Node 22 in Docker, so it's available, but this should be noted as a compatibility consideration.
**Decision:** AUTO-ACCEPT. Node 22 supports `getSetCookie()`. Docker base image is `node:22-alpine`. No action needed. (Principle 3: low risk)

### FLAG-02: Magic link endpoint returns 500 on generateLink error (Research Pattern 7 vs Plan 04)

**Severity:** Medium
**Issue:** Research Pattern 7 shows `return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })` when `generateLink` fails. But Plan 04 Task 1 behavior section says "Always returns 200 { ok: true } regardless of email existence (no user leak)". The plan behavior is correct (security-first, never leak user existence), but the research pattern contradicts it. Plan 04 Task 1 action step explicitly says "return 200 `{ ok: true }` anyway" which is the right call.
**Decision:** AUTO-ACCEPT the plan's behavior over the research pattern. The plan is security-correct. Research Pattern 7 is a starting sketch, not a locked decision. (Principle 1: only one secure approach)

### FLAG-03: `associate` role default when `user_metadata.role` is unset (Plan 02)

**Severity:** Low
**Issue:** Plan 02 and Research Pattern 5 default to `'associate'` when `user_metadata.role` is not set on an authenticated user. This means any Supabase user created without explicit role metadata will be treated as an associate. This is correct for the magic-link flow (associates won't have role set until the callback links them), but could be surprising if someone manually creates a user in the dashboard without setting role.
**Decision:** AUTO-ACCEPT. The alternative (defaulting to `'anonymous'`) would break the magic-link flow for new associates. The current default is the safer choice. Admin/trainer must be explicitly promoted. (Principle 5: close approaches, this is better)

### FLAG-04: No automated tests for SignInTabs UI (Plans 03 + 04)

**Severity:** Low
**Issue:** Plans 03 and 04 rely on human-verify checkpoints for SignInTabs UI validation. No Vitest component tests or Playwright E2E tests are specified for the sign-in form interactions. This is acceptable for auth flows (which inherently need real Supabase credentials for meaningful testing), but creates a regression risk.
**Decision:** AUTO-ACCEPT for Phase 18. Auth UI testing with mocked Supabase clients would be low-signal. The human-verify gates are the right call for an auth install phase. Playwright E2E tests can be added in a future phase when the auth system stabilizes. (Principle 3: low risk, reversible)

### FLAG-05: `AuthProvider.login()` signature breaking change (Plan 03)

**Severity:** Medium
**Issue:** Plan 03 Task 1 changes `login(password: string)` to `login(email: string, password: string)`. This is flagged as a "BREAKING CHANGE" in the plan text. All callers of `useAuth().login()` must be updated. The plan only mentions updating `SignInTabs.tsx` but any other caller of `useAuth().login()` would break.
**Decision:** AUTO-ACCEPT. `login()` is only called from `SignInTabs.tsx` in the current codebase (it's a sign-in-specific function). The plan handles the only caller. (Principle 3: low risk, grep-verifiable)

---

## Taste Decisions (surfaced for human input)

### TASTE-01: Resend `from` address for auth emails

**Context:** Plan 03 uses `from: 'Next Level Mock <auth@nextlevelmock.com>'` for password reset emails. Plan 04 uses the same for magic links. The existing interview report email uses `from: 'Next Level Mock <reports@nextlevelmock.com>'`.

**Options:**
- A) `auth@nextlevelmock.com` — separate subdomain for auth emails (better email reputation isolation)
- B) `reports@nextlevelmock.com` — reuse existing verified sender (simpler, one Resend domain)
- C) `noreply@nextlevelmock.com` — standard noreply pattern for transactional auth emails

**Why this needs human input:** This is a branding/deliverability decision. All three approaches work. The `from` address affects email filtering, user trust, and requires DNS/Resend configuration. Close approaches with no clear engineering winner.

**Recommendation:** Option A (`auth@`) if the domain is already verified in Resend and wildcard sending is enabled. Otherwise Option B to avoid DNS changes blocking the phase.

---

## Summary by Plan

| Plan | Wave | SC Coverage | Verdict | Notes |
|------|------|-------------|---------|-------|
| 18-01 | 1 | SC-1 (partial), SC-2 | SHIP | Foundation layer. Clean package install + 4 client files + boot assert + rate limiter + AuthEvent migration. |
| 18-02 | 2 | SC-5, SC-6 | SHIP | Auth backbone. Middleware rewrite + identity rewrite + all caller updates. Breaking changes handled atomically. |
| 18-03 | 3 | SC-3 | SHIP | Trainer sign-in + password reset. Human-verify gate appropriate. |
| 18-04 | 3 | SC-4 | SHIP | Associate magic link + PKCE callback + authUserId linkage. Human-verify gate appropriate. |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase dashboard not configured (OTP expiry, PKCE, redirect URLs) | Medium | High (magic links fail) | Plan 01 `user_setup` section documents exact steps |
| Middleware cookie loss on redirect | Low | High (intermittent auth loss) | Pitfall 1 mitigated by cookie forwarding pattern in Plan 02 |
| `authUserId` not linked on first magic-link callback | Low | Medium (associate sees anonymous) | Pitfall 5 mitigated by email-match fallback in Plan 04 |
| Rate limiter namespace collision | Low | Low (wrong limit applied) | Pitfall 7 mitigated by explicit key schema in Plan 01 |

## Overall Verdict

**SHIP ALL 4 PLANS AS-IS.** No blocking issues found. One taste decision (TASTE-01: Resend from address) surfaced for human input but does not block execution. The plans are well-researched, threat-modeled, and correctly sequenced. Wave structure respects dependencies. Human-verify gates are placed at the right points (post-sign-in-flow, not post-infrastructure).
