---
phase: 18-supabase-auth-install
plan: 04
subsystem: auth-magic-link
tags: [supabase, auth, magic-link, pkce, callback, associate, rate-limiting, email]
dependency_graph:
  requires:
    - src/lib/supabase/admin.ts (supabaseAdmin — from 18-01)
    - src/lib/supabase/server.ts (createSupabaseServerClient — from 18-01)
    - src/lib/authRateLimit.ts (checkAuthRateLimit, recordAuthEvent — from 18-01)
    - src/lib/email/auth-templates.ts (getMagicLinkEmailHtml — from 18-03)
    - src/app/signin/SignInTabs.tsx (Associate tab placeholder — from 18-03)
  provides:
    - src/app/api/auth/magic-link/route.ts (POST magic link endpoint)
    - src/app/auth/callback/route.ts (GET PKCE callback + authUserId linkage)
  affects:
    - src/app/signin/SignInTabs.tsx (Associate tab wired to real endpoint)
tech_stack:
  added: []
  patterns:
    - admin.generateLink type=magiclink for PKCE magic link generation
    - Always-200 response from magic link endpoint (T-18-15 no user leak)
    - authUserId linkage on first callback by email match (T-18-17)
    - P2002 race condition handling on concurrent authUserId linkage
    - Role-based redirect after PKCE exchange (trainer→/trainer, associate→/associate/slug)
    - vi.hoisted() for Vitest 4 class constructor mocking (avoids hoisting TDZ errors)
key_files:
  created:
    - src/app/api/auth/magic-link/route.ts
    - src/app/api/auth/magic-link/route.test.ts
    - src/app/auth/callback/route.ts
    - src/app/auth/callback/route.test.ts
  modified:
    - src/app/signin/SignInTabs.tsx
decisions:
  - "Always return 200 from magic link endpoint regardless of email existence (T-18-15)"
  - "authUserId linkage deferred to first callback (not at magic link request time)"
  - "P2002 on authUserId linkage treated as success — re-read by authUserId and continue"
  - "Build failure is pre-existing Phase 17 Prisma type error (email/authUserId not in generated client)"
  - "vi.hoisted() used for Resend class constructor mock to avoid TDZ hoisting errors"
  - "Associate tab confirmation shows email address + try-again link for UX"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-16T03:00:00Z"
  tasks_completed: 2
  tests_added: 15
  files_created: 4
  files_modified: 1
---

# Phase 18 Plan 04: Associate Magic Link Flow Summary

**One-liner:** Implemented PKCE magic link endpoint via Supabase admin + Resend delivery, PKCE callback with role-aware redirect and first-login authUserId linkage (including P2002 race guard), and wired the Associate tab in SignInTabs to the real endpoint with confirmation UX.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Magic link API route + PKCE callback + authUserId linkage | `b390502` | src/app/api/auth/magic-link/route.ts, src/app/auth/callback/route.ts, + tests |
| 2 | Wire Associate tab in SignInTabs to magic link flow | `b896087` | src/app/signin/SignInTabs.tsx |

## Verification

- `npm run test -- --run` target tests: 15/15 passing (6 magic-link + 8 callback + 1 boundary)
- `npx tsc --noEmit` — no new errors in Plan 04 files; pre-existing Phase 17 Prisma errors unchanged
- `npm run build` — pre-existing Phase 17 type error on `email` field; not caused by Plan 04
- Task 3 checkpoint pending human verification

## Decisions Made

1. **Always-200 magic link response** — Endpoint always returns `{ ok: true }` regardless of whether email maps to a real Supabase user. Mitigates T-18-15 (information disclosure). Same pattern as password reset endpoint.
2. **authUserId linkage on first callback** — The magic link request doesn't know if the associate exists. The callback is the right place to link `Associate.authUserId` — at that point we have a validated Supabase user with email.
3. **P2002 treated as success** — If two concurrent callbacks race on the same user, the second `prisma.associate.update` throws P2002 (unique constraint on `authUserId`). Re-reading by `authUserId` recovers the already-linked row and continues — not a fatal error.
4. **vi.hoisted() for Resend mock** — Vitest 4 hoists `vi.mock` factories before module-level `const` declarations (TDZ). `vi.hoisted()` runs before hoisting, making the mock reference safe inside the factory.
5. **Associate tab UX** — Confirmation state shows the email address and a "Didn't get it? Try again" link that resets state to `idle`. Error messages differentiate between rate-limit (429) and generic errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resend class constructor mock TDZ hoisting error**
- **Found during:** Task 1 test run (RED → GREEN)
- **Issue:** `const mockSend = vi.fn()` declared before `vi.mock('resend', ...)` but factories are hoisted — `mockSend` is in TDZ when factory runs
- **Fix:** Used `vi.hoisted(() => ({ mockSend: vi.fn() }))` which runs before hoist, then referenced in class constructor mock via `function(this) { this.emails = { send: mockSend }; }`
- **Files modified:** `src/app/api/auth/magic-link/route.test.ts`
- **Commit:** `b390502`

**2. [Rule 1 - Bug] JSX syntax error in SignInTabs associate branch**
- **Found during:** Task 2 TypeScript check
- **Issue:** Nested ternary inside `() => ( {expr} )` is invalid JSX — curly braces inside ternary parens are object literal syntax, not JSX expression
- **Fix:** Flattened to chained ternary `tab === 'trainer' ? (...) : assocStatus === 'sent' ? (...) : (...)`
- **Files modified:** `src/app/signin/SignInTabs.tsx`
- **Commit:** `b896087`

## Known Stubs

None — the magic link endpoint is fully wired. The Associate tab calls the real endpoint. The `authUserId` Prisma fields will resolve once `prisma migrate deploy` runs in production (Phase 17 migration applied).

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-18-14 mitigated | src/app/api/auth/magic-link/route.ts | PKCE flow — email scanners cannot complete exchange without browser's code verifier cookie |
| threat_flag: T-18-15 mitigated | src/app/api/auth/magic-link/route.ts | Always returns 200 regardless of email existence |
| threat_flag: T-18-16 mitigated | src/app/api/auth/magic-link/route.ts | 3/hr/email + 10/hr/IP rate limiting applied |
| threat_flag: T-18-17 mitigated | src/app/auth/callback/route.ts | Only links authUserId when Associate.email matches AND authUserId is currently null |
| threat_flag: T-18-18 mitigated | src/app/auth/callback/route.ts | exchangeCodeForSession validates PKCE code; invalid codes redirected to /signin?error |
| threat_flag: T-18-19 mitigated | src/app/api/auth/magic-link/route.ts | All requests logged to AuthEvent table |

## Self-Check: PASSED

Created files verified:
- src/app/api/auth/magic-link/route.ts — FOUND
- src/app/api/auth/magic-link/route.test.ts — FOUND
- src/app/auth/callback/route.ts — FOUND
- src/app/auth/callback/route.test.ts — FOUND

Modified files verified:
- src/app/signin/SignInTabs.tsx — FOUND

Task commits confirmed:
- b390502 feat(18-04): magic link API route + PKCE callback + authUserId linkage
- b896087 feat(18-04): wire Associate tab to magic link flow
