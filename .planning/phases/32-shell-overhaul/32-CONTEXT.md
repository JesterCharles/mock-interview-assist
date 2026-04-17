# Phase 32: Shell Architecture Overhaul - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure AppShell navigation: sidebar becomes primary nav for all roles with Settings as a collapsible bottom section. TopBar stripped to utility items only. Fix 10 UX issues found during v1.3 QA.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Architecture
- **D-01:** Sidebar is the PRIMARY navigation surface for all roles. ALL section nav moves from TopBar center to sidebar.
- **D-02:** Trainer sidebar groups: Overview (Roster, Gap Analysis, Calibration), Actions (New Mock, Reports, Batch Upload), Settings (bottom, collapsible — expands inline to Threshold, Cohorts, Curriculum, Users, Associates)
- **D-03:** Associate sidebar groups: Dashboard, Interviews, Curriculum, Settings (bottom, collapsible — expands to Profile, Security, future items)
- **D-04:** Settings is ALWAYS the last item in sidebar for both roles. It's a collapsible group — clicking it expands/collapses the sub-items inline (no route change on click, just accordion toggle)
- **D-05:** Batch Upload moves from `/trainer/onboarding` to sidebar under Actions group

### TopBar Reduction
- **D-06:** TopBar becomes utility-only. Left: NLM wordmark (home link). Right: CohortSwitcher (trainer only), ThemeToggle, Avatar menu.
- **D-07:** NO center nav links in TopBar. The NAV_ITEMS array (Dashboard, Interviews, Question Banks, Settings) is removed from TopBar entirely.
- **D-08:** Avatar menu dropdown order: Profile (opens modal), Settings (navigates to settings page), separator, Sign Out

### Landing Page
- **D-09:** Landing page (`/`) gets a minimal header: NLM logo + "Sign In" button. No sidebar. No full shell. Just a lightweight top bar for unauthenticated users.

### Roster Changes
- **D-10:** Remove slug column from RosterTable
- **D-11:** Clicking a roster row navigates to `/trainer/[slug]` which renders the SAME `AssociateDashboardClient` component used by `/associate/[slug]/dashboard`. Trainer sees the same view associates see — SkillCardList, FocusHero, charts, radar.

### Profile
- **D-12:** Profile is a MODAL overlay, not a separate page. Triggered from Avatar menu → Profile. Renders full ProfileTabs (profile + security + learning tabs) as a centered overlay inside the shell.
- **D-13:** `/profile` route can be removed or redirect to trigger the modal. Profile is no longer a standalone page.

### Update Password Security
- **D-14:** Update/change password flow requires either old password OR email verification code before allowing password change. No raw password update without verification.

### Claude's Discretion
- Modal overlay implementation (dialog, portal, or overlay component approach)
- Settings collapsible animation (CSS transition or React state)
- Mobile responsive behavior for collapsible Settings section
- Minimal header component structure for landing page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shell Components
- `src/components/shell/TopBar.tsx` — Current TopBar with center nav (to be stripped)
- `src/components/shell/SectionSidebar.tsx` — Current sidebar (to gain Settings accordion)
- `src/components/shell/sidebar-configs.ts` — Sidebar group configs for trainer/associate
- `src/components/shell/AvatarMenu.tsx` — Avatar dropdown (to add Profile modal trigger)
- `src/components/shell/AssociateShell.tsx` — Associate shell wrapper

### Profile
- `src/app/profile/page.tsx` — Current standalone profile page (to be removed/redirected)
- `src/app/profile/ProfileTabs.tsx` — Profile tabs component (to render in modal)

### Roster
- `src/components/trainer/RosterTable.tsx` — Roster table (remove slug column)
- `src/app/trainer/(dashboard)/[slug]/page.tsx` — Trainer associate detail (to reuse AssociateDashboardClient)
- `src/app/associate/[slug]/dashboard/AssociateDashboardClient.tsx` — Associate dashboard client (to be shared)

### Landing & Auth
- `src/app/page.tsx` — Landing page (needs minimal header)
- `src/app/auth/set-password/page.tsx` — Password setup (needs old-password verification)
- `DESIGN.md` — Design system tokens

### Navigation
- `src/app/trainer/onboarding/page.tsx` — Batch upload page (sidebar link needed)
- `src/app/trainer/(dashboard)/trainer.css` — Trainer scoped styles

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SectionSidebar` already supports collapsible toggle and `sidebarHeader` — extend for Settings accordion
- `AssociateDashboardClient` is already a client component with all viz — can be imported directly by trainer detail page
- `ProfileTabs` is a self-contained client component — can be lifted into a modal wrapper
- `TopBar` already has role-aware branching — strip center nav, keep utility zone

### Established Patterns
- Sidebar groups defined in `sidebar-configs.ts` as typed arrays — add Batch Upload + Settings items there
- Shell layout: TopBar (sticky top) + SectionSidebar (sticky left) + content area
- Avatar menu uses Radix dropdown — Profile modal trigger fits naturally

### Integration Points
- `sidebar-configs.ts` is the single config for all sidebar items — all changes route through here
- `TopBar.tsx` center nav removal affects trainer routes that depend on it for navigation
- Landing page currently has no shell — adding minimal header is additive
- Trainer detail page at `/trainer/[slug]` currently has its own data fetching — needs to switch to AssociateDashboardClient's data shape

</code_context>

<specifics>
## Specific Ideas

- Settings as last sidebar item with inline accordion (click toggles sub-items, not a route)
- Profile modal triggered from avatar menu, renders ProfileTabs with all 3 tabs
- Landing page gets just logo + sign in button, no sidebar, no full shell
- Trainer associate detail page should look identical to what the associate sees

</specifics>

<deferred>
## Deferred Ideas

- Notifications icon in TopBar (mentioned as "eventual" — not in scope)
- Associate Settings sub-items beyond Profile/Security (future phases)

</deferred>

---

*Phase: 32-shell-overhaul*
*Context gathered: 2026-04-17*
