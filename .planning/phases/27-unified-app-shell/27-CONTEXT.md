# Phase 27: Unified App Shell - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the trainer's TopBar+SectionSidebar shell to serve associate pages. Associates get a role-restricted sidebar (Dashboard, Interviews, Curriculum). Delete PublicShell, AssociateNav, ConditionalNavbar, and Navbar — all authenticated routes use the unified shell.

</domain>

<decisions>
## Implementation Decisions

### Associate Sidebar Nav
- **D-01:** Three items: Dashboard (`LayoutDashboard`), Interviews (`PlayCircle`), Curriculum (`BookOpen`). All lucide icons.
- **D-02:** Flat list — no group labels. Only 3 items, groups add noise.
- **D-03:** Interviews links to `/` (public automated interview flow), NOT `/interview/new` (trainer-only setup wizard).
- **D-04:** Curriculum nav item added now with placeholder "Coming soon" page. Phase 30 builds the real view. Shell is complete from day one.
- **D-05:** Collapse toggle enabled — same SectionSidebar behavior as trainer. localStorage persistence shared.

### Sidebar Header
- **D-06:** Cohort name only — small label at top of sidebar: "Cohort: Spring 2026" style.
- **D-07:** No cohort assigned = header area empty. No placeholder text, no CTA. Sidebar starts directly with nav items.

### TopBar Adaptation
- **D-08:** No center nav links for associates. TopBar shows NLM wordmark (left) + ThemeToggle + AvatarMenu (right). Clean.
- **D-09:** No CohortSwitcher for associates — they belong to one cohort.
- **D-10:** NLM wordmark links to `/associate/[slug]/dashboard` (associate home). Parallel to trainer wordmark → `/trainer`.

### Migration & Cleanup
- **D-11:** `/signin` and `/` (landing) stay standalone — no shell. Pre-auth pages. Centered content on `--bg` background.
- **D-12:** Delete ConditionalNavbar + Navbar entirely. All authenticated routes use TopBar+Sidebar.
- **D-13:** `/interview/*` and `/review/*` routes get trainer shell (TopBar + sidebar). They're trainer-authenticated.
- **D-14:** Delete PublicShell and AssociateNav components completely (SHELL-04).

### Claude's Discretion
- How to make TopBar role-aware (single component with role prop, or separate configs)
- Implementation of the sidebar config for associates (new `associateSidebarGroups` in sidebar-configs.ts)
- How to pass associate slug to wordmark link and sidebar routes
- Placeholder page design for Curriculum "coming soon"

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shell Components (modify/extend)
- `src/components/shell/TopBar.tsx` — Current trainer topbar. Needs role-aware wordmark link + conditional center nav.
- `src/components/shell/SectionSidebar.tsx` — Reuse as-is for associates. Already supports `groups` prop.
- `src/components/shell/sidebar-configs.ts` — Add `associateSidebarGroups` config here.
- `src/components/shell/types.ts` — SidebarGroup/SidebarItem types.
- `src/components/shell/MobileSidebar.tsx` — Mobile hamburger menu. Should work for associates too.

### Components to Delete
- `src/components/associate/AssociateNav.tsx` — Tab bar being replaced by sidebar.
- `src/components/layout/PublicShell.tsx` — Wrapper being replaced by shell.
- `src/components/ConditionalNavbar.tsx` — Legacy navbar switcher.
- `src/components/Navbar.tsx` — Legacy navbar.

### Layouts to Modify
- `src/app/associate/[slug]/layout.tsx` — Currently uses PublicShell + AssociateNav. Switch to TopBar + SectionSidebar.
- `src/components/ClientLayout.tsx` — Currently renders ConditionalNavbar. Needs rework.
- `src/app/trainer/(dashboard)/layout.tsx` — Reference for how trainer shell layout works.

### Auth/Identity
- `src/lib/identity.ts` — `getCallerIdentity()` for role detection.
- `src/lib/auth-context.tsx` — Client-side auth state (useAuth hook).

### Design System
- `DESIGN.md` — Layout section (sidebar 200px, topbar 56px height).

### Requirements
- `.planning/REQUIREMENTS.md` §App Shell — SHELL-01, SHELL-02, SHELL-03, SHELL-04.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SectionSidebar` — Already supports arbitrary `groups: SidebarGroup[]` prop. Just pass associate config.
- `TopBar` — Already has CohortSwitcher, ThemeToggle, AvatarMenu. Needs conditional rendering based on role.
- `AvatarMenu` — Should work for associates (sign out, profile link).
- `MobileSidebar` — Hamburger menu already parameterized by `groups`.
- `sidebar-configs.ts` — Pattern for defining nav configs. Add `associateSidebarGroups`.

### Established Patterns
- Trainer shell: `(dashboard)/layout.tsx` renders `<SectionSidebar groups={...} />` + `<main>`. Same pattern for associate.
- `resolveGroups(pathname)` in TopBar maps pathname to sidebar config. Extend for `/associate/*`.
- localStorage sidebar collapse state shared via `nlm_sidebar_collapsed` key.

### Integration Points
- `src/app/associate/[slug]/layout.tsx` — Main integration point. Replace PublicShell+AssociateNav with TopBar+SectionSidebar.
- `src/components/ClientLayout.tsx` — Remove ConditionalNavbar, potentially simplify to just AuthProvider.
- TopBar `NAV_ITEMS` array — conditionally empty for associates.
- TopBar wordmark `href` — needs role-aware routing (trainer → `/trainer`, associate → `/associate/[slug]/dashboard`).

</code_context>

<specifics>
## Specific Ideas

- Associate "Interviews" destination is `/` (public automated interview), NOT `/interview/new` (trainer setup wizard). This is a key distinction.
- Curriculum placeholder page should be minimal — "Coming soon" text, consistent with shell styling.
- `/interview/*` and `/review/*` routes get full trainer shell treatment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-unified-app-shell*
*Context gathered: 2026-04-16*
