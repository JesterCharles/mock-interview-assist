# Phase 33: Trainer First-Login Password Gate - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Mode:** `--auto` (unattended — recommended defaults selected, decisions logged in 33-DISCUSSION-LOG.md)

<domain>
## Phase Boundary

Close SIGNIN-02 by wiring the first-login password gate for trainers across both entry paths (password sign-in and magic-link). This phase is a targeted gap-closure — it does NOT redesign sign-in, does NOT introduce new UI, and does NOT touch the associate flow. The `/auth/set-password` page, the `Profile.passwordSetAt` column, the lazy-backfill logic, and the metadata fallback already exist (Phases 28 + 28.1). Phase 33 only ensures trainers are routed through that gate.

Success criteria (from ROADMAP.md §Phase 33):
1. Trainer password sign-in with `Profile.passwordSetAt == null` → redirect to `/auth/set-password` (not `/trainer`)
2. Trainer magic-link sign-in with `passwordSetAt == null` → redirect to `/auth/set-password` (not `/trainer`)
3. Trainer with existing `passwordSetAt` → routes to `/trainer` normally
4. Associate flow unchanged

</domain>

<decisions>
## Implementation Decisions

### Gate placement — exchange route (magic-link path)
- **D-01:** Move the `passwordSet` check **above** the `role === 'trainer' || role === 'admin'` redirect in `src/app/api/auth/exchange/route.ts`. Currently (line 81 vs line 97) trainers short-circuit to `/trainer` before the password check runs — this is the root cause of magic-link gap #2. The reordered flow: authenticate → recovery-type early return → lazy backfill → passwordSet check → role-based redirect → associate linkage.
- **D-02:** The passwordSet detection source stays exactly as established in Phase 28.1 (D-13): `Profile.passwordSetAt` first, `user_metadata.password_set` fallback. No schema changes. No new service. Just reorder two existing blocks in one file.
- **D-03:** Lazy backfill (`lazyBackfillProfile`) is called for trainers too. Previously it only ran for associates because the trainer redirect intercepted first. This is the correct behavior — trainers that set a password on a legacy flow should also have their Profile record hydrated.

### Gate placement — password sign-in path (trainer-only)
- **D-04:** Add the gate inside `handleTrainerSubmit` in `src/app/signin/SignInTabs.tsx` — **not** inside `auth-context.tsx`'s `login()` function. Rationale: `login()` is a thin Supabase wrapper that returns boolean and is shared with any future caller; keeping it narrow-purpose is better than tangling password-gate logic into the auth provider. The gate lives at the decision boundary (post-login redirect) where we already route to `nextPath ?? '/trainer'`.
- **D-05:** After `login()` returns `true`, call `supabase.auth.getUser()` on the browser client, check `user.user_metadata?.password_set`. If falsy, `router.replace('/auth/set-password')`; else `router.replace(nextPath ?? '/trainer')`. This mirrors the exchange route's detection logic **in the metadata-fallback mode only** — the client does not hit Prisma directly.
- **D-06:** Client-side detection uses **only `user_metadata.password_set`**, not `Profile.passwordSetAt`. Reason: the browser cannot query Prisma, and exposing a new `/api/profile/password-status` endpoint is over-scope for this phase. For active users, lazy backfill has already synced the metadata flag with the Profile value, so the signals are equivalent. For the rare case where a trainer has `Profile.passwordSetAt` set but `user_metadata.password_set` missing, they see `/auth/set-password` once, re-confirm, both flags get written, done. This is the same "treat as not set, prompt once" pattern captured in Phase 28 D-summary edge-case note.

### Failure handling
- **D-07:** If `supabase.auth.getUser()` errors or returns no user in the password-sign-in handler, treat it as "gate indeterminate" and fall back to the existing `nextPath ?? '/trainer'` redirect. The middleware already prevents unauthenticated access to `/trainer`, so a broken `getUser()` call cannot produce an auth bypass — at worst the user sees a 307 loop back to `/signin`, which is recoverable and louder than silently blocking login.
- **D-08:** In the exchange route, if the `prisma.profile.findUnique` query throws (DB outage), log and fall through to the metadata-only check. This preserves the existing behavior for that code path and keeps trainers from being locked out during transient DB failures. No new try/catch is needed — the existing outer try/catch already redirects to `/signin?error=invalid-link`, which is the intended graceful failure.

### Associate flow preservation
- **D-09:** The reordering in the exchange route moves the passwordSet check above the role branch — associates already ran it AFTER the trainer branch (which they never hit), so the order change is a no-op for them. Do not modify any associate-specific code (`authUserId` linkage, slug lookup, `/api/associate/me`). Associate magic-link path keeps identical behavior.
- **D-10:** Associate password sign-in does not exist in the current UI (Phase 28 deferred it). No changes needed for the associate password path.

### Scope guardrails
- **D-11:** This phase does NOT add password sign-in for associates.
- **D-12:** This phase does NOT migrate remaining `user_metadata.password_set` callers to `Profile.passwordSetAt`-only. That migration (Phase 28.1 deferred idea) continues to be out of scope until all active users have been backfilled.
- **D-13:** This phase does NOT refactor `/auth/set-password` or `/auth/update-password`. Both pages already exist and work.
- **D-14:** This phase does NOT alter middleware. `/auth/set-password` is already allowed through for any authenticated user (middleware.ts step 5). Trainers reaching it will pass.

### Testing
- **D-15:** Extend `src/app/api/auth/exchange/route.test.ts` with two new cases:
  - Trainer with `user_metadata.password_set === true` and `Profile.passwordSetAt` set → redirects to `/trainer` (regression test for the reorder).
  - Trainer with no `password_set` flag and no `Profile.passwordSetAt` → redirects to `/auth/set-password` (new gate coverage).
  - Update existing "redirects trainer to /trainer" test (line 114-120) to also set Profile.passwordSetAt on the mock so it still passes under the reordered flow.
- **D-16:** Add a client-side test for `handleTrainerSubmit` gate logic. The file `SignInTabs.tsx` has no tests today — add `src/app/signin/SignInTabs.test.tsx` covering:
  - login success + `password_set === true` → redirects to nextPath or `/trainer`
  - login success + `password_set` falsy → redirects to `/auth/set-password`
  - login failure → stays on page, shows error (preserves existing behavior)
  - `getUser()` error after successful login → falls back to `/trainer` redirect (per D-07)
- **D-17:** No Playwright E2E required for this phase. The existing Phase 28 E2E coverage (where present) plus the new unit tests satisfy the verification need. Human verification for trainer first-login remains in the VERIFICATION.md human section, consistent with how Phase 28 handled it.

### Claude's Discretion
- Whether to extract a small `checkPasswordSetClient(user)` helper inside `SignInTabs.tsx` or inline the check. (Recommendation: inline — it's three lines and single-use.)
- Exact mock shape for the new exchange-route tests (follow the pattern in existing `vi.mock('@/lib/prisma')` block).
- Whether to capture the `getUser()` call after `login()` using the existing `useAuth().user` state (after an `await`) or by creating a fresh `createSupabaseBrowserClient()` call. (Recommendation: fresh Supabase client call — `useAuth().user` is populated by `onAuthStateChange` which is async and may not have fired yet by the time the form handler resumes.)
- Whether to add a brief explanatory comment block at the top of `handleTrainerSubmit` referencing SIGNIN-02 + Phase 33. (Recommendation: yes — future maintainers will wonder why a `getUser()` happens after `login()`.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 33 requirements + gap source
- `.planning/REQUIREMENTS.md` §Sign-in — SIGNIN-02 (reassigned to Phase 33 per requirement matrix line 103)
- `.planning/ROADMAP.md` §Phase 33 — goal, depends-on (Phase 28, 28.1), success criteria
- `.planning/phases/28-sign-in-redesign/28-VERIFICATION.md` — verification report documenting the exact gap, artifacts, and recommended fix (see "Gaps Summary" + YAML front-matter `gaps[0]`)

### Prior phase decisions carried forward
- `.planning/phases/28-sign-in-redesign/28-CONTEXT.md` — D-05 through D-14 (first-login detection, mandatory gate, post-success routing)
- `.planning/phases/28.1-user-profile/28.1-CONTEXT.md` — D-12 through D-14 (Profile-first detection, metadata fallback, lazy backfill, dual-write on set-password)

### Files to modify (primary)
- `src/app/api/auth/exchange/route.ts` — reorder password check above trainer branch (D-01)
- `src/app/signin/SignInTabs.tsx` — add gate to `handleTrainerSubmit` (D-04, D-05)

### Files to extend with tests
- `src/app/api/auth/exchange/route.test.ts` — trainer-gate + backward-compat regression cases (D-15)
- `src/app/signin/SignInTabs.test.tsx` — NEW FILE — client-side gate tests (D-16)

### Supporting files (reference only — do not modify)
- `src/lib/profileService.ts` — `lazyBackfillProfile()` already implements backfill; phase reuses as-is
- `src/lib/auth-context.tsx` — `login()` stays narrow-purpose (D-04)
- `src/app/auth/set-password/page.tsx` — destination page; already handles both roles
- `src/middleware.ts` — `/auth/set-password` already allowed through for authenticated users (D-14)
- `src/lib/supabase/browser.ts` — `createSupabaseBrowserClient` used in the client-side `getUser()` call
- `prisma/schema.prisma` — `Profile.passwordSetAt` column already exists (Phase 28.1)

### Design System
- `DESIGN.md` — not applicable to this phase (no UI changes)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`lazyBackfillProfile(authUserId, metadata)`** in `src/lib/profileService.ts` — no-op when metadata.password_set is falsy; writes Profile.passwordSetAt when metadata is true and Profile is empty. Called in exchange route before the passwordSet check. Works for both trainers and associates.
- **`prisma.profile.findUnique({ where: { authUserId } })`** pattern already in exchange route line 89-92 — reuse verbatim after reorder.
- **`createSupabaseBrowserClient()`** in `src/lib/supabase/browser.ts` — used in `/auth/set-password/page.tsx` line 29 and elsewhere; standard pattern for a fresh client-side Supabase call.
- **Exchange route's `redirectWith(path)` helper** (lines 43-49) — already forwards cookies on the redirect response. Reuse for the trainer set-password redirect.

### Established Patterns
- **First-login detection order:** Profile-first, metadata fallback (Phase 28.1 D-13). Only the exchange route has Prisma access; the browser path uses metadata-only (D-06 rationale).
- **Post-auth redirect routing:** Role-based — trainers/admins → `/trainer`, associates → `/associate/{slug}/dashboard`. The password gate is an orthogonal check that happens BEFORE role-based routing.
- **Mock shape for exchange tests:** `vi.mock('@/lib/prisma')` with `profile.findUnique` and `associate.findUnique` as vi.fn() — see `route.test.ts` lines 27-37.
- **Error-fallback philosophy:** Graceful degradation over hard failure. Exchange route's outer try/catch redirects to `/signin?error=invalid-link` on unexpected errors (line 147). D-07/D-08 preserve this philosophy.

### Integration Points
- **`/api/auth/exchange` route.ts, lines 81-99** — the reorder site. Current sequence: `if (role === trainer) return /trainer;` then lazy backfill + passwordSet check. New sequence: lazy backfill + passwordSet check, THEN role branch.
- **`SignInTabs.tsx`, `handleTrainerSubmit` (lines 93-107)** — the new gate site. After `login()` returns true, insert `getUser()` + passwordSet check, then redirect accordingly.

</code_context>

<specifics>
## Specific Ideas

- **The reorder is the elegant fix, not an ugly hack.** Phase 28 verification correctly identified the password-sign-in path as the gap, but missed that the magic-link path ALSO bypasses the gate for trainers (because trainer redirect runs first in the exchange route). Phase 33 fixes both with two small edits — one reorder in a route handler, one eight-line addition in a form handler.
- **No new services, no new routes, no new columns.** Phase 28 and 28.1 already built the infrastructure. This phase's entire job is to make sure trainers hit it.
- **Verification mirror:** The phase-28 VERIFICATION.md YAML front-matter explicitly lists this fix under `gaps[0].missing`: "After trainer password sign-in succeeds, check user_metadata.password_set before redirect; If password_set is falsy, redirect trainer to /auth/set-password instead of /trainer; Can be done in handleTrainerSubmit: read user from supabase.auth.getUser() after login, check flag, redirect accordingly." Phase 33 does exactly this, plus the magic-link reorder which verification missed.

</specifics>

<deferred>
## Deferred Ideas

- **Consolidated password-status API endpoint** (`GET /api/auth/password-status`) that returns Profile-first / metadata-fallback as JSON — would let the client use the same source of truth as the exchange route. Worth revisiting when associate password sign-in is added (a future phase) or when other surfaces need the signal. Not worth it for a single client-side call in this phase.
- **Removing `user_metadata.password_set` entirely** — Phase 28.1 deferred. Continues to be deferred until all active users are backfilled.
- **Middleware-level gate** — the gate could theoretically live in middleware (check Profile.passwordSetAt for every trainer request to `/trainer/*` and redirect). Rejected: adds a Prisma query to every middleware invocation (performance cost), duplicates exchange-route logic, and the ROADMAP success criteria only require the gate at sign-in boundaries, not as an ongoing check. The two entry points (exchange + handleTrainerSubmit) fully cover the requirement.
- **Playwright E2E for trainer first-login** — deferred per D-17. Unit tests + human verification are sufficient scope.

</deferred>

---

*Phase: 33-trainer-first-login-gate*
*Context gathered: 2026-04-17*
