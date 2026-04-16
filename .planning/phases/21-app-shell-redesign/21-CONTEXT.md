# Phase 21: App Shell Redesign — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** /gsd-discuss-phase --auto (all decisions auto-selected)

<domain>
## Phase Boundary

Build a two-level navigation shell for trainer routes: global topbar (Dashboard / Interviews / Question Banks / Settings + avatar menu + cohort switcher) and section-scoped sidebar (each section defines its own sidebar items). Reorganize routes using Next.js route groups within existing `/trainer/*` URLs. Mobile sidebar via Radix off-canvas sheet.

**Out of scope:** Associate dashboard layout (P23), admin-promote UI beyond route placeholder, new analytics pages (P22), PDF export (P24), PIN cleanup (P25).

</domain>

<decisions>
## Implementation Decisions

### Topbar (SHELL-01)
- **D-01:** Single `TopBar.tsx` client component. Primary nav items: Dashboard, Interviews, Question Banks, Settings. Each item highlights when `usePathname()` matches its prefix.
- **D-02:** Logo (NLM wordmark or icon) links to `/trainer` (Dashboard > Roster default landing).
- **D-03:** Avatar menu (right side): shows user email + role badge (admin/trainer), Sign Out button. Implemented as a dropdown (click to open, click-away to close).
- **D-04:** Topbar is present on ALL authenticated trainer routes. Rendered in a shared trainer layout.

### Cohort Switcher (SHELL-04)
- **D-05:** Dropdown in topbar (to the left of avatar). Lists all cohorts + "All Cohorts" option. Selected cohort persists to URL `?cohort=<id>` query param.
- **D-06:** Also persist last selection to `localStorage` key `nlm_cohort_id` so it pre-fills on next visit when no `?cohort` param is present.
- **D-07:** All Dashboard child pages (Roster, Gap Analysis, Calibration) read `?cohort` param and filter data accordingly. Non-Dashboard sections ignore the param.

### Section-Scoped Sidebar (SHELL-02)
- **D-08:** Per-section sidebar config objects. Each section exports a `sidebarItems: SidebarItem[]` array defining label, href, icon.
- **D-09:** Dashboard sidebar: Overview group (Roster, Gap Analysis, Calibration) + Actions group (New Mock, Reports).
- **D-10:** Settings sidebar: Threshold, Cohorts, Curriculum, Users, Associates (BACKFILL-02 page).
- **D-11:** Interviews and Question Banks render without sidebar (full-width content) or with minimal sidebar if needed. Claude's Discretion on whether they need one.
- **D-12:** `SectionSidebar.tsx` renders from config. Supports collapsed state persisted to `localStorage` key `nlm_sidebar_collapsed`.
- **D-13:** Collapsed sidebar shows icons only (no labels). Toggle button at bottom of sidebar.

### Mobile Sidebar (SHELL-04 partial)
- **D-14:** Radix Dialog with sheet/off-canvas variant. Opens from left on hamburger button tap in topbar. Shows same sidebar items as desktop.
- **D-15:** Hamburger button visible only on mobile breakpoint (< 768px). Topbar items collapse to hamburger on mobile.

### Route Reorganization (SHELL-03)
- **D-16:** Keep existing `/trainer/*` URLs. NO `/trainer/*` → `/app/*` rename in this phase (deferred — would break bookmarks, external links).
- **D-17:** Use Next.js route groups within `src/app/trainer/` for layout scoping: `(dashboard)/`, `(settings)/`. Each group gets its own `layout.tsx` that renders `TopBar` + appropriate sidebar config.
- **D-18:** URL preservation per SC 3:
  - `/trainer` → Dashboard > Roster (default landing)
  - `/trainer/[slug]` → child route under Dashboard
  - `/interview/new` → Interviews section (topbar highlights "Interviews")
  - `/question-banks` → Question Banks section (topbar highlights "Question Banks")
- **D-19:** New `/trainer/settings` routes: `/trainer/settings` (landing), `/trainer/settings/threshold`, `/trainer/settings/cohorts`, `/trainer/settings/curriculum`, `/trainer/settings/users`, `/trainer/settings/associates`.
- **D-20:** Existing `/trainer/cohorts/*` pages move under `/trainer/settings/cohorts/*`.
- **D-21:** `/trainer/onboarding` (P19 bulk invite) stays at current URL, accessible from Settings sidebar or a CTA.

### Claude's Discretion
- Exact Radix Dialog API usage for mobile sheet
- Animation/transition for sidebar collapse
- Topbar breakpoint for hamburger vs full nav
- Whether avatar dropdown uses Radix Popover or custom
- Icon choices for sidebar items (lucide-react already installed)
- Whether to add breadcrumbs (not required by SC)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 21 section, SC 1-6
- `.planning/REQUIREMENTS.md` — SHELL-01, SHELL-02, SHELL-03, SHELL-04

### Design System
- `DESIGN.md` — All visual tokens, typography, color, spacing
- `~/.gstack/projects/JesterCharles-mock-interview-assist/designs/design-system-20260413/finalized.html` — Visual reference for topbar + sidebar layout

### Existing Code (must honor)
- `src/components/Navbar.tsx` — Current role-aware navbar. Phase 21 REPLACES this with TopBar + SectionSidebar for trainer routes. Keep Navbar for anonymous/associate routes.
- `src/components/layout/PublicShell.tsx` — Public layout wrapper. Not modified.
- `src/app/layout.tsx` — Root layout. May need conditional TopBar injection.
- `src/app/trainer/page.tsx` — Current trainer roster page (becomes Dashboard > Roster)
- `src/app/trainer/[slug]/page.tsx` — Associate detail page
- `src/app/trainer/settings/` — Existing settings directory
- `src/app/trainer/cohorts/` — Existing cohort pages (move under settings)
- `src/app/trainer/onboarding/` — P19 bulk invite page
- `src/app/interview/new/page.tsx` — Setup wizard
- `src/app/question-banks/page.tsx` — Question bank browser
- `src/lib/auth-context.tsx` — `useAuth()` hook for auth state
- `src/lib/identity.ts` — `getCallerIdentity()` for server-side identity

### Prior Phase Context
- `.planning/phases/18-supabase-auth-install/18-CONTEXT.md` — Three-role model, avatar menu needs role from Supabase session

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Navbar.tsx` — Has role detection, mobile menu toggle, lucide-react icons. Pattern to follow for TopBar but architecture is different (TopBar is simpler — no per-role nav items, just section links).
- `useAuth()` hook — Returns `isAuthenticated`, `isLoading`, `logout`. TopBar avatar menu uses this.
- `ThemeToggle.tsx` — Dark mode toggle. Include in TopBar or avatar menu.
- `PublicShell.tsx` — Pattern for layout wrappers.
- lucide-react icons already installed.

### Established Patterns
- Client components with `'use client'` directive
- `usePathname()` for active route highlighting
- localStorage for persistence (sidebar collapse, cohort selection)
- Tailwind CSS 4 with DESIGN.md tokens

### Integration Points
- New trainer layout wrapping all `/trainer/*` routes
- TopBar replaces Navbar on trainer routes
- Sidebar renders conditionally based on route group
- Cohort switcher feeds `?cohort` param to Dashboard pages
- Settings routes absorb existing cohort management pages

</code_context>

<specifics>
## Specific Ideas

- TopBar is intentionally simpler than current Navbar — just 4 section links + avatar + cohort switcher. No per-role navigation complexity (all trainer routes show the same topbar).
- Sidebar collapse animation should be subtle (width transition, icons fade in). Match DESIGN.md motion tokens.
- Cohort switcher should show cohort name + associate count in dropdown items.
- Route groups `(dashboard)` and `(settings)` let different sections have different layouts without URL changes.
- The `finalized.html` mockup is the authoritative visual reference — executor agents should read it.

</specifics>

<deferred>
## Deferred Ideas

- **`/trainer/*` → `/app/*` route rename** — Would break bookmarks and external links. Revisit when the platform has a proper URL scheme. For now, `/trainer/*` is fine.
- **Admin-promote UI** — Button to set `user_metadata.role='trainer'` via admin endpoint. Placeholder in Settings > Users. Full UI deferred to later phase.
- **Breadcrumbs** — Nice-to-have for deep routes like `/trainer/settings/cohorts/[id]/curriculum`. Not in SC, defer.
- **Command palette (Cmd+K)** — Quick navigation. Defer to post-v1.2.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 21-app-shell-redesign*
*Context gathered: 2026-04-16 via /gsd-discuss-phase --auto*
