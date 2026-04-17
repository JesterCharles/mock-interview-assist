# Phase 32: Shell Architecture Overhaul — Research

**Researched:** 2026-04-17
**Domain:** Next.js shell navigation, Radix UI modal, Supabase auth, React component composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Sidebar is PRIMARY nav for all roles. ALL section nav moves from TopBar center to sidebar.
- **D-02:** Trainer sidebar groups: Overview (Roster, Gap Analysis, Calibration), Actions (New Mock, Reports, Batch Upload), Settings (bottom, collapsible — expands inline to Threshold, Cohorts, Curriculum, Users, Associates)
- **D-03:** Associate sidebar groups: Dashboard, Interviews, Curriculum, Settings (bottom, collapsible — expands to Profile, Security, future items)
- **D-04:** Settings is ALWAYS the last sidebar item for both roles. Collapsible accordion — click toggles sub-items, no route change on click.
- **D-05:** Batch Upload moves from `/trainer/onboarding` to sidebar under Actions group.
- **D-06:** TopBar utility-only. Left: NLM wordmark (home link). Right: CohortSwitcher (trainer only), ThemeToggle, Avatar menu.
- **D-07:** NO center nav links in TopBar. NAV_ITEMS array removed entirely.
- **D-08:** Avatar menu order: Profile (opens modal), Settings (navigates), separator, Sign Out.
- **D-09:** Landing page (`/`) gets minimal header only: NLM logo + Sign In button. No sidebar, no full shell.
- **D-10:** Remove slug column from RosterTable.
- **D-11:** Clicking a roster row navigates to `/trainer/[slug]` which renders same `AssociateDashboardClient` as associate view.
- **D-12:** Profile is a MODAL overlay triggered from Avatar menu. Renders full ProfileTabs inside shell.
- **D-13:** `/profile` route removed or redirected. Profile is no longer a standalone page.
- **D-14:** Password change requires old password OR email verification code before allowing update.

### Claude's Discretion
- Modal overlay implementation (dialog, portal, or overlay component approach)
- Settings collapsible animation (CSS transition or React state)
- Mobile responsive behavior for collapsible Settings section
- Minimal header component structure for landing page

### Deferred Ideas (OUT OF SCOPE)
- Notifications icon in TopBar
- Associate Settings sub-items beyond Profile/Security
</user_constraints>

---

## Summary

This phase is a focused shell refactor — no new data fetching patterns, no new libraries needed. Every surface touched already exists in the codebase. The main work is: (1) restructuring sidebar configs to add a Settings accordion group at the bottom, (2) stripping TopBar center nav, (3) promoting Profile from a route to a modal triggered from AvatarMenu, (4) swapping the trainer detail page to render `AssociateDashboardClient`, and (5) adding a minimal header to the landing page.

The most technically nuanced piece is D-14: requiring old password verification before a password change. Supabase's `supabase.auth.reauthenticate()` API handles the "send email OTP to re-verify" flow. The old-password path can be implemented locally using `signInWithPassword` to verify before calling `updateUser`. Both paths exist and are well-documented.

**Primary recommendation:** Use Radix `Dialog` (already installed and used by `MobileSidebar`) for the Profile modal — no new dependency. The Settings accordion uses local `useState` in `SectionSidebar`, toggled by a non-Link button row. All changes are additive to existing patterns.

---

## Project Constraints (from CLAUDE.md)

- Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- All styling via DESIGN.md CSS tokens (`var(--*)`) — no Tailwind color classes for brand colors
- No new libraries unless unavoidable; Radix UI already installed (`@radix-ui/react-dropdown-menu`, `@radix-ui/react-dialog`)
- Vitest 4 for testing (`npm run test`)
- GSD workflow enforcement: use `/gsd-execute-phase` for changes
- Design system: read `DESIGN.md` before any visual decision — warm editorial aesthetic, no decorative motion

---

## Standard Stack

No new packages required. All tools already in the codebase:

| Already Installed | Role in This Phase |
|-------------------|--------------------|
| `@radix-ui/react-dialog` | Profile modal overlay (used by MobileSidebar) |
| `@radix-ui/react-dropdown-menu` | AvatarMenu dropdown (existing) |
| `lucide-react` | Icons for Settings accordion chevron |
| `next/navigation` | `usePathname`, `useRouter` |
| `@supabase/supabase-js` (browser client) | Reauthentication + password update |

**No npm installs required for this phase.** [VERIFIED: codebase grep + component reads]

---

## Architecture Patterns

### Sidebar Settings Accordion (D-02, D-03, D-04)

**Pattern:** Add a new `SettingsAccordion` concept directly in `SectionSidebar`. The Settings item is rendered as a button (not a `Link`) that toggles `settingsOpen` state. Sub-items slide in beneath it. This stays entirely in `SectionSidebar.tsx` — no changes to the `SidebarGroup`/`SidebarItem` types needed if we introduce a new optional `accordion` property on a group, or simply hard-code the Settings accordion as a special bottom section.

**Recommended approach:** Extend `sidebar-configs.ts` with a `SettingsAccordionGroup` type, keeping the existing `SidebarGroup` type unchanged for all nav groups. `SectionSidebar` receives a separate optional `settingsGroup` prop. This keeps the typed API clean.

```typescript
// src/components/shell/types.ts — add:
export interface SettingsAccordionGroup {
  label: string;           // "Settings"
  icon: IconComponent;     // Settings icon (lucide)
  items: SidebarItem[];    // sub-items (no route change on parent click)
}

// src/components/shell/SectionSidebar.tsx — new prop:
interface SectionSidebarProps {
  groups: SidebarGroup[];
  sidebarHeader?: string | null;
  settingsGroup?: SettingsAccordionGroup;   // NEW
}
```

The `SectionSidebar` renders regular groups first (in `nav`), then the Settings accordion last in the `nav`, above the collapse toggle button. The accordion open state is `useState(false)` and persists in `localStorage` under `nlm_settings_open` to survive page transitions.

**Animation:** CSS `max-height` transition (0 → auto via measured pixel value) or simpler: `display: none` toggle with no animation. Given DESIGN.md's "minimal-functional" motion rule and the kill list, use a simple `150ms ease-out` `max-height` transition from 0 to a fixed max (e.g., 300px). This avoids the `height: auto` animation problem without JS measurement. [ASSUMED — animation approach; low risk]

**Collapsed sidebar state:** When the sidebar is in its narrow (48px) collapsed state, the Settings accordion should show just the icon (same as other items), with tooltip on hover. Sub-items should NOT be shown in collapsed state (they have no room). The accordion open state is irrelevant when collapsed. [ASSUMED: consistent with existing icon-only collapsed behavior]

**Mobile:** `MobileSidebar` renders the Settings group as an always-expanded list of sub-items (same as existing groups) since there's no space constraint in the mobile sheet. [ASSUMED: simplest safe behavior]

### TopBar Reduction (D-06, D-07)

**What to remove:** Delete the `NAV_ITEMS` array, the `isNavItemActive` function, the `resolveGroups` function (no longer needed — groups come from props or shell), and the center `<nav>` block entirely.

**What stays:** Left zone (wordmark + MobileSidebar trigger), spacer (`flex: 1`), right zone (CohortSwitcher + ThemeToggle + AvatarMenu). The `role` prop stays for `associateSlug` wordmark href resolution and CohortSwitcher visibility.

**After change:** `sidebarGroups` prop on TopBar can be removed since TopBar no longer renders center nav. MobileSidebar still needs groups — pass them directly from the shell wrapper (`AssociateShell`, trainer layout) to `MobileSidebar` as a separate prop, or keep passing through TopBar if it stays in the signature. Cleanest: keep passing `sidebarGroups` to TopBar solely for MobileSidebar forwarding.

```typescript
// TopBar simplified:
export function TopBar({ sidebarGroups, role = 'trainer', associateSlug, settingsGroup }: TopBarProps) {
  // No NAV_ITEMS, no resolveGroups, no center nav
  return (
    <header ...>
      {/* Left: MobileSidebar + wordmark */}
      {/* Right: CohortSwitcher + ThemeToggle + AvatarMenu */}
    </header>
  );
}
```

### Profile Modal (D-12)

**Pattern:** `Radix Dialog` — already installed and used by `MobileSidebar`. Add a controlled Dialog in `AvatarMenu` (or a parent wrapper) that renders `ProfileTabs` as content.

**Problem:** `ProfileTabs` currently receives `profile`, `email`, `role`, and `readiness` props that are fetched server-side in `ProfilePage`. Moving to a modal means these must be fetched client-side (API call) when the modal opens, OR pre-fetched and threaded through via context.

**Recommended approach:** Lazy fetch on modal open. Add a `/api/profile` GET endpoint (or extend existing PUT endpoint to support GET). When the modal opens, fire a fetch, show a skeleton, then render `ProfileTabs` with results.

**ProfileTabs wrapper issue:** `ProfileTabs` currently has an outer container styled as a full page (`minHeight: 100vh`, `padding: 48px 16px`, centered layout). This wrapper must be stripped when rendering inside a modal. The cleanest approach: pass a `variant?: 'page' | 'modal'` prop to ProfileTabs, or extract the wrapper into the page/modal caller and have ProfileTabs render only its content card. Given that the page route is being removed (D-13), just strip the outer wrapper from `ProfileTabs` entirely — it no longer needs to be a standalone page. [VERIFIED: ProfileTabs code at lines 203-213 — outer `div` with `min-height: 100vh` is the only wrapper to remove]

**Modal dimensions:** DESIGN.md spec for modals uses `border-radius: 12px` (xl), `border: 1px solid var(--border)`. Max width 600px (matches the existing `maxWidth: 600` in ProfileTabs card). Use Dialog.Overlay with `background: rgba(0,0,0,0.4)`.

```typescript
// AvatarMenu.tsx — Profile modal trigger pattern:
const [profileOpen, setProfileOpen] = useState(false);

<Dialog.Root open={profileOpen} onOpenChange={setProfileOpen}>
  <Dialog.Portal>
    <Dialog.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
    <Dialog.Content
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw',
        maxWidth: 640,
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        zIndex: 61,
        padding: 40,
      }}
    >
      <Dialog.Close /> {/* X button top-right */}
      <ProfileModalContent /> {/* Fetches data + renders ProfileTabs content */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**ProfileTabs password security tab:** D-14 requires old password OR email code before password update. The Security tab in ProfileTabs currently calls `supabase.auth.updateUser({ password })` directly with no prior verification. This must be replaced. See "Update Password Security" section below.

### `/profile` Route Removal (D-13)

**Options:**
1. Delete `src/app/profile/` directory entirely — profile page is gone, only modal exists
2. Convert `src/app/profile/page.tsx` to a redirect to the home route (trainer or associate dashboard)

**Recommended:** Option 2 (redirect). Safer — any hardcoded `/profile` links in emails or bookmarks gracefully redirect rather than 404. The redirect can be a Next.js `redirect()` call in the server component to `/trainer` or `/`. The old profile page code is ~60 lines of server-side data fetching that the modal will re-implement client-side.

**Route guards:** `src/middleware.ts` may protect `/profile`. Check whether it's explicitly listed — if so, remove it. [ASSUMED: middleware guards may or may not include /profile — verify during implementation]

### Sharing AssociateDashboardClient in Trainer Detail (D-11)

**Current state:** `src/app/trainer/(dashboard)/[slug]/page.tsx` is a client component that fetches from `/api/trainer/${slug}` and renders trainer-specific views (session history, GapTrendChart, CalibrationView, AssociateCohortSelect, Export PDF).

**Target state:** Replace the detail view body with `AssociateDashboardClient`, which takes: `displayName`, `gapScores`, `sessions`, `readinessPercent`, `threshold`, `recommendedArea`, `lowestScore`, `lowestSkillSessionCount`.

**Data shape delta:** `AssociateDashboardClient` uses `GapScoreEntry[]` and `SessionSummary[]` from `@/lib/trainer-types`. The existing `/api/trainer/[slug]` route already returns `gapScores` and `sessions` in its `AssociateDetail` response shape. The fields map directly — no new API route needed. [VERIFIED: trainer detail page already fetches from /api/trainer/${slug} and stores AssociateDetail]

**What gets removed:** AssociateCohortSelect, GapTrendChart, CalibrationView, Export PDF button — these are trainer-only features. Decision D-11 says trainer sees the same view as associates. These features can be preserved in a separate trainer-actions section above/below the AssociateDashboardClient, or removed per the decision. Given D-11 says "same view," trainer-specific actions (cohort assign, PDF export) should either be removed from the detail view or placed in a small utility strip above the dashboard. Recommend: keep a narrow trainer-only action bar (cohort select + export PDF) above the AssociateDashboardClient content. This is within Claude's discretion since D-11 specifies the content view only.

**Readiness data:** AssociateDashboardClient receives `readinessPercent` (0-100) and `threshold`. The `/api/trainer/[slug]` response must include these fields. Verify the API response shape includes readiness percent — if not, compute it from `readinessScore`. [ASSUMED: API already returns readiness fields — verify during implementation]

### Minimal Header for Landing Page (D-09)

**Current state:** `src/app/page.tsx` (the public interview page) wraps itself in its own full-page layout with no shared shell. It already has its own header-like structure inside the interview steps.

**Target state:** Add a lightweight `<LandingHeader>` component: `src/components/shell/LandingHeader.tsx`. Renders a sticky 56px bar (same height as TopBar for visual consistency) with NLM wordmark left, Sign In button right.

```typescript
// src/components/shell/LandingHeader.tsx
export function LandingHeader() {
  return (
    <header style={{
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'var(--surface-muted)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      justifyContent: 'space-between',
    }}>
      <Link href="/" style={{ fontFamily: 'var(--font-display)...', ... }}>NLM</Link>
      <Link href="/signin" className="btn-accent-flat" style={{ fontSize: 13 }}>Sign In</Link>
    </header>
  );
}
```

The landing page (`page.tsx`) adds this header above its existing content. No layout file changes needed since the landing page manages its own layout.

### Update Password Security (D-14)

**Current state:** `ProfileTabs` Security tab calls `supabase.auth.updateUser({ password: newPassword })` directly. `SetPasswordPage` (first-login) also calls `updateUser` directly but this is expected (it's first-time setup, no prior password).

**Supabase API for re-verification:**

Two supported paths: [VERIFIED: Supabase JS docs — `supabase.auth.reauthenticate()` and `signInWithPassword`]

**Path A — Old password verification (for password-type users):**
```typescript
// Step 1: Verify old password locally
const supabase = createSupabaseBrowserClient();
const { error: verifyError } = await supabase.auth.signInWithPassword({
  email: currentUserEmail,
  password: oldPassword,
});
if (verifyError) { /* show "Incorrect current password" */ return; }

// Step 2: If verify succeeds, update to new password
const { error } = await supabase.auth.updateUser({ password: newPassword });
```

**Path B — Email OTP verification (for magic-link-only users who have no password):**
```typescript
// Step 1: Trigger reauthentication email (sends OTP to current user's email)
await supabase.auth.reauthenticate();

// Step 2: User enters OTP code from email
const { error: otpError } = await supabase.auth.verifyOtp({
  email: currentUserEmail,
  token: userEnteredCode,
  type: 'email',
});
if (otpError) { /* show error */ return; }

// Step 3: updateUser
await supabase.auth.updateUser({ password: newPassword });
```

**UX flow for Security tab (D-14 compliant):**
- Check if user has `password_set: true` in `user_metadata` (already tracked via `/api/profile`)
- If yes: show "Current password" field → verify via `signInWithPassword` → then show new password fields
- If no (magic-link only user): show "Send verification email" button → `reauthenticate()` → OTP input → then show new password fields

**Note on `signInWithPassword` for re-auth:** This is a lightweight approach that works but creates a new session token internally. Supabase's `reauthenticate()` is the purpose-built method that doesn't create side effects. For users with a password set, `signInWithPassword` is the simpler and more reliable check because `reauthenticate()` always sends email regardless of whether the user has a password. [CITED: Supabase docs — `reauthenticate()` sends email OTP to user's email]

**Recommendation:** Show "Current password" input by default. On submit: try `signInWithPassword` with old password. If user has no password (magic-link only), show a "Send verification code" button instead that calls `reauthenticate()`. Detect by checking `user_metadata.password_set`.

### sidebar-configs.ts Changes

**Trainer additions:**
- `dashboardSidebarGroups`: Add `{ href: '/trainer/onboarding', label: 'Batch Upload', icon: Upload }` to Actions group (D-05)
- Add `trainerSettingsAccordion: SettingsAccordionGroup` export with items: Threshold, Cohorts, Curriculum, Users, Associates — same items as current `settingsSidebarGroups`

**Associate changes:**
- `associateSidebarGroups`: Add Settings accordion with Profile (triggers modal — needs a button variant, not href) and Security items

**Problem:** Settings accordion sub-items for Profile are not navigation links — clicking "Profile" should open the modal, not navigate. This means the Settings accordion sub-items cannot be plain `SidebarItem` objects with `href`. Need a `SettingsSubItem` type that can be either a link or an action:

```typescript
export interface SettingsSubItem {
  label: string;
  icon: IconComponent;
  href?: string;           // navigation link
  action?: () => void;    // modal trigger (Profile)
}
```

**Pattern:** The Profile sub-item's `action` is passed as a prop from the shell wrapper down to SectionSidebar. Since `SectionSidebar` is a client component with `usePathname`, this is fine — the prop is a callback. The shell wrapper (trainer layout, AssociateShell) owns the modal state and passes `onOpenProfile` down.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal overlay | Custom fixed-position div with escape key handling, focus trap, ARIA | Radix `Dialog` (already installed) | Focus trap, ARIA, keyboard nav, scroll lock all handled |
| Password re-verification | Custom JWT decode or server-side session check | `supabase.auth.signInWithPassword` + `supabase.auth.reauthenticate()` | Auth state managed by Supabase; client methods are the correct API |
| Sidebar accordion animation | JS-measured height transitions | CSS `max-height` transition with fixed max | Height auto transitions don't animate; fixed max is 3 lines of CSS |

---

## Common Pitfalls

### Pitfall 1: `ProfileTabs` full-page wrapper inside modal
**What goes wrong:** ProfileTabs has `minHeight: 100vh` in its outer div. Inside a Dialog it makes the modal taller than the viewport with no scroll.
**Why it happens:** ProfileTabs was designed as a standalone page.
**How to avoid:** Strip the outer wrapper from ProfileTabs. The Dialog.Content provides its own sizing and scroll. ProfileTabs should render only its content card (the `maxWidth: 600` white box).
**Warning signs:** If modal is too tall on first render, the wrapper div is still there.

### Pitfall 2: Settings accordion not closing when sidebar collapses
**What goes wrong:** User opens Settings sub-items, collapses the sidebar to icon-only mode. Sub-items are hidden by collapsed state but the `settingsOpen` state remains true. When user re-expands sidebar, Settings pops open again unexpectedly.
**How to avoid:** This is actually acceptable behavior — state persists. If not desired, clear `settingsOpen` when sidebar collapses. Simplest: don't clear it (consistent with accordion patterns).

### Pitfall 3: TopBar `resolveGroups` still present after center nav removal
**What goes wrong:** The `resolveGroups` function in `TopBar.tsx` switches sidebar groups based on pathname. After removing center nav, this logic is dead code but still runs. If it ever mutates `sidebarGroups`, the prop passed to MobileSidebar could be wrong.
**How to avoid:** Delete `resolveGroups`, `NAV_ITEMS`, `isNavItemActive` entirely. `sidebarGroups` prop is now the only source of truth.

### Pitfall 4: `/profile` middleware guard causing 404 redirect instead of page redirect
**What goes wrong:** If `src/middleware.ts` has `/profile` in its guarded paths and the page is converted to a redirect, anonymous users hitting `/profile` get middleware-redirected to `/signin` instead of the profile page's own redirect. This is actually fine behavior — but verify middleware doesn't intercept before the page-level redirect runs.
**How to avoid:** Check `middleware.ts` matcher config. If `/profile` is in the matcher, the middleware redirect takes precedence and the page-level code never runs. That's acceptable — the net result is the same (unauthenticated users go to `/signin`).

### Pitfall 5: `AssociateDashboardClient` data shape mismatch in trainer context
**What goes wrong:** Trainer detail page fetches `AssociateDetail` from `/api/trainer/[slug]`. `AssociateDashboardClient` expects `GapScoreEntry[]` with `weightedScore`, `skill`, `topic`, etc. If the API returns slightly different field names, TypeScript won't catch it at runtime.
**How to avoid:** Import `GapScoreEntry` and `SessionSummary` types and verify the API response maps exactly. `AssociateDetail.gapScores` should already be `GapScoreEntry[]` since both trainer and associate API share the same types. [VERIFIED: both use `@/lib/trainer-types`]

### Pitfall 6: `signInWithPassword` for re-auth creates UX friction on rate-limit
**What goes wrong:** Supabase rate-limits `signInWithPassword` attempts. If the user types the wrong old password multiple times, they can hit auth rate limits.
**How to avoid:** Show clear error messaging on first failure. Don't retry silently. Rate limits are per-IP and are Supabase-enforced — no workaround needed, just good error messaging.

### Pitfall 7: Radix Dialog portal z-index conflicts with TopBar
**What goes wrong:** TopBar has `zIndex: 30`. Dialog.Content needs to be above it. MobileSidebar's Dialog.Content uses `z-50` (50). Profile modal should use `z-60` or `zIndex: 61` to clear TopBar and any sidebar.
**How to avoid:** Set Dialog.Overlay `zIndex: 60` and Dialog.Content `zIndex: 61`. Existing TopBar is `z: 30`, MobileSidebar overlay is `z-40`, content is `z-50`. Stack clears properly.

---

## Code Examples

### Settings Accordion in SectionSidebar (verified pattern)

```typescript
// SectionSidebar.tsx — add settingsOpen state alongside collapsed:
const [settingsOpen, setSettingsOpen] = useState(false);

useEffect(() => {
  const stored = localStorage.getItem('nlm_settings_open');
  if (stored === 'true') setSettingsOpen(true);
}, []);

const toggleSettings = () => {
  setSettingsOpen((o) => {
    const next = !o;
    localStorage.setItem('nlm_settings_open', String(next));
    return next;
  });
};

// Render at bottom of nav (above collapse toggle):
{settingsGroup && !collapsed && (
  <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
    <button
      onClick={toggleSettings}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: 8,
        padding: '6px 12px',
        margin: '1px 6px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
      className="hover:bg-[var(--highlight)]"
    >
      <settingsGroup.icon style={{ width: 16, height: 16 }} />
      <span style={{ flex: 1, textAlign: 'left' }}>Settings</span>
      <ChevronDown
        style={{
          width: 14, height: 14,
          transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 150ms ease-out',
        }}
      />
    </button>

    <div
      style={{
        maxHeight: settingsOpen ? '300px' : 0,
        overflow: 'hidden',
        transition: 'max-height 150ms ease-out',
      }}
    >
      {settingsGroup.items.map((item) => (
        item.href ? (
          <Link key={item.label} href={item.href} style={{ /* sub-item style */ }}>
            <item.icon style={{ width: 14, height: 14 }} />
            <span>{item.label}</span>
          </Link>
        ) : (
          <button key={item.label} onClick={item.action} style={{ /* same style */ }}>
            <item.icon style={{ width: 14, height: 14 }} />
            <span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  </div>
)}
```

### Avatar Menu Profile Trigger

```typescript
// AvatarMenu.tsx — replace <a href="/profile"> with Dialog trigger:
import * as Dialog from '@radix-ui/react-dialog';

// Inside AvatarMenu component:
const [profileOpen, setProfileOpen] = useState(false);

// In dropdown:
<DropdownMenu.Item
  onSelect={() => setProfileOpen(true)}  // onSelect not onClick — Radix fires onSelect
  style={{ /* existing styles */ }}
>
  Profile
</DropdownMenu.Item>

// After the DropdownMenu.Root:
<ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
```

**Important:** Use `onSelect` not `onClick` for Radix DropdownMenu items. `onSelect` fires after the dropdown closes, preventing the dropdown from staying open when the modal opens. [VERIFIED: Radix DropdownMenu.Item API — `onSelect` is the correct event]

### Password Re-verification Flow (D-14)

```typescript
// In ProfileTabs Security tab — before calling updateUser:
const [oldPassword, setOldPassword] = useState('');

async function handlePasswordSubmit(e: FormEvent) {
  e.preventDefault();

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasPassword = user?.user_metadata?.password_set === true;

  if (hasPassword) {
    // Path A: verify old password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: oldPassword,
    });
    if (verifyError) {
      setPasswordError('Current password is incorrect.');
      return;
    }
  }
  // (Path B: email OTP handled separately via reauthenticate flow)

  // Proceed with update
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  // ...
}
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Settings accordion sub-items use `max-height: 300px` fixed max for CSS animation | Settings Accordion pattern | If items exceed ~10 sub-items, content clips. Unlikely given current item count (5 trainer, 2 associate). |
| A2 | Collapsed sidebar hides Settings accordion sub-items by virtue of `collapsed` guard | Sidebar accordion | If guard is missing, sub-items render in collapsed (icon-only) mode with no room. Easily caught in review. |
| A3 | `/profile` is not explicitly guarded in `src/middleware.ts` | Profile route removal | If it is guarded, middleware redirect takes precedence (still safe behavior — just different code path). |
| A4 | `/api/trainer/[slug]` response includes `readinessPercent` or equivalent field | AssociateDashboardClient reuse | AssociateDashboardClient needs `readinessPercent` (0-100). If API returns `readinessScore` in different units, a mapping is needed. Verify during implementation. |
| A5 | Landing page (`src/app/page.tsx`) is not wrapped in any layout that would conflict with LandingHeader | Landing page header | The landing page adds its own header div — check no parent layout also renders a header. |

---

## Open Questions

1. **AssociateDashboardClient in trainer view — trainer-only actions**
   - What we know: D-11 says trainer sees "same view" as associate (SkillCardList, FocusHero, charts, radar)
   - What's unclear: Does "same view" mean strictly identical (no PDF export, no cohort assign) or does it mean same primary content with trainer extras permitted?
   - Recommendation: Add a small trainer-only header strip (cohort assign dropdown + Export PDF button) above the dashboard content. This matches the spirit of D-11 (same readiness data) while preserving operational utility. If the user disagrees, the strip is trivial to remove.

2. **Profile modal `/api/profile` GET**
   - What we know: Current `/api/profile` only has PUT. The modal needs to fetch profile data client-side.
   - What's unclear: Does a GET endpoint exist?
   - Recommendation: Add `GET /api/profile` that calls `getOrCreateProfile(identity.userId)` and returns the same shape as ProfileTabs expects. Small addition.

3. **Associate Settings "Security" sub-item**
   - What we know: D-03 says associate Settings accordion has Profile + Security items.
   - What's unclear: Does "Security" open the Security tab of the Profile modal, or navigate somewhere?
   - Recommendation: "Security" opens the Profile modal with the Security tab pre-selected. Pass `initialTab?: Tab` prop to ProfileTabs.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely UI/code changes. No external CLI tools, databases, or services beyond what's already running.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.ts` (inferred from package.json) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Behavior | Test Type | Notes |
|----------|-----------|-------|
| TopBar has no center nav links | unit/smoke | Vitest render test — NAV_ITEMS absent |
| Settings accordion toggles open/closed | unit | Vitest render + click test |
| Profile modal opens from AvatarMenu | smoke | Playwright E2E after implementation |
| RosterTable has no slug column | unit | Vitest render snapshot |
| Password update requires old password field | unit | Vitest form interaction |

### Wave 0 Gaps
- Existing test suite covers API routes; shell component tests are likely sparse. Playwright E2E is the right harness for modal/accordion interaction — create after implementation via playwright-cli.

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | YES — D-14 re-verification | `signInWithPassword` + `reauthenticate()` |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | Modal is in-shell, auth already enforced |
| V5 Input Validation | Minimal | Password min-length (already in ProfileTabs) |

**D-14 security note:** The old-password verification via `signInWithPassword` is correct practice (ASVS V2.1.9 — re-authentication before sensitive operations). Do NOT skip this step or make it optional for any authenticated user. The Supabase service-role key must NOT be used for password re-verification — use the browser client (user's own session). [VERIFIED: Supabase auth docs — updateUser without re-auth is a known vulnerability in magic-link-only flows]

---

## Sources

### Primary (HIGH confidence)
- `src/components/shell/SectionSidebar.tsx` — Sidebar structure, localStorage pattern, existing accordion-like toggle
- `src/components/shell/TopBar.tsx` — NAV_ITEMS, center nav, structure to strip
- `src/components/shell/AvatarMenu.tsx` — Radix DropdownMenu pattern, onSelect vs onClick
- `src/components/shell/MobileSidebar.tsx` — Radix Dialog usage, z-index levels (z-40/z-50)
- `src/app/profile/ProfileTabs.tsx` — Component props interface, outer wrapper to remove
- `src/app/profile/page.tsx` — Server-side data fetching to replicate client-side
- `src/app/associate/[slug]/dashboard/AssociateDashboardClient.tsx` — Props interface
- `src/app/trainer/(dashboard)/[slug]/page.tsx` — Current trainer detail, data shape
- `src/components/trainer/RosterTable.tsx` — Slug column (lines 112-116) to remove
- `DESIGN.md` — Modal border-radius, z-index, motion rules

### Secondary (MEDIUM confidence)
- Radix UI `Dialog` docs — `onSelect` event, portal behavior, focus trap [CITED: radix-ui.com/docs/primitives/components/dialog]
- Supabase `reauthenticate()` and `signInWithPassword` re-auth pattern [CITED: supabase.com/docs/reference/javascript/auth-reauthenticate]

---

## Metadata

**Confidence breakdown:**
- Sidebar accordion: HIGH — existing pattern in SectionSidebar, only adding state + conditional render
- TopBar reduction: HIGH — pure deletion of NAV_ITEMS block, no new patterns
- Profile modal: HIGH — Radix Dialog already used, ProfileTabs wrapper issue identified and solvable
- AssociateDashboardClient reuse: HIGH — both use same types from trainer-types, direct import
- D-14 password re-auth: HIGH — Supabase API verified, pattern documented
- Landing page header: HIGH — purely additive, no layout conflicts expected

**Research date:** 2026-04-17
**Valid until:** 90 days (stable UI patterns, Supabase auth API stable)
