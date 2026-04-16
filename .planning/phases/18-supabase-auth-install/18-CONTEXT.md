# Phase 18: Supabase Auth Install — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** /gsd-discuss-phase (interactive)

<domain>
## Phase Boundary

Install Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`), scaffold server/middleware/admin clients, and deliver two sign-in flows:

- **Trainer/Admin:** email + password at `/signin` (Trainer tab), including password reset
- **Associate:** magic link at `/signin` (Associate tab), PKCE flow, delivered via Resend

Unify `getCallerIdentity()` to read Supabase session as the sole identity source. Introduce a three-role model (`admin` | `trainer` | `associate`) stored in `auth.users.user_metadata.role`. Middleware refreshes the Supabase session before route guard and bounces on failure.

**Out of scope:** Admin-promote UI (deferred to Phase 21+), bulk invites (Phase 19), RLS policies (Phase 20), `/trainer/*` route restructure (deferred to Phase 21).
</domain>

<decisions>
## Implementation Decisions

### Auth Provider + Credentials
- **Supabase Auth** is the sole auth provider. Email/password is safe — Supabase owns hashing, rate-limit, and leaked-password checks. OAuth (Google etc.) explicitly deferred; can be added later without migration by linking a provider.
- **Password reset enabled this phase** for trainer/admin accounts.

### Role Model (three roles)
Stored in `auth.users.user_metadata.role`:
- `admin` — can promote users to `trainer` (future UI); bootstrapped manually via Supabase dashboard
- `trainer` — full trainer dashboard access; cannot promote
- `associate` — self-view access only

Role gating happens in middleware + server route handlers (`getCallerIdentity`). The `admin` role is added now — infrastructure prep — even though the promote UI ships later.

### PIN Grace Flag — REMOVED FROM SCOPE
The PIN-based associate flow never shipped to production. **Delete `ENABLE_ASSOCIATE_AUTH` coexistence logic from AUTH-08 scope.** `getCallerIdentity()` reads Supabase session only; no fallback path, no 2-week grace window, no legacy-PIN code path. Simplifies implementation and eliminates a 2-week migration tail.

Claude's Discretion: existing PIN-related files (`pinService.ts`, `pinAttemptLimiter.ts`, `associateSession.ts`, `/api/associate/pin/*` routes, PIN generation UI) remain in the codebase for now — Phase 25 (PIN Removal + Cleanup) already owns deletion. Phase 18 should not touch them beyond ensuring `getCallerIdentity` no longer calls into them.

### Trainer / Admin Bootstrap
- **Admin seeded manually** via Supabase dashboard (create user, set `user_metadata.role='admin'`).
- Admin distributes trainer accounts via side-panel UI in a later phase (Phase 21+).
- Until that UI exists, admin promotes additional trainers via Supabase dashboard.

### Magic-Link Flow
- PKCE enabled (as required by AUTH-07).
- 7-day link expiry.
- Delivered via **Resend** using `admin.generateLink` server-side + **new email template** (not the existing interview-report template).
- **Throttle: 20 magic-links/day per trainer-issuer.** Tracked server-side against the trainer who triggers the send (defers until Phase 19 for bulk, but the primitive is introduced here if an authenticated path triggers sends). For the self-serve associate path (associate enters own email at `/signin`), a separate limiter applies — see rate limits below.
- **Callback path: `/auth/callback`** (Supabase convention).

### Password Reset Flow
- Reset emails routed through **Resend** (consistent branding), not Supabase default SMTP.
- Uses `admin.generateLink({ type: 'recovery', ... })` + custom template.
- **Rate limits:** 3 reset requests/hour/email, 10 reset requests/hour/IP.
- **Flag threshold:** 5 reset requests/email/day triggers a log entry AND an email to `ADMIN_EMAILS` / admin role recipients. Flag is advisory (does not auto-lock the account) but persisted so the admin promote UI can surface it later.

### Self-Serve Magic-Link Rate Limits (associate `/signin`)
Separate from the authenticated trainer-issued path:
- 3 requests/hour/email, 10 requests/hour/IP (mirror password-reset limits — consistent surface, easy to reason about).
- Claude's Discretion: choose limiter implementation (reuse existing `pinAttemptLimiter.ts` pattern or fresh helper). Keep keys composite (server-IP + email-hash).

### Middleware Behavior
- **Session refresh happens BEFORE route guard.** Mutated `NextResponse` is returned (as required by AUTH-06 / SC-6).
- **On refresh failure → bounce to `/signin`** with a return-to query param. No fall-through, no anonymous downgrade for guarded routes. Security-first.
- Public routes (`/`, `/signin`, `/auth/callback`, public API endpoints) remain unguarded.
- Cookie/session policy: **use @supabase/ssr defaults** (HttpOnly, SameSite=Lax, secure in prod). No custom locking for session-refresh races — defaults handle typical Next.js traffic. Revisit only if the race surfaces in testing.

### `getCallerIdentity()` Contract
- Single source: Supabase session (server client).
- Returns `{ kind: 'admin' | 'trainer' | 'associate' | 'anonymous', userId?, email?, associateSlug? }`.
- Associate linkage: `associateId` on `auth.users` metadata OR `Associate.authUserId` FK (populated in Phase 17 schema). Prefer FK lookup for canonical associate data.
- No PIN cookie read. No `ENABLE_ASSOCIATE_AUTH` check.

### Env Vars (new)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — server-only admin key
- `NEXT_PUBLIC_SITE_URL` — e.g. `https://nlm.example.com`; **boot-time assert must reject `localhost` in production** (SC-2)
- `ADMIN_EMAILS` — comma-separated allow-list used for password-reset abuse flag recipients (also usable later for admin-role cross-check)

### Boot-Time Assert
`NEXT_PUBLIC_SITE_URL` must not resolve to `localhost` / `127.0.0.1` / `0.0.0.0` when `NODE_ENV === 'production'`. Fail fast on startup — abort boot, log error. Implementation location: Claude's Discretion (likely `src/lib/env.ts` or `instrumentation.ts`).

### Supabase Client Scaffold (AUTH-05)
Three clients per @supabase/ssr convention:
- `src/lib/supabase/server.ts` — server component / route handler client (reads cookies)
- `src/lib/supabase/middleware.ts` — middleware client (refresh + set response cookies)
- `src/lib/supabase/admin.ts` — service-role client (never exposed to browser)

### Claude's Discretion
- Exact file layout for reset/magic-link rate-limit storage (Supabase table vs in-memory+DB hybrid — match existing `rateLimitService.ts` pattern where reasonable).
- Resend email template HTML/text content (follow existing design language per `DESIGN.md`).
- Route handler for password reset request + confirm (suggest `/api/auth/reset/request` + `/auth/callback` with `type=recovery`).
- Sign-in form UX specifics: error messages, loading states, post-submit confirmation copy for magic-link ("Check your email") — follow `DESIGN.md`.
- Admin-role middleware gate: likely a `requireRole('admin')` helper next to existing auth helpers.
- Where the password-reset abuse flag persists (suggest a lightweight `AuthEvent` table OR reuse existing event logging if present).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 18 section, SC 1-6
- `.planning/REQUIREMENTS.md` — AUTH-05, AUTH-06, AUTH-07, AUTH-08

### Prior Phase Context
- `.planning/phases/17-schema-prep-email-backfill/17-01-PLAN.md` — Schema migration that added `Associate.authUserId`, `Associate.email`, `Associate.lastInvitedAt`, `Session.aiTrainerVariance`. Phase 18 consumes `authUserId` for associate linkage.
- `.planning/phases/17-schema-prep-email-backfill/17-VERIFICATION.md` — Confirms migration applied locally; prod smoke deferred.

### Research Inputs
- `.planning/research/STACK.md` — Supabase auth dependencies + version pinning
- `.planning/research/ARCHITECTURE.md` — Dual-write + identity model direction
- `.planning/research/PITFALLS.md` — Supabase-specific gotchas (refresh-token rotation, PKCE callbacks, cookie SameSite)

### Existing Code Patterns (must honor)
- `src/lib/identity.ts` — Current `getCallerIdentity()` — Phase 18 replaces its body
- `src/lib/auth-context.tsx` + `src/lib/auth-server.ts` — Trainer-password auth surface being retired
- `src/middleware.ts` — Route guarding — must be reworked to insert Supabase session refresh BEFORE existing guard
- `src/app/signin/SignInTabs.tsx` — Unified sign-in entry; Trainer tab switches to Supabase email/pw, Associate tab switches to magic link
- `src/lib/rateLimitService.ts` — Pattern to follow for new rate limits
- `src/lib/email/*` (or wherever Resend is wired — check `/api/send-email`) — reuse Resend client config; new templates co-located

### Design System
- `DESIGN.md` — Sign-in UX must match
- `~/.gstack/projects/JesterCharles-mock-interview-assist/designs/design-system-20260413/finalized.html` — Visual ref for side-panel (Phase 21)

### External Docs (fetch via Context7 during research)
- `@supabase/ssr` — Next.js App Router integration, middleware pattern
- `@supabase/supabase-js` — `admin.generateLink`, `auth.signInWithPassword`, `auth.updateUser`
- Supabase PKCE magic-link docs

</canonical_refs>

<specifics>
## Specific Ideas

- Three-role model prepared now even though admin-only UI ships later — avoids a second auth migration.
- Password-reset abuse flag is advisory (log + admin email), not auto-lockout. Keeps trainers unblocked while giving admin visibility.
- 20 magic-links/day/trainer throttle is the primitive that Phase 19 (Bulk Invite) will wrap around.
- PIN removal decision eliminates ~2 weeks of grace-period code + testing surface.

</specifics>

<deferred>
## Deferred Ideas

### To Phase 21 (App Shell Redesign)
- **Admin-promote UI** — sidebar link (`Admin › Users` or similar) listing `auth.users`, button to set `user_metadata.role='trainer'`. Until this ships, admin seeds trainers manually via Supabase dashboard.
- **`/trainer/*` → `/app/*` route restructure** — with three roles now, `/trainer/*` is semantically wrong. Proposal: unified `/app/*` namespace with role-based sub-nav (admin sees Admin tab, trainer sees Roster/Cohorts, associate sees Self). Natural fit for Phase 21 since it's already rebuilding layout per `finalized.html`. Phase 18 keeps `/trainer/*` working.

### To Phase 19 (Bulk Invite)
- Trainer bulk-invite UI at `/trainer/onboarding` that issues magic links in batch. Phase 18 ships the per-request primitive + 20/day throttle; Phase 19 consumes it.

### To Phase 20 (Middleware Cutover + RLS)
- RLS policies on `Session`, `GapScore`, `Cohort`, `CurriculumWeek`.
- Removal of trainer-password legacy auth code.

### To Phase 25 (PIN Removal + Cleanup)
- Deletion of `pinService.ts`, `pinAttemptLimiter.ts`, `associateSession.ts`, `/api/associate/pin/*` routes, and `ENABLE_ASSOCIATE_AUTH` flag references. Phase 18 stops calling into them; Phase 25 deletes.

### Future (no phase yet)
- OAuth providers (Google, GitHub) for trainer sign-in.
- Passkey / WebAuthn support.

</deferred>

---

*Phase: 18-supabase-auth-install*
*Context gathered: 2026-04-15 via /gsd-discuss-phase*
