# Phase 35: Shell Scope Reconciliation + Cleanup - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Mode:** `--auto` (all grey areas resolved via recommended defaults; see DISCUSSION-LOG.md)

<domain>
## Phase Boundary

Wire the already-authored `associateSettingsAccordion` factory into `AssociateShell` so associates get the same bottom-accordion Settings pattern as trainers (Profile + Security open `ProfileModal` on the correct tab). Delete the `@deprecated settingsSidebarGroups` export and update its two test importers. No new features; no new sidebar items; no layout restructuring. SHELL-01 scope drift (3 associate nav items vs spec's 2) is already reconciled in REQUIREMENTS.md — Phase 35 does not change nav groups.

</domain>

<decisions>
## Implementation Decisions

### Accordion Wiring (AssociateShell)

- **D-01:** `AssociateShell` becomes the owner of `ProfileModal` state (modal `open` + `initialTab`). It mirrors the pattern `AvatarMenu.tsx` already uses — `useState` for `profileOpen` + `profileInitialTab`, passed into a single `<ProfileModal>` sibling to the shell layout.
- **D-02:** `AssociateShell` builds the accordion via `associateSettingsAccordion(onOpenProfile, onOpenSecurity)` where:
  - `onOpenProfile = () => { setProfileInitialTab('profile'); setProfileOpen(true); }`
  - `onOpenSecurity = () => { setProfileInitialTab('security'); setProfileOpen(true); }`
  The returned `SettingsAccordionGroup` is passed to `SectionSidebar` via the existing `settingsGroup` prop (same API trainer side uses in `AppShell.tsx:49`).
- **D-03:** Do NOT pass `settingsGroup` into the associate `TopBar`. `TopBar` forwards `settingsGroup` to `MobileSidebar`, but associates already access Profile/Security via the `AvatarMenu`. Passing it would duplicate entry points. (If mobile sidebar turns out to need it during QA, add it in follow-up — not in scope here.)
- **D-04:** Render `<ProfileModal open={profileOpen} onClose={...} initialTab={profileInitialTab} />` at the root of `AssociateShell` (sibling to the flex wrapper, inside the top-level fragment). This matches how `AvatarMenu.tsx:176-180` already mounts it.

### Deprecated Code Removal

- **D-05:** Delete the `@deprecated settingsSidebarGroups` export from `src/components/shell/sidebar-configs.ts` (lines 51-63). It is unused by production code — only two tests import it.
- **D-06:** Delete the `settingsSidebarGroups` test block in `src/components/shell/sidebar-configs.test.ts` (lines 46-75). The behavior it asserts is now covered by `trainerSettingsAccordion` whose item list is identical. If helpful, add a lightweight parallel block for `trainerSettingsAccordion` asserting the same 5 items; otherwise rely on the existing integration wiring in `AppShell`.
- **D-07:** Delete `src/app/trainer/nav-link.test.ts` entirely. It only asserts that `settingsSidebarGroups` contains `/trainer/settings/cohorts` — a redundant, orphaned coverage of the deprecated export. The cohorts link is re-asserted via `trainerSettingsAccordion.items` in the primary sidebar-configs test file. (If the engineering reviewer prefers: rewrite the test to point at `trainerSettingsAccordion` instead. Planner will note both options; default is delete.)
- **D-08:** Remove the `/** @deprecated Use trainerSettingsAccordion */` JSDoc comment along with the export. No lingering comments or stubs.

### Test Coverage (new)

- **D-09:** Add a small integration test (or Vitest unit test against `AssociateShell` with RTL) that:
  - Renders `AssociateShell`
  - Asserts Settings accordion is present in `SectionSidebar`
  - Clicks "Profile" sub-item → asserts `ProfileModal` opens with Profile tab active
  - Clicks "Security" sub-item → asserts modal opens with Security tab active
  Location: `src/components/shell/AssociateShell.test.tsx`. If mocking `fetch('/api/profile')` is heavy, substitute with a render-assertion that `ProfileModal` receives `open={true}` + correct `initialTab` prop (shallow check via spy).
- **D-10:** Update `sidebar-configs.test.ts` to (a) remove the `settingsSidebarGroups` block and (b) optionally add a `trainerSettingsAccordion` block mirroring the old assertions (5 items, correct hrefs). Default: replace, not just delete, to preserve regression coverage.

### Scope — NOT Changing

- **D-11:** Nav groups in `associateSidebarGroups(slug)` stay at 3 items (Dashboard / Interviews / Curriculum). SHELL-01 is already reconciled in REQUIREMENTS.md:12 to match UI-SPEC D-04. No spec or code change to nav items.
- **D-12:** No changes to `AppShell.tsx` (trainer). No changes to `SectionSidebar.tsx` (accordion already supports both `href` and `action` sub-items via the existing `SettingsSubItem` type).
- **D-13:** No changes to `TopBar` prop contracts, no changes to `AvatarMenu` (it already mounts its own `ProfileModal` — the new one in `AssociateShell` is independent state, triggered only from the accordion path).

### Claude's Discretion

- Exact file structure of the new `AssociateShell.test.tsx` (test names, helper factories). Planner can pick the lightest mock strategy.
- Whether to add a parallel `trainerSettingsAccordion` unit block in `sidebar-configs.test.ts` (D-10) or drop the deprecated block entirely. Default: add the parallel block.
- Whether to rewrite `src/app/trainer/nav-link.test.ts` pointing at `trainerSettingsAccordion` or delete it (D-07). Default: delete.

### Folded Todos

No pending todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Source

- `.planning/ROADMAP.md` §"Phase 35" (lines 217-227) — Goal, requirements, success criteria.
- `.planning/REQUIREMENTS.md` — SHELL-01 (reconciled note), SHELL-32-01 (associate-side gap).
- `.planning/v1.3-MILESTONE-AUDIT.md` (lines 47, 59-63, 91-92, 138, 166-167) — Audit findings that created this phase: orphaned `associateSettingsAccordion`, deprecated `settingsSidebarGroups`.

### Prior Phase Context (binding patterns)

- `.planning/phases/32-shell-overhaul/32-01-PLAN.md` §Task 2 (lines 179-194) — Original factory signature and design intent for `associateSettingsAccordion(onOpenProfile, onOpenSecurity)`.
- `.planning/phases/32-shell-overhaul/32-01-SUMMARY.md` §3 — Confirms factory exports Profile + Security as `action` (not `href`) sub-items.
- `.planning/phases/32-shell-overhaul/32-CONTEXT.md` — Upstream decisions on Settings accordion pattern (if planner needs more background).

### Code To Modify

- `src/components/shell/AssociateShell.tsx` — Add ProfileModal state + wire `associateSettingsAccordion` into `SectionSidebar`'s `settingsGroup` prop.
- `src/components/shell/sidebar-configs.ts` (lines 51-63) — Delete `settingsSidebarGroups` + JSDoc.
- `src/components/shell/sidebar-configs.test.ts` (lines 46-75) — Remove deprecated block; optionally add `trainerSettingsAccordion` parallel block.
- `src/app/trainer/nav-link.test.ts` — Delete (or rewrite against `trainerSettingsAccordion`).

### Code To Read (reference, do not modify)

- `src/components/shell/AppShell.tsx` (lines 45-64) — Canonical trainer pattern for passing `trainerSettingsAccordion` into `SectionSidebar`. Mirror this.
- `src/components/shell/AvatarMenu.tsx` (lines 19-31, 176-180) — Canonical pattern for owning `ProfileModal` state + setting `initialTab`. Reuse the exact state-management shape in `AssociateShell`.
- `src/components/shell/SectionSidebar.tsx` (lines 156-286) — Accordion renderer. Supports both `href` and `action` sub-items already; no change needed.
- `src/components/shell/ProfileModal.tsx` — Accepts `open`, `onClose`, `initialTab: 'profile' | 'security' | 'learning'`. Already production-ready.
- `src/components/shell/types.ts` — `SettingsAccordionGroup`, `SettingsSubItem` type contracts.
- `src/app/profile/ProfileTabs.tsx` — Destination rendered inside the modal (for understanding tab behavior; no change).
- `src/app/associate/[slug]/layout.tsx` — Associate route layout that mounts `AssociateShell`. Confirms no prop-contract change is needed at the layout level.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`ProfileModal`** (`src/components/shell/ProfileModal.tsx`) — Fully reusable. Accepts `initialTab` prop. Used today by `AvatarMenu`. `AssociateShell` will instantiate a second instance, owned by the shell.
- **`associateSettingsAccordion(onOpenProfile, onOpenSecurity)`** (`sidebar-configs.ts:77-89`) — Already exported. Returns a `SettingsAccordionGroup` with Profile + Security action items. Zero factory changes needed.
- **`SectionSidebar` `settingsGroup` prop** (`SectionSidebar.tsx:20`) — Already accepts `SettingsAccordionGroup | undefined`. Rendering logic for action-style sub-items (`{item.action}` branch, lines 270-280) already exists.
- **`AvatarMenu` state pattern** (`AvatarMenu.tsx:19-31`) — Minimal two-useState + `openProfileTab(tab)` helper. Copy directly into `AssociateShell`.

### Established Patterns

- **Shell owns sidebar + modal state** — `AvatarMenu` already demonstrates owning `ProfileModal` state in a client component. `AssociateShell` is already `'use client'` and manages sidebar collapse state — modal state fits the same mental model.
- **Trainer parallelism** — `AppShell.tsx:47-58` is the template. Passes `settingsGroup={trainerSettingsAccordion}` to both `SectionSidebar` and `TopBar`. Associate shell should pass to `SectionSidebar` only (D-03).
- **Accordion sub-item variants** — The `SettingsSubItem` type (`types.ts:17-22`) supports both `href` (Link) and `action` (button). Trainer uses all `href`; associate uses all `action`. Rendering already branches correctly.

### Integration Points

- `AssociateShell` is the only integration point. No route, layout, or API change.
- `sidebar-configs.ts` deletion has 2 downstream importers (both test files). No production imports.

</code_context>

<specifics>
## Specific Ideas

- Match `AvatarMenu.tsx:19-31` state shape exactly in `AssociateShell` (`profileOpen`, `profileInitialTab`, `openProfileTab(tab)` helper). Consistency beats cleverness here.
- Keep the `ProfileModal` mount at the root of `AssociateShell` so it layers above the sidebar and main content, matching how `AvatarMenu` renders it as a root-level sibling.
- Planner should verify no other file imports `settingsSidebarGroups` before deletion (`grep -r 'settingsSidebarGroups' src/`). Expected result: zero hits after deleting the two test files' references.

</specifics>

<deferred>
## Deferred Ideas

None surfaced during auto-analysis.

### Reviewed Todos (not folded)

None — no pending todos matched this phase.

</deferred>

---

*Phase: 35-shell-scope-reconciliation*
*Context gathered: 2026-04-17 (auto mode)*
