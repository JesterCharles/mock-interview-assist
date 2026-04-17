---
phase: 28-sign-in-redesign
verified: 2026-04-16T00:00:00Z
status: gaps_found
score: 3/4 must-haves verified
overrides_applied: 0
gaps:
  - truth: "A trainer completing password sign-in is also prompted to set a new password on first login if none is set"
    status: failed
    reason: "Trainer password sign-in uses signInWithPassword (via auth-context.tsx login()) which does NOT pass through /api/auth/exchange. After successful login, handleTrainerSubmit redirects directly to nextPath ?? '/trainer' with no password_set check. The first-login gate only exists in the exchange route, which is only hit by magic-link/token flows."
    artifacts:
      - path: "src/lib/auth-context.tsx"
        issue: "login() calls signInWithPassword and returns boolean — no password_set metadata check after authentication"
      - path: "src/app/signin/SignInTabs.tsx"
        issue: "handleTrainerSubmit redirects to nextPath ?? '/trainer' immediately after login() succeeds, no gate"
    missing:
      - "After trainer password sign-in succeeds, check user_metadata.password_set before redirect"
      - "If password_set is falsy, redirect trainer to /auth/set-password instead of /trainer"
      - "Can be done in handleTrainerSubmit: read user from supabase.auth.getUser() after login, check flag, redirect accordingly"
---

# Phase 28: Sign-in Redesign Verification Report

**Phase Goal:** Users reach the sign-in page and see two stacked buttons with inline form expansion instead of tabs; associates who signed in via magic link are prompted to set a password on first login
**Verified:** 2026-04-16
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sign-in page shows "Continue with email link" and "Sign in with password" as two stacked buttons with no tab UI | VERIFIED | SignInTabs.tsx exports SignInAccordion with Mail + KeyRound icons, two stacked buttons, `expanded` state (not tab state). No tablist, role="tab", or initialTab prop anywhere in SignInTabs.tsx or page.tsx |
| 2 | Clicking either button expands an inline form without navigating away | VERIFIED | grid-template-rows 0fr/1fr transition, overflow:hidden inner div, opacity 0→1 — all in SignInTabs.tsx lines 177-235, 247-362. toggleExpanded() sets expanded state locally |
| 3 | An associate who signs in via magic link for the first time sees a prompt to set a password before reaching their dashboard | VERIFIED | exchange/route.ts lines 72-75: checks user_metadata.password_set === true, returns redirectWith('/auth/set-password') when falsy. set-password/page.tsx exists with full implementation |
| 4 | A trainer completing password sign-in is also prompted to set a new password on first login if none is set | FAILED | Trainer password sign-in uses signInWithPassword via auth-context.tsx login(). After successful login, handleTrainerSubmit redirects to nextPath ?? '/trainer' directly. No password_set check in this path. The exchange route is never called for direct password sign-in. |

**Score:** 3/4 truths verified

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/signin/SignInTabs.tsx` | Accordion sign-in with two stacked buttons, no tabs | VERIFIED | File exists, 367 lines. Mail + KeyRound icons imported. No tab UI. Grid-template-rows animation. Both form handlers wired. |
| `src/app/auth/set-password/page.tsx` | Mandatory first-login password setup page | VERIFIED | File exists, 209 lines. updateUser({ password, data: { password_set: true } }) at line 56-59. No skip/cancel. unauthenticated redirect in useEffect. |
| `src/app/api/auth/exchange/route.ts` | First-login detection redirect in auth exchange | VERIFIED | password_set check at lines 72-75 redirects to /auth/set-password before role-based redirect. Recovery flow (type=recovery) still goes to /auth/update-password (unchanged at line 64-66). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/auth/exchange/route.ts` | `/auth/set-password` | redirect when user_metadata.password_set is falsy | WIRED | Lines 72-75: `const passwordSet = user.user_metadata?.password_set === true; if (!passwordSet) { return redirectWith('/auth/set-password'); }` |
| `src/app/auth/set-password/page.tsx` | `supabase.auth.updateUser` | sets password + user_metadata.password_set = true | WIRED | Lines 56-59: single updateUser call with password and data: { password_set: true } |
| `src/middleware.ts` | `/auth/set-password` | public path allowlist | VERIFIED | /auth/set-password is not in matcher config (`/dashboard/:path*`, `/interview/:path*`, etc.) so it passes through middleware automatically. Page handles unauthenticated access via getUser() → redirect to /signin at lines 30-34. |
| `src/lib/auth-context.tsx` | password_set check | after trainer signInWithPassword | NOT_WIRED | login() returns boolean only, no metadata check. handleTrainerSubmit in SignInTabs redirects directly on success. This is the root cause of the SC #4 gap. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `set-password/page.tsx` | user role after password set | supabase.auth.getUser() at line 70 | Yes — live Supabase user object | FLOWING |
| `exchange/route.ts` | user.user_metadata.password_set | supabase.auth.getUser() after session exchange | Yes — live Supabase user metadata | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points testable without live Supabase auth session.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SIGNIN-01 | 28-01-PLAN.md | Sign-in page shows two stacked buttons with inline form expansion, no tabs | SATISFIED | SignInTabs.tsx fully replaced — accordion buttons, no tab UI, all form handlers wired |
| SIGNIN-02 | 28-01-PLAN.md | All users redirected to set password on first login (trainers and associates alike) | PARTIALLY SATISFIED | Associates via magic link: covered via exchange route. Trainers via password sign-in: NOT covered — bypasses exchange route entirely |

### Anti-Patterns Found

None. No TODOs, FIXMEs, placeholders, empty returns, or hardcoded empty data found in the three phase files.

### Human Verification Required

#### 1. Sign-in accordion visual and interaction

**Test:** Visit http://localhost:3000/signin. Click "Continue with email link" then "Sign in with password" and back.
**Expected:** Smooth 200ms grid-template-rows expansion, no layout jump, correct active/dimmed button styling (accent border on active, muted bg+text on other), no navigation away from page.
**Why human:** CSS animation smoothness and visual polish cannot be verified programmatically.

#### 2. First-login magic-link flow (associate)

**Test:** Send a magic link to a test associate with no password_set metadata. Click the link.
**Expected:** After auth exchange, redirected to /auth/set-password — NOT to associate dashboard. Page shows no skip/cancel. After setting password, redirected to /associate/{slug}/dashboard.
**Why human:** Requires live Supabase auth session and email delivery.

#### 3. Subsequent magic-link login (associate)

**Test:** After setting password, sign in via magic link again.
**Expected:** Goes directly to /associate/{slug}/dashboard, skips set-password page (password_set flag is true).
**Why human:** Requires live Supabase auth and metadata state verification.

### Gaps Summary

**One gap blocking full goal achievement:** Roadmap success criterion #4 ("A trainer completing password sign-in is also prompted to set a new password on first login if none is set") is not implemented.

The implementation correctly gates magic-link/token flows via `/api/auth/exchange`, but trainer password sign-in uses `supabase.auth.signInWithPassword()` directly in `auth-context.tsx` — this flow never hits the exchange route. After `login()` returns `true`, `handleTrainerSubmit` redirects immediately to `/trainer` without inspecting `user_metadata.password_set`.

**Fix:** In `handleTrainerSubmit` (SignInTabs.tsx), after `login()` returns true, call `supabase.auth.getUser()` and check `user_metadata.password_set`. If falsy, redirect to `/auth/set-password` instead of `nextPath ?? '/trainer'`.

SIGNIN-02 is partially satisfied — associates are covered, trainers are not. This is a functional gap, not a cosmetic one.

---

_Verified: 2026-04-16_
_Verifier: Claude (gsd-verifier)_
