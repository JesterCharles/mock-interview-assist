---
phase: 09-associate-pin-auth
plan: 03
subsystem: auth
tags: [ui, auth-guard, pin-entry, trainer-tools, authenticated-entry]

requires:
  - phase: 09-01
    provides: POST /api/associate/pin/verify, POST /api/associate/pin/generate
  - phase: 09-02
    provides: isAuthenticatedSession, getAssociateIdentity (version-checked), getAssociateIdBySlug
provides:
  - /associate/login page + PinEntryForm client component
  - GeneratePinButton trainer UI (one-time display modal)
  - Identity-gated /associate/[slug] profile page
  - NEW authenticated automated-interview entry route /associate/[slug]/interview
  - AuthenticatedInterviewClient shell (identity via props, not cookies)
affects:
  - phase-10-automated-interview-pipeline (consumes the authenticated entry + the Phase 10 completion route)
  - trainer roster workflow (PIN generation is now a real UI action)

tech-stack:
  added: []
  patterns:
    - Server-component guard returning JSX-wrapped 403 (server components cannot return raw Response)
    - Identity as server-resolved props to client shell (never re-derived from cookies)
    - One-time PIN display modal — explicit Done close, no backdrop dismiss
    - Fingerprint-gated PIN verify (reuses @fingerprintjs/fingerprintjs pattern from public flow)
    - Safe `?next=` param validation (internal same-origin only) on /associate/login

key-files:
  created:
    - src/app/associate/login/page.tsx
    - src/app/associate/login/PinEntryForm.tsx
    - src/app/trainer/components/GeneratePinButton.tsx
    - src/app/associate/[slug]/page.test.tsx
    - src/app/associate/[slug]/interview/page.tsx
    - src/app/associate/[slug]/interview/page.test.tsx
    - src/components/interview/AuthenticatedInterviewClient.tsx
  modified:
    - src/app/associate/[slug]/page.tsx
    - src/app/trainer/[slug]/page.tsx
    - src/lib/trainer-types.ts
    - src/app/api/trainer/[slug]/route.ts

key-decisions:
  - 403 for the mismatched-associate case is rendered as a JSX element carrying data-http-status="403" rather than a Response instance — Next.js server components cannot return a raw Response
  - Trainer detail API now exposes numeric Associate.id so the trainer UI can call /api/associate/pin/generate without an extra lookup (minimal scope deviation, Rule 3)
  - Authenticated interview shell is intentionally minimal in v1.1 — the real interview runtime lands in Phase 10; forking the existing 2000-line src/app/page.tsx now would blow scope and the plan explicitly authorizes a minimal wrapper
  - `next=` on /associate/login is validated to internal paths only (defense in depth vs. open-redirect)

requirements-completed: [AUTH-02, AUTH-04]

duration: ~25min
completed: 2026-04-14
---

# Phase 09 Plan 03: Associate PIN Entry UI + Auth Guards + Authenticated Interview Entry Summary

**Ships the associate PIN login page, the /associate/[slug] identity guard, the new authenticated /associate/[slug]/interview entry (Codex #2 fix), and the trainer-side one-shot PIN generation modal — closing AUTH-02 and AUTH-04.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files created:** 7
- **Files modified:** 4
- **Tests added:** 12 (6 for /associate/[slug], 6 for /associate/[slug]/interview)
- **Full test suite:** 121/121 pass (was 109/109 — no regressions)

## Accomplishments

- `/associate/login` renders a utilitarian Tailwind/inline-style form; if the caller is already a trainer or an associate with a valid cookie it redirects to `?next=` (validated internal-only) or `/`
- `PinEntryForm` loads a fingerprint via `@fingerprintjs/fingerprintjs`, POSTs to `/api/associate/pin/verify`, surfaces 401/429 with distinct inline messages, disables the submit button while in-flight, and on success uses `router.replace + router.refresh` so guarded routes immediately see the new cookie
- `GeneratePinButton` POSTs to `/api/associate/pin/generate` and opens a modal displaying the 6-digit PIN in 40px monospace, a copy-to-clipboard button (transient "Copied to clipboard" feedback), a prominent "will not be shown again + regeneration revokes prior session" warning, and a single Done close — no backdrop dismiss, so a misclick cannot lose the PIN
- `/associate/[slug]` now enforces the D-21 five-way identity matrix: trainer allowed for any slug, matching associate allowed, mismatched associate gets a 403 element, stale-ver falls through to `/associate/login`, anonymous redirects to `/associate/login?next=…`. `notFound()` still fires when the slug doesn't resolve
- NEW `/associate/[slug]/interview` route with the identical guard matrix renders a client shell that receives `associateSlug` and `associateId` as **server-provided props**. The shell is intentionally minimal — Phase 10 wires it to `/api/associate/interview/complete`
- `AssociateDetail` API response now includes the numeric `id` so the trainer's GeneratePinButton can call the PIN-generate endpoint without a second lookup

## Task Commits

1. **Task 1: PIN entry page + form + trainer Generate-PIN UI**
   - `994f59f` (feat)
2. **Task 2: Auth guard on /associate/[slug]**
   - RED: `ff35eda` (test)
   - GREEN: `8328551` (feat)
3. **Task 3: NEW /associate/[slug]/interview authenticated entry**
   - RED: `fe3e58e` (test)
   - GREEN: `8788196` (feat)

## Files Created/Modified

**Created**
- `src/app/associate/login/page.tsx` — server shell + already-authenticated short-circuit
- `src/app/associate/login/PinEntryForm.tsx` — client form w/ fingerprint + 401/429 handling
- `src/app/trainer/components/GeneratePinButton.tsx` — one-time PIN display modal with copy + revocation warning
- `src/app/associate/[slug]/page.test.tsx` — 6 tests covering the guard matrix + notFound branch
- `src/app/associate/[slug]/interview/page.tsx` — authenticated automated-interview entry
- `src/app/associate/[slug]/interview/page.test.tsx` — 6 tests mirroring the matrix + trainer path
- `src/components/interview/AuthenticatedInterviewClient.tsx` — client shell consuming server-provided identity via props

**Modified**
- `src/app/associate/[slug]/page.tsx` — replaced trainer-only `/login` redirect with the D-21 matrix; added `renderForbidden()` JSX helper (server components can't return a Response)
- `src/app/trainer/[slug]/page.tsx` — wired `<GeneratePinButton>` near the associate header
- `src/lib/trainer-types.ts` — added numeric `id` field to `AssociateDetail`
- `src/app/api/trainer/[slug]/route.ts` — populate `id` in the response

## Decisions Made

- **JSX-wrapped 403 over Response.** Next.js server components cannot return a raw `Response` (TypeScript: `Type 'Response' is not assignable to AwaitedReactNode`). I render a `data-http-status="403"` element and the test asserts on that marker. Functionally equivalent for the user (forbidden page) while staying within Next.js 16's page-component contract.
- **Expose numeric `id` in trainer detail.** The trainer UI calls `/api/associate/pin/generate` with `{ associateId: number }`. Without `id` in the payload, the UI would have to do a second round-trip or a client-side slug-to-id lookup. Rule 3 auto-fix: unblocks the task cleanly.
- **Minimal authenticated interview shell.** The plan explicitly authorizes: "if the refactor is nontrivial and would blow scope, ship a minimal wrapper that server-side resolves identity and renders a client shell." The existing interview UI at `src/app/page.tsx` is 1000+ lines of tightly-coupled state; Phase 10 owns the integration.
- **`next=` whitelist.** Only internal paths starting with `/` (and not `//`) are accepted. Any absolute URL → null → redirect to `/`. Guards against open-redirect phishing via crafted `?next=` values.
- **No backdrop-click dismiss on the PIN modal.** One-shot PIN display is destructive-on-close; accidental dismissal by clicking outside the modal would strand the trainer. Explicit Done button only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added numeric `id` to `AssociateDetail` trainer API response**
- **Found during:** Task 1 — wiring `<GeneratePinButton>` into the trainer `[slug]` page
- **Issue:** `GeneratePinButton` requires `associateId: number` to call `/api/associate/pin/generate`, but `AssociateDetail` only exposed `slug` + `displayName`.
- **Fix:** Added `id: number` to the `AssociateDetail` interface and populated it in `src/app/api/trainer/[slug]/route.ts`.
- **Files modified:** `src/lib/trainer-types.ts`, `src/app/api/trainer/[slug]/route.ts`
- **Commit:** `994f59f`

**2. [Rule 3 - Blocking] 403 rendered as JSX element instead of Response**
- **Found during:** Task 2 build verification
- **Issue:** `npm run build` failed with `Type 'Response' is not assignable to AwaitedReactNode` — Next.js 16 server components cannot return a raw `Response`.
- **Fix:** Created `renderForbidden()` helper returning a JSX element tagged with `data-http-status="403"` and `data-testid`. Tests assert on the prop marker, not a Response instance. Applied identically in Task 3.
- **Files modified:** `src/app/associate/[slug]/page.tsx`, `src/app/associate/[slug]/page.test.tsx`, `src/app/associate/[slug]/interview/page.tsx`
- **Commits:** `8328551`, `8788196`

## Issues Encountered

- Vitest module hoisting bit the first test pass — top-level `const` mocks referenced before hoisted `vi.mock` factories executed. Fixed with `vi.hoisted({...})`.
- Pre-existing lint errors (`src/lib/auth-context.tsx` setState-in-effect) and warnings in test files are unrelated to this plan and were left untouched per the scope-boundary rule.

## Verification

- `npx vitest run src/app/associate` → 12/12 pass (both new matrices + notFound branches)
- `npm run test` (full suite) → 121/121 pass
- `npx tsc --noEmit` → clean for this plan's files
- `npm run build` → all routes compile; new routes present: `/associate/login`, `/associate/[slug]`, `/associate/[slug]/interview`

## Success Criteria

1. /associate/login renders and accepts slug + PIN — PASS
2. Successful PIN entry sets the cookie (via backend) and redirects to next or /associate/{slug} — PASS (router.replace + refresh)
3. Failed PIN entry shows inline error; 429 surfaces rate-limit message — PASS
4. /associate/[slug] enforces the five-way identity matrix — PASS (6 tests)
5. /associate/[slug]/interview enforces the same matrix and passes identity server-side to client — PASS (6 tests, `associateSlug`/`associateId` props serialized into rendered output)
6. Trainer can view any /associate/[slug] — PASS (trainer test case)
7. Trainer dashboard has a working Generate PIN button with one-time-display modal — PASS (wired into `/trainer/[slug]`)

## Next Phase Readiness

- **Phase 10 (Automated Interview Pipeline)** now has a concrete authenticated caller at `/associate/[slug]/interview`. The server component already resolves identity and hands `associateSlug` + `associateId` to the client as props. Phase 10 flesh-out: replace `AuthenticatedInterviewClient`'s placeholder body with the actual interview runtime (extracted or reused from `src/app/page.tsx`) and wire its completion POST to `/api/associate/interview/complete` using the identity props.
- **Trainer workflow** is end-to-end: generate PIN in UI → send to associate → associate enters PIN on `/associate/login` → cookie set → visits `/associate/{slug}` or `/associate/{slug}/interview` → identity flows server-side.
- **Revocation** is live end-to-end: regenerate PIN as trainer → old associate cookie fails the `ver` check in `getAssociateIdentity` → associate redirected back to `/associate/login`.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| `src/components/interview/AuthenticatedInterviewClient.tsx` | whole file | **Intentional.** Minimal shell per plan's explicit "minimal wrapper" authorization. Phase 10 replaces the body with the real interview runtime. Does NOT block this plan's goal (authenticated entry route exists and passes identity server-side). |

## Self-Check: PASSED

- `src/app/associate/login/page.tsx` — FOUND
- `src/app/associate/login/PinEntryForm.tsx` — FOUND
- `src/app/trainer/components/GeneratePinButton.tsx` — FOUND
- `src/app/associate/[slug]/page.test.tsx` — FOUND
- `src/app/associate/[slug]/interview/page.tsx` — FOUND
- `src/app/associate/[slug]/interview/page.test.tsx` — FOUND
- `src/components/interview/AuthenticatedInterviewClient.tsx` — FOUND
- commit `994f59f` — FOUND (Task 1 feat)
- commit `ff35eda` — FOUND (Task 2 RED)
- commit `8328551` — FOUND (Task 2 GREEN)
- commit `fe3e58e` — FOUND (Task 3 RED)
- commit `8788196` — FOUND (Task 3 GREEN)
- Full test suite: 121/121 pass

---
*Phase: 09-associate-pin-auth*
*Completed: 2026-04-14*
