# Phase 28: Sign-in Redesign - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the tabbed SignInTabs component with two stacked buttons that expand inline forms via accordion behavior. Add mandatory first-login password setup for magic-link users (associates and trainers). Detection uses Supabase `user_metadata` flag — no DB migration in this phase (Profile table deferred to Phase 28.1).

</domain>

<decisions>
## Implementation Decisions

### Button Expand Behavior
- **D-01:** Two stacked outlined buttons with lucide icons: Mail icon ("Continue with email link") and KeyRound icon ("Sign in with password"). Both always visible.
- **D-02:** Accordion collapse — clicking one button expands its form below; other button dims but stays visible. Clicking the dimmed button swaps which is expanded.
- **D-03:** Smooth height transition on expand/collapse (~200ms ease). CSS transition on max-height/opacity.
- **D-04:** No tab UI at all. Delete the `role="tablist"` pattern and tab switching state.

### First-Login Detection
- **D-05:** Use Supabase `user_metadata.password_set = true` flag. Set when user successfully creates a password via `/auth/set-password`. Check on login — if missing/false, redirect to set-password page.
- **D-06:** Detection happens in the auth callback flow (`/auth/callback` or `/auth/callback-link`). After successful magic-link verification, check `user_metadata.password_set`. If not set, redirect to `/auth/set-password` instead of dashboard.
- **D-07:** Applies to BOTH associates (magic-link first login) and trainers (if trainer signs in via magic-link/reset without having set a password).

### Password Upgrade UX
- **D-08:** Mandatory — user cannot skip. Must set password before accessing dashboard. Page blocks navigation until password is set.
- **D-09:** Redirect to `/auth/set-password` (new route, similar to existing `/auth/update-password`). Reuse the same form pattern (password + confirm, 8 char minimum).
- **D-10:** After successful password set: redirect to user's dashboard (associate → `/associate/[slug]/dashboard`, trainer → `/trainer`). User is already authenticated — no re-login needed.
- **D-11:** Set `user_metadata.password_set = true` after successful `supabase.auth.updateUser({ password })` call.

### Visual Style
- **D-12:** Outlined buttons with left-aligned lucide icons (Mail, KeyRound). `--ink` color icon, `--border` outline. Full-width buttons stacked vertically with 12px gap.
- **D-13:** Active/expanded button gets accent treatment — `--accent` border, slight `--surface` background. Dimmed button gets `--surface-muted` background, `--muted` text.
- **D-14:** Keep existing card container style (460px max-width, `--surface` background, `--border` outline, 12px radius, 40px padding). "Sign in" heading stays.

### Claude's Discretion
- Exact transition CSS implementation (max-height vs grid-template-rows trick)
- Whether to refactor `/auth/update-password` and `/auth/set-password` to share a common password form component
- Form field layout within the expanded accordion sections
- How to handle the edge case where a user already has a password but `password_set` metadata is missing (treat as not set — prompt once, then flag is set)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sign-in Components (modify)
- `src/app/signin/SignInTabs.tsx` — Current tabbed sign-in component. Being replaced with accordion buttons.
- `src/app/signin/page.tsx` — Sign-in page server component. Container layout stays, child component changes.

### Auth Flow (modify/extend)
- `src/app/auth/callback/page.tsx` — Auth callback handler. Needs first-login detection logic.
- `src/app/auth/update-password/page.tsx` — Existing password update page. Pattern reference for new `/auth/set-password`.
- `src/lib/supabase/browser.ts` — `createSupabaseBrowserClient` used for auth operations.
- `src/lib/supabase/server.ts` — `createSupabaseServerClient` for server-side auth checks.

### Auth Context
- `src/lib/auth-context.tsx` — Client-side auth state (useAuth hook, login function).
- `src/lib/identity.ts` — `getCallerIdentity()` for role detection (used for post-password redirect routing).

### Middleware
- `src/middleware.ts` — Route guards. May need update to handle `/auth/set-password` as a public auth route.

### Design System
- `DESIGN.md` — Typography, color, spacing tokens. Buttons follow existing `btn-accent-flat` pattern.
- `src/app/globals.css` — CSS custom properties for all design tokens.

### Requirements
- `.planning/REQUIREMENTS.md` §Sign-in — SIGNIN-01, SIGNIN-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SignInTabs.tsx` — All form logic (trainer email/password, magic link, forgot password) already works. Restructure UI around accordion, keep form handlers.
- `/auth/update-password/page.tsx` — Password form pattern (password + confirm, 8 char min, Supabase `updateUser`). Reference for `/auth/set-password`.
- `btn-accent-flat` CSS class — Existing button style used for submit buttons.
- `inputBase` style object — Reused input styling pattern in both sign-in and update-password pages.

### Established Patterns
- Inline styles using CSS custom properties (`var(--ink)`, `var(--surface)`, etc.) — consistent across auth pages
- `useAuth()` hook for client-side login
- `createSupabaseBrowserClient()` for client-side Supabase operations
- `supabase.auth.updateUser()` for password updates
- Role-based redirect after auth (`role === 'trainer' → /trainer`, else associate dashboard)

### Integration Points
- `/auth/callback` page — First-login detection goes here (check `user_metadata.password_set` after magic-link verification)
- `middleware.ts` — `/auth/set-password` needs to be allowed as a public auth route
- Supabase `user_metadata` — Used via `supabase.auth.updateUser({ data: { password_set: true } })`

</code_context>

<specifics>
## Specific Ideas

- Lucide icons: `Mail` for email link button, `KeyRound` for password button. Both from `lucide-react` (already installed).
- Accordion transition: CSS `max-height` + `opacity` transition, or CSS `grid-template-rows: 0fr/1fr` trick for smoother height animation.
- The "Forgot password?" link stays within the password accordion section (already exists in current SignInTabs).

</specifics>

<deferred>
## Deferred Ideas

- **Profile table + page (Phase 28.1):** User wants a Profile model (Prisma) with `passwordSetAt`, github, email display, update password, and a profile page accessible from the avatar menu dropdown. First-login detection can migrate from `user_metadata` to Profile table. Include basic associate info display. This is a new phase to insert after Phase 28.
- **Associate password sign-in option on /signin:** Currently associates only see magic link. Once all associates have passwords (via mandatory first-login setup), could add password sign-in for associates too. Future consideration.

</deferred>

---

*Phase: 28-sign-in-redesign*
*Context gathered: 2026-04-16*
