---
phase: 33-trainer-first-login-gate
plan: 01
status: complete
requirements_closed:
  - SIGNIN-02
commits:
  - 4857c93  # Task 1 + Task 3: exchange route reorder + regression tests
  - 1ee581d  # Task 2 + Task 4: SignInTabs gate + client-side tests
---

# Phase 33 — Trainer First-Login Gate (SIGNIN-02)

## What changed

Closed SIGNIN-02 by wiring the existing `/auth/set-password` gate into both
trainer entry paths. No new infrastructure, no schema changes, no UI changes.

### Exchange route reorder — `src/app/api/auth/exchange/route.ts`
Moved the `lazyBackfillProfile` + `Profile.findUnique` + `passwordSet` check
**above** the `role === 'trainer' || role === 'admin'` redirect. Previously the
role branch short-circuited trainers to `/trainer` before the gate could run,
letting magic-link trainers bypass the first-login prompt. Associate flow is
order-equivalent (the gate already ran for them after the never-hit trainer
branch). Error handling unchanged — the existing outer try/catch continues to
cover Prisma failures.

### Client-side gate — `src/app/signin/SignInTabs.tsx`
Added an inline `createSupabaseBrowserClient().auth.getUser()` call to
`handleTrainerSubmit` after `login()` resolves truthy. If
`user_metadata.password_set` is falsy, `router.replace('/auth/set-password')`;
otherwise, proceed to `nextPath ?? '/trainer'`. Fail-open on `getUser` errors
per D-07 — the middleware still blocks unauthenticated `/trainer` access, so
this cannot produce a bypass. Associate magic-link flow, reset flow, and all
other handlers are untouched.

### Test coverage
- **`src/app/api/auth/exchange/route.test.ts`**: +2 regression tests
  (trainer without passwordSet → `/auth/set-password`; trainer with
  `Profile.passwordSetAt` set → `/trainer`). Total 14 tests, all pass.
- **`src/app/signin/SignInTabs.test.tsx`** (new): 6 test cases covering happy
  path, metadata undefined, metadata explicitly false, login failure stays on
  page, `getUser` error fail-open, and `nextPath` passthrough. Total 6 tests,
  all pass.

### New dev dependencies
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`

Required because this was the project's first client-component unit test. The
test file uses the `// @vitest-environment jsdom` pragma to opt into jsdom.

## Tasks

| Task | Description | Status |
|------|-------------|--------|
| 1 | Reorder exchange route — passwordSet check above trainer branch | done |
| 2 | Add `getUser()` + metadata gate to `handleTrainerSubmit` | done |
| 3 | Extend exchange route tests with 2 trainer-gate cases | done |
| 4 | Create SignInTabs test file with 6 client-gate cases | done |

## Commits

- `4857c93` — `fix(auth): reorder exchange route so passwordSet gate fires before trainer branch`
- `1ee581d` — `fix(auth): add trainer first-login gate to password sign-in handler`

## Out of scope (preserved)

- `login()` in `auth-context.tsx` — stays narrow-purpose (D-04)
- `/api/auth/password-status` endpoint — deferred (D-06)
- Middleware — unchanged (D-14)
- Associate magic-link flow — unchanged (D-11)
- Playwright E2E — not required (D-17)
