# Phase 33: Trainer First-Login Password Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 33-trainer-first-login-gate
**Mode:** `--auto` (unattended — Claude selected recommended defaults for all gray areas, no interactive prompts)
**Areas discussed:** Gate placement (magic-link), Gate placement (password sign-in), Detection source of truth, Failure handling, Associate flow preservation, Testing strategy

---

## Area 1: Gate placement — magic-link path (exchange route)

| Option | Description | Selected |
|--------|-------------|----------|
| Reorder password check above role branch in `exchange/route.ts` | Move `passwordSet` check to run BEFORE `if (role === 'trainer'\|\|'admin') return /trainer`. Current flow short-circuits trainers to `/trainer` before the password check runs. | ✓ |
| Duplicate password check into the trainer branch | Keep role branch first, but add a passwordSet check inside the trainer `if`. Requires duplicating 8 lines from the associate path. | |
| Add a separate `/api/auth/trainer-gate` route called from the trainer-specific magic-link flow | New endpoint, new test file. Over-scope for a single reorder. | |

**User's choice:** `[auto]` Option 1 — reorder. Lowest code delta, single source of truth, already-tested code blocks just get rearranged.
**Notes:** The passwordSet check block (lines 85-99 of exchange/route.ts) needs no logic changes — it moves as a unit to run before the trainer redirect (line 81-83). Lazy backfill also moves (it's a precondition of the check).

---

## Area 2: Gate placement — password sign-in path

| Option | Description | Selected |
|--------|-------------|----------|
| Inline gate in `handleTrainerSubmit` (SignInTabs.tsx) | After `login()` returns true, call `supabase.auth.getUser()`, check `user_metadata.password_set`, redirect accordingly. | ✓ |
| Embed gate in `login()` inside `auth-context.tsx` | `login()` would no longer return boolean — it would return a discriminated union with redirect target. | |
| Wrap password sign-in in a new `/api/auth/password-sign-in` route that calls Supabase server-side and mirrors exchange-route logic | Centralizes gate but adds network hop, new endpoint, and duplicates exchange route. | |

**User's choice:** `[auto]` Option 1 — inline in handler. Matches the verification-doc recommendation verbatim. `login()` stays narrow-purpose.
**Notes:** The gate is at the redirect decision boundary, not inside the auth primitive. Follows the single-responsibility pattern established in Phase 28.

---

## Area 3: Detection source of truth on the client

| Option | Description | Selected |
|--------|-------------|----------|
| `user_metadata.password_set` only (client-side) | Mirrors the exchange route's fallback path. No Prisma access needed from browser. | ✓ |
| Add `GET /api/auth/password-status` endpoint and call it from the client | Gives the browser Profile-first semantics. | |
| Use `Profile.passwordSetAt` via a Supabase `.from('Profile').select(...)` call | Would require RLS policy for Profile table + new client dependency. | |

**User's choice:** `[auto]` Option 1 — metadata-only client side. Phase 28/28.1 architecture intentionally keeps Profile server-only; lazy backfill ensures metadata stays in sync for active users.
**Notes:** The rare divergence case (Profile.passwordSetAt set but metadata missing) produces one extra prompt to set-password, not a security issue — page re-writes both flags.

---

## Area 4: Failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-open to `/trainer` when `getUser()` errors | If the post-login getUser call fails, redirect to nextPath ?? /trainer. Middleware still blocks unauthenticated access. | ✓ |
| Fail-closed to `/auth/set-password` | If getUser fails, send user to set-password as a "safer" default. | |
| Show error on sign-in page and don't redirect | Block the transition entirely on indeterminate state. | |

**User's choice:** `[auto]` Option 1 — fail-open. A broken `getUser()` after a successful `login()` is a transient infra issue, not a security concern. Middleware prevents auth bypass. Failing closed risks locking trainers out during outages.
**Notes:** In the exchange route, Prisma errors during `profile.findUnique` fall through to metadata-only check via the existing outer try/catch — no new error handling needed.

---

## Area 5: Associate flow preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Do not modify any associate-specific code; verify the exchange-route reorder is a no-op for associates | Associates already ran the passwordSet check AFTER the (never-hit) trainer branch. Moving it above is order-equivalent for them. | ✓ |
| Add explicit regression test asserting associate magic-link still redirects to `/associate/{slug}/dashboard` after reorder | Defensive — already covered by existing tests in route.test.ts. | |
| Refactor both paths to share a common "post-auth redirect resolver" helper | Scope creep — lives better in a future consolidation phase. | |

**User's choice:** `[auto]` Option 1 — preserve as-is. Existing exchange tests (lines 87-93, 95-101, 142-174) already cover associate flows and will fail-fast if the reorder breaks them.
**Notes:** D-10 captures that associate password sign-in doesn't exist yet, so there's no associate-side client handler to modify.

---

## Area 6: Testing strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing `route.test.ts` + add new `SignInTabs.test.tsx` for client-side gate | Unit tests at both enforcement points. Adjust one existing test for reordered flow. | ✓ |
| Add Playwright E2E covering trainer-first-login across both entry paths | Full-integration coverage — but requires live Supabase auth fixtures. | |
| Rely on human verification only (VERIFICATION.md human section) | Minimal test burden. | |

**User's choice:** `[auto]` Option 1 — unit tests at both enforcement points. Matches Phase 28's testing approach (no E2E was required there either).
**Notes:** D-15/D-16/D-17 in CONTEXT.md capture the exact test cases. Existing `route.test.ts` trainer-redirect test needs Profile.passwordSetAt set on its mock to continue passing under the reordered flow.

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` §Claude's Discretion. Highlights:
- Helper extraction decision (inline vs small helper) in `SignInTabs.tsx` — recommended inline.
- Which Supabase client to use for the post-login `getUser()` — recommended fresh `createSupabaseBrowserClient()` over `useAuth().user` (async timing).
- Comment block referencing SIGNIN-02 / Phase 33 at the top of `handleTrainerSubmit` — recommended yes.

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`. Highlights:
- Consolidated `/api/auth/password-status` endpoint (for when associate password sign-in lands).
- Full `user_metadata.password_set` removal (after backfill coverage is 100%).
- Middleware-level gate (rejected — perf cost, duplicates exchange-route logic, exceeds success criteria).
- Playwright E2E for trainer first-login (deferred — unit + human verification sufficient).

---

*Discussion mode: `--auto` — all gray areas resolved via recommended defaults.*
*Next step: `/gsd-plan-phase 33` to draft the implementation plan.*
