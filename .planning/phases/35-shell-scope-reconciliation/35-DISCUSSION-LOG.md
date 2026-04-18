# Phase 35: Shell Scope Reconciliation + Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 35-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 35-shell-scope-reconciliation
**Mode:** `--auto` (unattended — all grey-area questions auto-decided using recommended defaults)
**Areas discussed:** Accordion Wiring, Security Sub-item Behavior, Deprecated Code Removal, Test Coverage

---

## Accordion Wiring (state ownership)

| Option | Description | Selected |
|--------|-------------|----------|
| AssociateShell owns ProfileModal state (mirror AvatarMenu pattern) | Add `useState` for `profileOpen` + `profileInitialTab` in AssociateShell; mount `<ProfileModal>` at shell root. Pass callbacks into `associateSettingsAccordion(...)`. | ✓ |
| Delegate to existing AvatarMenu ProfileModal via DOM event/ref | Reuse the single modal mounted by AvatarMenu and trigger it via a custom event or context. Avoids duplicate modal instances. | |
| Create new `useProfileModal()` context provider | Introduce shared modal context; both AvatarMenu and AssociateShell consume it. | |

**User's choice (auto):** AssociateShell owns ProfileModal state.
**Rationale:** Mirrors the already-working `AvatarMenu.tsx:19-31` pattern exactly — lowest-risk, zero new abstractions. Option 2 creates hidden coupling through the DOM; Option 3 is scope creep (needs its own phase). Two modal instances is cheap — only one opens at a time.
**Notes:** Planner should copy the exact state shape (`profileOpen`, `profileInitialTab`, `openProfileTab(tab)`) from AvatarMenu for consistency.

---

## Security Sub-item Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Open ProfileModal with `initialTab='security'` | Use the factory's `onOpenSecurity` callback to set `initialTab` to `'security'` before opening the modal. | ✓ |
| Navigate to a standalone `/security` route | Route to a dedicated security page instead of a modal tab. | |
| Open ProfileModal and leave tab at default | Always open on Profile tab regardless of which sub-item clicked. | |

**User's choice (auto):** ProfileModal with `initialTab='security'`.
**Rationale:** Matches Phase 32 plan intent (32-01-PLAN.md:179-194) and the `ProfileModal` already supports `initialTab: 'security'`. Option 2 contradicts SHELL-32-04 (profile is modal-only). Option 3 defeats the purpose of a separate Security sub-item.
**Notes:** Signature already exists — `associateSettingsAccordion(onOpenProfile, onOpenSecurity)` — no factory change.

---

## TopBar `settingsGroup` Prop for Associate

| Option | Description | Selected |
|--------|-------------|----------|
| Do NOT pass `settingsGroup` to associate `TopBar` | Associates already access Profile/Security via `AvatarMenu`; passing it would duplicate entry points in MobileSidebar. | ✓ |
| Pass `settingsGroup` to associate `TopBar` (mirror trainer) | Full parity with `AppShell.tsx:57` — Settings also appears in mobile drawer. | |

**User's choice (auto):** Do not pass.
**Rationale:** Duplicate entry points in the mobile drawer would be redundant with the AvatarMenu which already has Profile + Settings items. If mobile QA later shows friction, it's a one-line addition in a follow-up — not in phase scope.
**Notes:** Called out explicitly so planner doesn't cargo-cult the trainer pattern.

---

## Deprecated Code Removal Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Delete `settingsSidebarGroups` export + update all importers this phase | Remove lines 51-63 of `sidebar-configs.ts` and the JSDoc. Update/delete the two test files that import it. | ✓ |
| Keep `@deprecated` export one more milestone for safety | Defer deletion; re-audit in v1.4. | |
| Delete export, keep tests as-is (let them fail, fix next) | Delete first, deal with test breakage later. | |

**User's choice (auto):** Delete + update importers in this phase.
**Rationale:** Success criterion #3 explicitly requires the deprecated export be removed "with no remaining imports". Leaving tests that reference it violates the criterion. Option 2 defers the goal of the phase. Option 3 produces a broken build.
**Notes:** Two importers to address — `sidebar-configs.test.ts` and `src/app/trainer/nav-link.test.ts`.

---

## Handling `src/app/trainer/nav-link.test.ts`

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the test file entirely | The test only asserts that `settingsSidebarGroups` contains `/trainer/settings/cohorts`. The same link is asserted in `sidebar-configs.test.ts` (via `trainerSettingsAccordion` parallel coverage in D-10). | ✓ |
| Rewrite to point at `trainerSettingsAccordion` | Change import to `trainerSettingsAccordion` and walk its `items` array. | |

**User's choice (auto):** Delete.
**Rationale:** The test is orphan coverage of a dying export. Keeping it means adding a rewrite just to preserve a redundant assertion. Planner can flip to "rewrite" if code review prefers; default is delete.
**Notes:** This was explicitly flagged as the lowest-risk option; pointing the planner at the alternative in CONTEXT.md D-07.

---

## Test Coverage for AssociateShell Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Add targeted Vitest/RTL test on AssociateShell (Profile click → modal open with 'profile' tab; Security click → 'security' tab) | New file `src/components/shell/AssociateShell.test.tsx`. Exercises the new wiring. | ✓ |
| No new tests; rely on existing integration tests | Don't add a new test file. | |
| Full Playwright E2E for associate Settings accordion | E2E test in `e2e/` that clicks through in a real browser. | |

**User's choice (auto):** Add targeted Vitest test.
**Rationale:** The failure mode is silent (accordion present but callbacks misrouted → wrong tab). A targeted unit test catches regressions cheaply. Option 2 leaves regression risk. Option 3 is heavier than needed for a callback-wiring phase.
**Notes:** If mocking `fetch('/api/profile')` is painful, the planner can swap to a shallow assertion that `ProfileModal` receives the right `initialTab` prop.

---

## Sidebar-configs Test Restructure

| Option | Description | Selected |
|--------|-------------|----------|
| Replace `settingsSidebarGroups` describe block with parallel `trainerSettingsAccordion` block | Keep the 5-item regression coverage but point at the live export. | ✓ |
| Only delete the `settingsSidebarGroups` block | Drop coverage entirely; `trainerSettingsAccordion` is tested implicitly via AppShell integration. | |

**User's choice (auto):** Replace with parallel block.
**Rationale:** Preserves the exact same regression coverage (5 items, correct hrefs, all icons present) against the current export. Zero coverage loss.
**Notes:** Lightweight — copy the existing assertions, swap the import.

---

## Scope Guard: Nav Groups

| Option | Description | Selected |
|--------|-------------|----------|
| Leave `associateSidebarGroups` at 3 items (Dashboard/Interviews/Curriculum) | SHELL-01 already reconciled in REQUIREMENTS.md:12 to 3 items per UI-SPEC D-04. | ✓ |
| Reduce to 2 items (original SHELL-01 spec) | Match the pre-reconciliation spec. | |

**User's choice (auto):** Leave at 3 items.
**Rationale:** REQUIREMENTS.md and ROADMAP.md both already treat this as reconciled (ROADMAP.md:220: "SHELL-01 (reconciled — 3 items matches UI-SPEC D-04)"). Phase goal is _reconciliation_, not reversion. No code change needed for SHELL-01.
**Notes:** Called out as a scope guard so planner doesn't accidentally "fix" the 3-item nav.

---

## Claude's Discretion

- Exact test names and helper factories in `AssociateShell.test.tsx` (D-09).
- Whether to fold the `trainerSettingsAccordion` parallel block into the existing `sidebar-configs.test.ts` or a new file (default: same file, D-10).
- Mock strategy for `/api/profile` inside the new test — stub `global.fetch` or shallow-assert on `ProfileModal` props.

## Deferred Ideas

None — discussion stayed within phase scope.
