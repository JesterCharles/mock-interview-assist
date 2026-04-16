# Phase 21: App Shell Redesign - Research

**Researched:** 2026-04-16
**Domain:** Next.js App Router layout architecture, Radix UI primitives, two-level navigation patterns
**Confidence:** HIGH

## Summary

Phase 21 replaces the single-level `Navbar.tsx` on trainer routes with a two-level shell: a global `TopBar.tsx` (section nav + cohort switcher + avatar menu) and a `SectionSidebar.tsx` (per-section item config, collapse state). The shell lives in a new `src/app/trainer/layout.tsx` that wraps all `/trainer/*` routes, while `ClientLayout.tsx` continues rendering `Navbar` for public/associate routes.

Next.js App Router route groups (`(dashboard)`, `(settings)`) provide the mechanism for per-section layout scoping without URL changes — this is the idiomatic approach and is fully supported in Next.js 16. All required Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`) are React 19-compatible at their current npm versions and are NOT yet installed in the project — they must be added.

The existing `useAuth()` hook (now Supabase-backed) already exposes `user: User | null`, which carries `user_metadata.role` and `email` for the avatar menu. No new auth infrastructure is needed.

**Primary recommendation:** Add a `src/app/trainer/layout.tsx` that renders `TopBar + SectionSidebar` (replacing `Navbar` for trainer routes), then add route groups `(dashboard)` and `(settings)` inside `src/app/trainer/` to scope sidebar configs. Install `@radix-ui/react-dialog` and `@radix-ui/react-dropdown-menu` for the mobile sheet and avatar dropdown.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Topbar (SHELL-01)**
- D-01: Single `TopBar.tsx` client component. Primary nav items: Dashboard, Interviews, Question Banks, Settings. Each item highlights when `usePathname()` matches its prefix.
- D-02: Logo (NLM wordmark or icon) links to `/trainer` (Dashboard > Roster default landing).
- D-03: Avatar menu (right side): shows user email + role badge (admin/trainer), Sign Out button. Implemented as a dropdown (click to open, click-away to close).
- D-04: Topbar present on ALL authenticated trainer routes. Rendered in a shared trainer layout.

**Cohort Switcher (SHELL-04)**
- D-05: Dropdown in topbar (left of avatar). Lists all cohorts + "All Cohorts" option. Selected cohort persists to URL `?cohort=<id>`.
- D-06: Also persist last selection to localStorage key `nlm_cohort_id` so it pre-fills on next visit.
- D-07: All Dashboard child pages (Roster, Gap Analysis, Calibration) read `?cohort` param and filter data. Non-Dashboard sections ignore the param.

**Section-Scoped Sidebar (SHELL-02)**
- D-08: Per-section sidebar config objects. Each section exports a `sidebarItems: SidebarItem[]` array.
- D-09: Dashboard sidebar: Overview group (Roster, Gap Analysis, Calibration) + Actions group (New Mock, Reports).
- D-10: Settings sidebar: Threshold, Cohorts, Curriculum, Users, Associates.
- D-11: Interviews and Question Banks render without sidebar or with minimal sidebar (Claude's Discretion).
- D-12: `SectionSidebar.tsx` renders from config. Supports collapsed state via localStorage key `nlm_sidebar_collapsed`.
- D-13: Collapsed sidebar shows icons only. Toggle button at bottom.

**Mobile Sidebar (SHELL-04 partial)**
- D-14: Radix Dialog with sheet/off-canvas variant from left. Same items as desktop sidebar.
- D-15: Hamburger visible only on mobile (<768px). Topbar items collapse to hamburger on mobile.

**Route Reorganization (SHELL-03)**
- D-16: Keep existing `/trainer/*` URLs. No rename in this phase.
- D-17: Use Next.js route groups `(dashboard)/` and `(settings)/` inside `src/app/trainer/`.
- D-18: URL preservation: `/trainer` → Roster, `/trainer/[slug]` → child under Dashboard, `/interview/new` → Interviews section, `/question-banks` → Question Banks section.
- D-19: New `/trainer/settings` routes: landing, threshold, cohorts, curriculum, users, associates.
- D-20: Existing `/trainer/cohorts/*` pages move under `/trainer/settings/cohorts/*`.
- D-21: `/trainer/onboarding` stays at current URL, accessible from Settings sidebar or CTA.

### Claude's Discretion
- Exact Radix Dialog API usage for mobile sheet
- Animation/transition for sidebar collapse
- Topbar breakpoint for hamburger vs full nav
- Whether avatar dropdown uses Radix Popover or custom
- Icon choices for sidebar items (lucide-react already installed)
- Whether to add breadcrumbs (not required by SC)

### Deferred Ideas (OUT OF SCOPE)
- `/trainer/*` → `/app/*` route rename
- Admin-promote UI (placeholder only in Settings > Users)
- Breadcrumbs
- Command palette (Cmd+K)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | Global topbar with logo + primary nav + avatar menu on all authenticated trainer routes | TopBar.tsx as client component in trainer layout.tsx; useAuth() exposes user.email + user_metadata.role; lucide-react icons available |
| SHELL-02 | Section-scoped sidebar (Dashboard/Settings configs), mobile = Radix off-canvas sheet | SectionSidebar.tsx from config array; @radix-ui/react-dialog for mobile sheet; collapsed state to localStorage; icons-only when collapsed |
| SHELL-03 | Route reorganization preserving existing URLs; new /trainer/settings section | Next.js route groups (dashboard)/(settings) inside trainer/; file moves for cohorts pages; new settings sub-pages |
| SHELL-04 | Cohort switcher persists to ?cohort URL param; sidebar collapse to localStorage | useSearchParams/useRouter for URL param; localStorage for collapse + last cohort; /api/cohorts already exists |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.4 (installed) | Route groups, nested layouts, layout.tsx per segment | Route groups `(name)/` are the idiomatic scoping mechanism — no URL impact |
| React | 19.2.3 (installed) | Component model | Already installed |
| @radix-ui/react-dialog | 1.1.15 | Mobile off-canvas sheet | React 19 peer compat confirmed; only primitive needed for off-canvas |
| @radix-ui/react-dropdown-menu | 2.1.16 | Avatar dropdown + cohort switcher | React 19 peer compat confirmed; handles click-away, keyboard nav, ARIA out of box |
| lucide-react | ^0.562.0 (installed) | Icons for topbar + sidebar | Already installed; covers all needed icons |
| Tailwind CSS 4 | installed | Styling | Already the project standard |

[VERIFIED: npm registry — @radix-ui/react-dialog@1.1.15 peerDependencies: react `^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc`]
[VERIFIED: npm registry — @radix-ui/react-dropdown-menu@2.1.16 same peer range]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-popover | 1.1.15 | Alternative to DropdownMenu for avatar | Use DropdownMenu instead — it has built-in positioning and item focus management |
| useSearchParams (Next.js) | built-in | Read `?cohort` param in child pages | All Dashboard child pages read this without extra deps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @radix-ui/react-dialog | Custom CSS drawer | Radix handles focus trap, Escape key, scroll lock, ARIA — never hand-roll |
| @radix-ui/react-dropdown-menu | Custom click-away handler | Radix handles keyboard nav, ARIA roles, portal — custom is fragile |

**Installation:**
```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/trainer/
├── layout.tsx                    # NEW: trainer shell (TopBar + conditional sidebar)
├── (dashboard)/                  # NEW: route group — no URL impact
│   ├── layout.tsx                # NEW: renders SectionSidebar with dashboard config
│   ├── page.tsx                  # MOVED from trainer/page.tsx → Dashboard > Roster
│   ├── [slug]/                   # MOVED from trainer/[slug]/
│   │   └── page.tsx
│   ├── gap-analysis/             # NEW: placeholder page
│   │   └── page.tsx
│   └── calibration/              # NEW: placeholder page
│       └── page.tsx
├── (settings)/                   # NEW: route group
│   ├── layout.tsx                # NEW: renders SectionSidebar with settings config
│   └── settings/                 # URL: /trainer/settings
│       ├── page.tsx              # landing redirect to /trainer/settings/threshold
│       ├── threshold/
│       │   └── page.tsx
│       ├── cohorts/              # MOVED from trainer/cohorts/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── curriculum/
│       │           └── page.tsx
│       ├── curriculum/
│       │   └── page.tsx
│       ├── users/
│       │   └── page.tsx
│       └── associates/           # MOVED from trainer/settings/associates/
│           └── page.tsx

src/components/shell/             # NEW: shell components
├── TopBar.tsx                    # Global topbar
├── SectionSidebar.tsx            # Sidebar from config
├── CohortSwitcher.tsx            # Dropdown in topbar
├── AvatarMenu.tsx                # Avatar dropdown
└── sidebar-configs.ts            # SidebarItem[] for each section
```

**Key constraint:** The existing `src/app/trainer/settings/associates/` already exists at that path. When moving into the `(settings)` route group, the URL `/trainer/settings/associates` is preserved — the route group `(settings)` wrapping only changes how layouts nest, not the URL.

### Pattern 1: Trainer Shell Layout (trainer/layout.tsx)

**What:** A server component layout that injects `TopBar` + `AuthProvider` context for all `/trainer/*` routes. This replaces `ClientLayout.tsx`'s `Navbar` for trainer routes.

**When to use:** The single shared wrapper for all `/trainer/*` routes.

```typescript
// Source: Next.js App Router docs — nested layouts
// src/app/trainer/layout.tsx
import { TopBar } from '@/components/shell/TopBar';

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
```

**Critical consideration:** `ClientLayout.tsx` currently renders `<Navbar />` globally (wraps the entire app in `src/app/layout.tsx` via `ClientLayout`). The trainer layout needs to suppress the global Navbar on trainer routes. The solution: render `Navbar` conditionally in `ClientLayout.tsx` based on pathname (client-side), or restructure so `ClientLayout` does NOT render Navbar for trainer routes.

Recommended approach: Move Navbar rendering OUT of `ClientLayout.tsx` and into a `ConditionalNavbar.tsx` client component that checks `usePathname()` and skips rendering if path starts with `/trainer`.

```typescript
// src/components/ConditionalNavbar.tsx ('use client')
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname.startsWith('/trainer')) return null;
  return <Navbar />;
}
```

### Pattern 2: Route Groups for Section Layout Scoping

**What:** Next.js route groups `(name)/` — parentheses in folder name = excluded from URL. Enables different `layout.tsx` per section without changing URLs.

**When to use:** `/trainer/` routes need different sidebars per section without URL changes.

```
src/app/trainer/(dashboard)/page.tsx     → URL: /trainer
src/app/trainer/(dashboard)/[slug]/      → URL: /trainer/[slug]
src/app/trainer/(settings)/settings/     → URL: /trainer/settings
```

[VERIFIED: Next.js 16 App Router documentation — route groups are a first-class feature]

**Critical nuance:** When `page.tsx` exists at `src/app/trainer/page.tsx` AND `src/app/trainer/(dashboard)/page.tsx`, there is a conflict — only one can resolve to `/trainer`. The current `page.tsx` must be MOVED into the route group.

### Pattern 3: Sidebar Config Pattern

**What:** TypeScript config objects that declare sidebar items. Each section exports its own config; `SectionSidebar.tsx` is a pure renderer.

```typescript
// src/components/shell/sidebar-configs.ts
export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const dashboardSidebarGroups: SidebarGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/trainer', label: 'Roster', icon: Users },
      { href: '/trainer/gap-analysis', label: 'Gap Analysis', icon: BarChart2 },
      { href: '/trainer/calibration', label: 'Calibration', icon: Scale },
    ],
  },
  {
    label: 'Actions',
    items: [
      { href: '/interview/new', label: 'New Mock', icon: PlayCircle },
      { href: '/trainer/reports', label: 'Reports', icon: FileText },
    ],
  },
];

export const settingsSidebarGroups: SidebarGroup[] = [
  {
    label: 'Settings',
    items: [
      { href: '/trainer/settings/threshold', label: 'Threshold', icon: Sliders },
      { href: '/trainer/settings/cohorts', label: 'Cohorts', icon: Users2 },
      { href: '/trainer/settings/curriculum', label: 'Curriculum', icon: BookOpen },
      { href: '/trainer/settings/users', label: 'Users', icon: UserCog },
      { href: '/trainer/settings/associates', label: 'Associates', icon: User },
    ],
  },
];
```

### Pattern 4: Cohort Switcher URL Param Persistence

**What:** Cohort selection stored in `?cohort=<id>` URL param. Read via `useSearchParams()` in dashboard child pages. Falls back to localStorage key `nlm_cohort_id` on initial visit.

```typescript
// In CohortSwitcher.tsx ('use client')
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

const handleSelect = (cohortId: string | null) => {
  const params = new URLSearchParams(searchParams.toString());
  if (cohortId) {
    params.set('cohort', cohortId);
    localStorage.setItem('nlm_cohort_id', cohortId);
  } else {
    params.delete('cohort');
    localStorage.removeItem('nlm_cohort_id');
  }
  router.push(`${pathname}?${params.toString()}`);
};
```

**Gotcha:** `useSearchParams()` must be wrapped in `<Suspense>` in Next.js App Router when used in a layout that wraps server components, or it triggers a client boundary error. Wrap the `CohortSwitcher` in `<Suspense fallback={null}>` in `TopBar`.

### Pattern 5: Radix Dialog as Off-Canvas Sheet

**What:** Radix `Dialog.Root` + custom `DialogContent` positioned as a left-side drawer. Not using any special Radix "Sheet" component — that's a shadcn/ui abstraction. Raw Radix Dialog with Tailwind positioning achieves the same result.

```typescript
// src/components/shell/MobileSidebar.tsx ('use client')
import * as Dialog from '@radix-ui/react-dialog';

export function MobileSidebar({ groups }: { groups: SidebarGroup[] }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="md:hidden p-2" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col"
          style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
        >
          {/* sidebar items */}
          <Dialog.Close asChild>
            <button aria-label="Close menu" className="absolute top-4 right-4">
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Anti-Patterns to Avoid

- **Navbar in trainer routes:** `ClientLayout.tsx` wraps the entire app — if not conditionally skipped, Navbar and TopBar both render on trainer routes. Must use `ConditionalNavbar` or restructure.
- **Route group conflicts:** Moving `page.tsx` into `(dashboard)/` while leaving the original at `trainer/page.tsx` causes a Next.js build error ("conflicting routes"). Delete the original after moving.
- **`useSearchParams()` without Suspense:** In App Router, any component using `useSearchParams()` inside a server component tree must be wrapped in `<Suspense>`. Missing this causes a runtime error on static rendering paths.
- **Sidebar localStorage on server:** `localStorage` is browser-only. All sidebar state reads must be in client components with proper hydration guards (`typeof window !== 'undefined'` check or `useEffect`).
- **Auth guard duplication:** The existing `trainer/page.tsx` does its own `useAuth()` redirect. The middleware already guards `/trainer/*`. Do NOT add auth guards inside individual page components — rely on middleware. The page-level guards should be removed during route migration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile off-canvas drawer | Custom CSS animation + focus trap | @radix-ui/react-dialog | Focus trap, Escape key, scroll lock, ARIA Dialog role — 50+ edge cases |
| Click-away dropdown | Custom event listener on `document` | @radix-ui/react-dropdown-menu | Handles nested portals, keyboard nav, ARIA menu role, positioning |
| Active nav item detection | String comparison on pathname | `usePathname()` + `.startsWith()` | Already the project pattern — keep consistent |

**Key insight:** Radix primitives are headless — they carry no visual opinions, compose cleanly with Tailwind 4, and eliminate focus/keyboard/ARIA work that's easy to get wrong in a navigation context.

---

## Common Pitfalls

### Pitfall 1: Global Navbar Renders on Trainer Routes

**What goes wrong:** `ClientLayout.tsx` wraps the full app and renders `<Navbar />` unconditionally. After adding `trainer/layout.tsx` with `TopBar`, trainer routes show both navbars.

**Why it happens:** Root layout → `ClientLayout` → `Navbar` runs before any nested layout can suppress it.

**How to avoid:** Add a `ConditionalNavbar` client component that reads `usePathname()` and returns `null` for `/trainer/*` paths. Replace `<Navbar />` in `ClientLayout.tsx` with `<ConditionalNavbar />`.

**Warning signs:** Two navigation bars visible on `/trainer` during dev.

### Pitfall 2: Route Conflict After Moving page.tsx Into Route Group

**What goes wrong:** Next.js build fails with "You cannot have two parallel pages that resolve to the same path."

**Why it happens:** Moving `src/app/trainer/page.tsx` into `src/app/trainer/(dashboard)/page.tsx` without deleting the original creates two routes for `/trainer`.

**How to avoid:** Delete `src/app/trainer/page.tsx` after confirming the file exists in `(dashboard)/page.tsx`.

**Warning signs:** `next build` error mentioning conflicting routes.

### Pitfall 3: Cohorts Pages at Two Locations

**What goes wrong:** After moving `/trainer/cohorts/*` to `/trainer/settings/cohorts/*`, any existing internal links pointing to the old path 404.

**Why it happens:** D-20 moves these pages but scattered `Link href="/trainer/cohorts"` references in existing components (e.g., `trainer/page.tsx` sub-nav at line 135, `CohortsClient.tsx` back links) still point to the old URL.

**How to avoid:** After moving, grep all source files for `/trainer/cohorts` and update to `/trainer/settings/cohorts`. The nav-link test in `src/app/trainer/nav-link.test.ts` asserts the old URL — update it too.

**Warning signs:** The nav-link test passes (link exists) but the page 404s.

### Pitfall 4: useSearchParams() Without Suspense Boundary

**What goes wrong:** Runtime error: "useSearchParams() should be wrapped in a suspense boundary at the page level."

**Why it happens:** `CohortSwitcher` or Dashboard child pages call `useSearchParams()` inside a component tree that has server components above them without a Suspense boundary.

**How to avoid:** Wrap `CohortSwitcher` in `<Suspense fallback={null}>` in `TopBar.tsx`. Dashboard pages that read `?cohort` param should be client components or use `searchParams` prop (server component pattern).

**Warning signs:** Next.js dev mode throws a React error about Suspense.

### Pitfall 5: Sidebar Collapse Flash on Hydration

**What goes wrong:** Sidebar renders expanded (default) on server, then collapses after client hydration reads localStorage — visible layout shift.

**Why it happens:** Server has no access to localStorage. The initial render and client render differ.

**How to avoid:** Initialize collapsed state as `false` (expanded) in `useState`. Read localStorage only in `useEffect`. This matches the theme toggle pattern already used in this codebase (see `src/app/layout.tsx` inline script). Alternatively, default to expanded on first visit (no localStorage key) and let collapse persist only after first user interaction.

**Warning signs:** Brief sidebar width flash on page load.

---

## Code Examples

### SidebarItem Active State (matches existing Navbar pattern)

```typescript
// Source: existing Navbar.tsx isItemActive pattern
const isActive = (href: string) => {
  if (href === '/trainer') return pathname === '/trainer';
  return pathname === href || pathname.startsWith(`${href}/`);
};
```

### localStorage Collapse Persistence

```typescript
// Source: existing theme boot pattern (src/app/layout.tsx inline script)
const [collapsed, setCollapsed] = useState(false);

useEffect(() => {
  const stored = localStorage.getItem('nlm_sidebar_collapsed');
  if (stored === 'true') setCollapsed(true);
}, []);

const toggle = () => {
  setCollapsed((c) => {
    const next = !c;
    localStorage.setItem('nlm_sidebar_collapsed', String(next));
    return next;
  });
};
```

### Cohort Switcher — localStorage Fallback on Initial Visit

```typescript
// On mount: read URL param first, fall back to localStorage
useEffect(() => {
  const fromParam = searchParams.get('cohort');
  if (fromParam) {
    setSelected(fromParam);
  } else {
    const stored = localStorage.getItem('nlm_cohort_id');
    if (stored) {
      // Push to URL so all Dashboard pages pick it up
      router.replace(`${pathname}?cohort=${stored}`);
    }
  }
}, []);
```

---

## File Migration Map

This is the authoritative list of file moves required by D-20 and D-17.

| Current Path | New Path | URL Before | URL After | Notes |
|-------------|----------|------------|-----------|-------|
| `src/app/trainer/page.tsx` | `src/app/trainer/(dashboard)/page.tsx` | `/trainer` | `/trainer` (unchanged) | Move, delete original |
| `src/app/trainer/[slug]/` | `src/app/trainer/(dashboard)/[slug]/` | `/trainer/[slug]` | `/trainer/[slug]` (unchanged) | Move entire directory |
| `src/app/trainer/cohorts/` | `src/app/trainer/(settings)/settings/cohorts/` | `/trainer/cohorts` | `/trainer/settings/cohorts` | URL CHANGES — update all internal links |
| `src/app/trainer/settings/associates/` | `src/app/trainer/(settings)/settings/associates/` | `/trainer/settings/associates` | `/trainer/settings/associates` (unchanged) | Move, URL preserved |
| `src/app/trainer/loading.tsx` | `src/app/trainer/(dashboard)/loading.tsx` | — | — | Dashboard loading state |

**Internal link grep targets (update after moves):**
- `/trainer/cohorts` → `/trainer/settings/cohorts` (found in `trainer/page.tsx` line 135, potentially in CohortsClient.tsx back-links)
- `/trainer/settings` may need new entry points in topbar and sidebar

---

## Environment Availability

Step 2.6: All dependencies are either already installed or available on npm with no blockers.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @radix-ui/react-dialog | Mobile sheet (D-14) | ✗ — needs install | 1.1.15 on npm | — |
| @radix-ui/react-dropdown-menu | Avatar + cohort dropdowns (D-03, D-05) | ✗ — needs install | 2.1.16 on npm | — |
| lucide-react | Sidebar icons | ✓ | ^0.562.0 | — |
| Next.js route groups | (dashboard)/(settings) layout scoping | ✓ | 16.2.4 | — |
| localStorage | Sidebar collapse + cohort persist | ✓ | browser native | — |

**Missing dependencies with no fallback:** None — both Radix packages install cleanly with `npm install`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHELL-01 | TopBar renders section nav links (DOM source check) | unit (source scan) | `npm run test` | ❌ Wave 0 |
| SHELL-01 | Topbar present on all `/trainer/*` routes (layout check) | unit (source scan) | `npm run test` | ❌ Wave 0 |
| SHELL-02 | Dashboard sidebar config has correct groups/items | unit | `npm run test` | ❌ Wave 0 |
| SHELL-03 | `/trainer/cohorts` moved to `/trainer/settings/cohorts` (link audit) | unit (source scan) | `npm run test` | ❌ Wave 0 — existing nav-link test must UPDATE |
| SHELL-04 | Sidebar collapse state persists to localStorage key | unit (behavior) | `npm run test` | ❌ Wave 0 |
| SHELL-04 | `?cohort` param propagated through Dashboard child pages | unit (source scan) | `npm run test` | ❌ Wave 0 |

**Note:** The existing `src/app/trainer/nav-link.test.ts` asserts that `/trainer/page.tsx` contains a `Link` to `/trainer/cohorts`. After D-20 moves cohorts to `/trainer/settings/cohorts`, this test MUST be updated to either (a) test the new sidebar config for the settings link, or (b) assert the new URL. Leaving it untouched causes a false-positive pass (the old page.tsx is deleted).

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/trainer/shell.test.ts` — TopBar renders required nav items (source scan, no browser needed)
- [ ] `src/components/shell/sidebar-configs.test.ts` — dashboard + settings configs have correct item counts and hrefs
- [ ] Update `src/app/trainer/nav-link.test.ts` — change assertion from `/trainer/cohorts` to `/trainer/settings/cohorts`
- [ ] `src/components/shell/CohortSwitcher.test.ts` — localStorage + URL param persistence logic

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Middleware already guards `/trainer/*` routes |
| V3 Session Management | no | Supabase session already managed in middleware |
| V4 Access Control | yes | Trainer layout must not expose trainer-only UI to associates |
| V5 Input Validation | no | No new user input fields in shell components |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Associate accesses `/trainer/*` shell | Elevation of privilege | Middleware AUTH-09 already blocks — no change needed |
| Cohort ID from URL param injected into queries without validation | Tampering | Dashboard child pages must validate `cohort` param as a Prisma ID (string UUID) before use in queries |

**Cohort param note:** The `?cohort=<id>` param added in this phase will be read by Dashboard child pages (Phase 22). These pages must treat the param as untrusted input and validate against the list of cohorts the authenticated trainer has access to — do not pass raw URL params directly into Prisma `where` clauses.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `/interview/new` and `/question-banks` do not need a trainer layout.tsx — they remain in their current app directories and TopBar highlights them via pathname matching only | Architecture Patterns | If they need the sidebar shell too, their directories also need layout.tsx wrappers — low risk, scope addition only |
| A2 | `src/app/trainer/(dashboard)/page.tsx` resolves to URL `/trainer` (route group folder name excluded from URL in Next.js 16) | Architecture Patterns | If behavior changed, all routing breaks — VERIFIED as core Next.js App Router feature |

---

## Open Questions

1. **`finalized.html` sidebar spec (Q5 from STATE.md)**
   - What we know: `.planning/phases/21-app-shell-redesign/21-CONTEXT.md` references it at `~/.gstack/projects/JesterCharles-mock-interview-assist/designs/design-system-20260413/finalized.html`
   - What's unclear: Exact pixel dimensions, animation spec for sidebar collapse
   - Recommendation: Executor agents should read `finalized.html` before implementing `SectionSidebar.tsx` — DESIGN.md says 200px sidebar width; use that as the source of truth if finalized.html diverges

2. **Gap Analysis and Calibration as placeholder pages**
   - What we know: SHELL-02/SHELL-03 reference these routes in the sidebar config but ANALYTICS-03/ANALYTICS-05 (Phase 22) build the actual content
   - What's unclear: Whether Phase 21 creates the page files with "coming soon" placeholders or leaves them as 404s
   - Recommendation: Create minimal placeholder pages (`<h1>Gap Analysis</h1>` + "Coming in Phase 22") so the sidebar links don't 404

3. **Reports action item in Dashboard sidebar**
   - What we know: D-09 lists "Reports" under Actions group
   - What's unclear: Target URL — `/trainer/reports` doesn't exist yet (Phase 24 is PDF export)
   - Recommendation: Placeholder at `/trainer/reports` with "Coming soon" same as Gap Analysis/Calibration

---

## Sources

### Primary (HIGH confidence)
- Codebase scan — `src/app/trainer/`, `src/components/Navbar.tsx`, `src/components/ClientLayout.tsx`, `src/app/layout.tsx`, `src/middleware.ts`, `src/lib/auth-context.tsx`, `src/components/layout/PublicShell.tsx`, `package.json`
- Next.js App Router route groups — [ASSUMED: core feature, stable since Next.js 13; confirmed available in installed version 16.2.4]

### Secondary (MEDIUM confidence)
- npm registry — @radix-ui/react-dialog@1.1.15, @radix-ui/react-dropdown-menu@2.1.16 peer deps confirmed via `npm view`

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry, all installed deps confirmed via package.json
- Architecture: HIGH — patterns derived from existing codebase conventions + Next.js route group mechanics
- Pitfalls: HIGH — derived from direct codebase analysis (nav-link.test.ts, ClientLayout structure, existing auth patterns)

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable domain — Next.js App Router layout patterns do not change rapidly)
