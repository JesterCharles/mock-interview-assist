---
phase: 18-supabase-auth-install
plan: 03
subsystem: auth-signin
tags: [supabase, auth, signin, password-reset, email, rate-limiting]
dependency_graph:
  requires:
    - src/lib/supabase/browser.ts (createSupabaseBrowserClient — from 18-01)
    - src/lib/supabase/admin.ts (supabaseAdmin — from 18-01)
    - src/lib/supabase/server.ts (createSupabaseServerClient — from 18-01)
    - src/lib/authRateLimit.ts (checkAuthRateLimit, recordAuthEvent — from 18-01)
    - prisma/schema.prisma AuthEvent model (from 18-01)
  provides:
    - src/lib/auth-context.tsx (Supabase-based AuthProvider + useAuth)
    - src/app/signin/SignInTabs.tsx (email/password trainer tab + magic link associate tab)
    - src/app/signin/page.tsx (Supabase bounce check, both tabs visible)
    - src/app/api/auth/reset/request/route.ts (password reset endpoint)
    - src/lib/email/auth-templates.ts (getResetEmailHtml, getMagicLinkEmailHtml)
    - src/app/auth/update-password/page.tsx (password update completion form)
  affects:
    - All components that import useAuth (login signature changed to email+password)
tech_stack:
  added: []
  patterns:
    - supabase.auth.signInWithPassword for trainer email/password sign-in
    - supabase.auth.onAuthStateChange for reactive auth state in AuthProvider
    - supabase.auth.getUser() for server-validated session check (not getSession)
    - supabase.auth.admin.generateLink type=recovery for password reset links
    - supabase.auth.updateUser for password update completion
    - Inline forgot-password toggle (no page navigation, same form surface)
    - Always-200 reset endpoint (never leaks email existence — T-18-09)
    - Check-then-record abuse flag ordering (prevents self-deduplication)
key_files:
  created:
    - src/lib/email/auth-templates.ts
    - src/app/api/auth/reset/request/route.ts
    - src/app/auth/update-password/page.tsx
  modified:
    - src/lib/auth-context.tsx
    - src/app/signin/SignInTabs.tsx
    - src/app/signin/page.tsx
decisions:
  - "login() signature changed from (password) to (email, password) — breaking change, SignInTabs is the only caller"
  - "Both tabs always visible — ENABLE_ASSOCIATE_AUTH check removed from SignInTabs and page.tsx"
  - "Associate tab wires magic link fetch call as placeholder; actual POST handler in Plan 04"
  - "Abuse flag dedup: query BEFORE recording flag so just-created flag doesn't suppress admin email"
  - "Always return 200 from reset endpoint regardless of email existence (T-18-09 mitigated)"
  - "update-password page calls getSession() on mount to consume recovery token from URL hash"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-16T02:40:00Z"
  tasks_completed: 2
  tests_added: 0
  files_created: 3
  files_modified: 3
---

# Phase 18 Plan 03: Trainer Sign-in + Password Reset Summary

**One-liner:** Replaced password-based AuthProvider with Supabase `onAuthStateChange`, reworked SignInTabs to email/password trainer form with inline forgot-password toggle, created password reset endpoint with rate-limiting + abuse flagging + Resend delivery, and built `/auth/update-password` completion page.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Replace AuthProvider + rework SignInTabs trainer tab | `0e17da0` | src/lib/auth-context.tsx, src/app/signin/SignInTabs.tsx, src/app/signin/page.tsx |
| 2 | Password reset API route + auth email templates + abuse flagging | `d5e52ae` | src/app/api/auth/reset/request/route.ts, src/lib/email/auth-templates.ts, src/app/auth/update-password/page.tsx |

## Verification

- `npx tsc --noEmit` — only pre-existing Phase 17 Prisma errors (email/authUserId fields not in generated client)
- No new TypeScript errors introduced by this plan
- Task 3 checkpoint pending human verification

## Decisions Made

1. **login() breaking signature change** — Changed from `login(password)` to `login(email, password)` to match Supabase `signInWithPassword`. `SignInTabs.tsx` is the only caller; updated in same commit.
2. **Both tabs always visible** — `ENABLE_ASSOCIATE_AUTH` check removed from `SignInTabs` and `page.tsx`. The associate tab now shows a magic link email form (POST handler wired in Plan 04).
3. **Associate tab placeholder** — The magic link form calls `/api/auth/magic-link/request` which doesn't exist yet (Plan 04). The form renders correctly; the endpoint 404s until Plan 04.
4. **Abuse flag ordering** — Query reset count FIRST, then check for existing flag, THEN record the flag. This prevents the newly-created flag from appearing in the dedup query and suppressing the admin email.
5. **Always-200 reset** — Reset endpoint always returns `{ ok: true }` regardless of whether the email maps to a real account. Mitigates T-18-09 (information disclosure).
6. **update-password page** — Calls `getSession()` on mount to consume the recovery token from the URL hash. `updateUser({ password })` works once the recovery session is active.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- **Associate magic link POST handler** — `SignInTabs.tsx` calls `/api/auth/magic-link/request` which is not yet implemented. The form renders and submits but receives a 404 until Plan 04 creates the endpoint. This is intentional per plan scope.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-18-09 mitigated | src/app/api/auth/reset/request/route.ts | Always returns 200 — never confirms whether email/account exists |
| threat_flag: T-18-10 mitigated | src/app/api/auth/reset/request/route.ts | 3/hr/email + 10/hr/IP rate limiting applied before generateLink |
| threat_flag: T-18-11 mitigated | src/app/api/auth/reset/request/route.ts | Abuse flag at 5/day with 24h dedup + admin email notification |
| threat_flag: T-18-13 mitigated | src/app/api/auth/reset/request/route.ts | All reset requests logged to AuthEvent table with email, IP, timestamp |

## Self-Check: PASSED

Created files verified on disk:
- src/lib/email/auth-templates.ts — FOUND
- src/app/api/auth/reset/request/route.ts — FOUND
- src/app/auth/update-password/page.tsx — FOUND

Modified files verified:
- src/lib/auth-context.tsx — FOUND
- src/app/signin/SignInTabs.tsx — FOUND
- src/app/signin/page.tsx — FOUND

Task commits confirmed in git log:
- 0e17da0 feat(18-03): replace AuthProvider with Supabase + rework SignInTabs trainer tab
- d5e52ae feat(18-03): password reset route + auth email templates + update-password page
