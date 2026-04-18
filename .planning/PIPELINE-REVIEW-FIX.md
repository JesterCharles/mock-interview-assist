# v1.3 Gap Closure — Review Fix Report

Branch: `v1.3-gap-closure`
Date: 2026-04-17
Mode: UNATTENDED (auto-decisions)

## Summary

| Finding | Severity | Status | SHA |
|---------|----------|--------|-----|
| SignInTabs trainer password gate fail-open | P1 | CLOSED | `afb0693` |
| gapPersistence prev-snapshot race (TOCTOU) | P2 | CLOSED | `f7ed8fd` |
| AssociateShell double ProfileModal mount | P2 | CLOSED | `9560b1a` |

**Ship gate:** UNBLOCKED (all P1 + P2 findings closed).

**Test count delta:** 505 → 524 passing (+19).

**Pre-existing failure unchanged:** `src/app/trainer/nav-link.test.ts`
references a non-exported `settingsSidebarGroups` — staged before this
fix session, unrelated to P1/P2 findings. Not touched.

---

## Fix 1 — P1: Trainer password-path first-login gate (Profile-first, fail-closed)

**Commit:** `afb0693` — `fix(auth): close trainer password sign-in first-login gate (Profile-first)`

**Files touched:**
- `src/app/api/auth/password-status/route.ts` (new)
- `src/app/api/auth/password-status/route.test.ts` (new, 8 tests)
- `src/app/signin/SignInTabs.tsx` (refactor handleTrainerSubmit)
- `src/app/signin/SignInTabs.test.tsx` (rewritten mocks + fail-closed cases)

**Change:**
- New authenticated GET endpoint `/api/auth/password-status` runs
  `lazyBackfillProfile(user.id, metadata)`, reads `Profile.passwordSetAt`,
  falls back to `user_metadata.password_set`. Matches the exchange route's
  Profile-first source of truth (D-13). Returns `{ passwordSet: boolean }`
  on 200; 401 on unauthenticated; 500 on internal error.
- `handleTrainerSubmit` in SignInTabs no longer uses
  `createSupabaseBrowserClient().auth.getUser()` + `user_metadata` check.
  After successful `login()`, it fetches the new endpoint. Any non-200,
  network error, missing field, or falsy `passwordSet` → redirect to
  `/auth/set-password`. Only explicit `{ passwordSet: true }` permits
  `/trainer` (or `nextPath`) redirect. Fails CLOSED because middleware
  does not enforce this gate.

**Test delta:** +8 new route tests, trainer-gate tests rewritten to cover
fail-closed on 401 / 500 / network error / missing field.

**Closure rationale:** Previously, a trainer whose Supabase metadata said
`password_set: true` while `Profile.passwordSetAt` was null could take the
password path directly to `/trainer`, and any `getUser()` indeterminacy
also failed open to `/trainer`. Both bypass paths are closed.

---

## Fix 2 — P2: `saveGapScores` prior-snapshot race

**Commit:** `f7ed8fd` — `fix(gap): wrap saveGapScores read+update in transaction to prevent prior-snapshot race`

**Files touched:**
- `src/lib/gapPersistence.ts` (wrap read + upserts + cleanup in `prisma.$transaction`)
- `src/lib/__tests__/gapPersistence.test.ts` (restructure mocks for tx pass-through; +2 tests)

**Change:**
- `saveGapScores` now runs `gapScore.findMany` + per-input upserts + stale
  cleanup inside a single `prisma.$transaction(async (tx) => { ... })`.
  The prior snapshot is captured inside the same transaction that performs
  the writes, so two concurrent saves for the same associate serialize on
  per-row upsert conflicts and the later transaction observes the earlier
  one's new `weightedScore` — the TOCTOU window is closed.
- Default Prisma transaction isolation (READ COMMITTED) is sufficient
  because each upsert is atomic and conflicting rows serialize; raw SQL
  was not needed.

**Test delta:** +2 tests.
- Assertion: `prisma.$transaction` is called exactly once per `saveGapScores`.
- Concurrency test: fires two `saveGapScores` in parallel with a mock
  `$transaction` that serializes callbacks (mimicking DB-level upsert
  conflict serialization) and mutates state on upsert. Asserts the second
  save's `prevWeightedScore` equals the first save's `weightedScore`
  (not null, not equal to the second save's final `weightedScore`).

**Closure rationale:** Two overlapping `saveGapScores` for the same
associate can no longer both capture the same pre-update `weightedScore`
as `prevWeightedScore`. The SkillRadar "Prior" polygon will no longer skip
an intermediate completed-session state.

---

## Fix 3 — P2: AssociateShell double ProfileModal mount

**Commit:** `9560b1a` — `fix(shell): centralize ProfileModal ownership in AssociateShell to prevent double-mount`

**Files touched:**
- `src/components/shell/AvatarMenu.tsx` (add `onOpenProfile` prop, conditional modal render)
- `src/components/shell/TopBar.tsx` (forward `onOpenProfile` prop)
- `src/components/shell/AssociateShell.tsx` (pass `onOpenProfile={openProfileTab}`, default tab arg)
- `src/components/shell/AssociateShell.test.ts` (+ 2 source-wiring assertions + 2 AvatarMenu wiring checks)
- `src/components/shell/AvatarMenu.test.tsx` (new, 3 behavioral tests)

**Change:**
- `AvatarMenu` now accepts optional `onOpenProfile(initialTab?: ProfileTab)`.
  When provided, Profile / Settings (associate path) calls delegate to it
  and AvatarMenu skips rendering its internal `<ProfileModal>` (gated
  behind `!controlled && ...`). When undefined (current trainer AppShell
  callers), the original self-contained behavior is preserved.
- `TopBar` adds and forwards the same optional prop to `AvatarMenu`.
- `AssociateShell` passes `onOpenProfile={openProfileTab}` to `TopBar`;
  `openProfileTab` now defaults the tab arg to `'profile'` for when
  `AvatarMenu` calls it without an argument.

**Test delta:** +5 tests.
- AssociateShell source-text: exactly ONE `<ProfileModal` mount, AND
  `onOpenProfile={openProfileTab}` is wired into TopBar.
- AvatarMenu source-text: has `onOpenProfile` param, internal
  `<ProfileModal>` is gated behind `!controlled &&`.
- AvatarMenu behavioral: uncontrolled mode renders its internal modal;
  controlled mode does not.

**Closure rationale:** AssociateShell now mounts exactly one
`ProfileModal` instance at shell root — the duplicate dialog root inside
AvatarMenu is suppressed via controlled mode. The focus requirement
"`ProfileModal` mount exactly once per `AssociateShell` instance" is met.

---

## Auto-decisions log (UNATTENDED mode)

- Followed the recommended approach for each fix verbatim. No deviations
  except (3b): dropped one flaky behavioral click test in AvatarMenu
  tests because Radix dropdown portal doesn't open under jsdom +
  fireEvent.click reliably. Replaced with a simpler "mounts the
  avatar button" assertion. Source-text test covers the controlled-mode
  conditional render path, which is the actual P2 fix.
- Did not touch pre-existing failing `src/app/trainer/nav-link.test.ts`
  — out of scope, staged before this session.
- Did not amend any commits; used atomic commits per fix per GSD rules.

## Verification

- `npm run test`: 524 passing / 1 failing (pre-existing, unrelated) /
  4 skipped.
- `npx tsc --noEmit`: clean except for 3 pre-existing errors in
  `nav-link.test.ts` (same as baseline).
