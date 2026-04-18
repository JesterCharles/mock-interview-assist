# Phase 40: UI MVP - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Ship the associate-facing coding UI: `/coding` list and `/coding/[challengeId]` solve page. Integrate into existing AppShell with role-aware nav entry. Monaco editor lazy-loaded with per-language syntax. Queued/running/verdict states surfaced clearly. Attempt history sidebar scoped to authenticated associate. Dark mode + DESIGN.md compliant.

**In scope:**
- `/coding` route — list view with filters (language, week, difficulty, status), empty state for unassigned associates
- `/coding/[challengeId]` route — prompt markdown + Monaco editor (lazy) + Run button (not bound to submit in v1.4 — defer) + Submit button + attempt history sidebar
- AppShell nav: add "Coding" sidebar entry for associate AND trainer roles
- Verdict badges + queued/running/pass/fail/error visual states (polling-driven via existing `usePollAttempt` hook created here)
- Dark-mode compliant; all new components use DESIGN.md tokens

**Out of scope (other phases):**
- Trainer coding dashboard panel → Phase 41
- SQL dialect label (first pass in Phase 42) → Phase 42
- Run button server path (local-only execution preview) → v1.5 (Submit is only path in v1.4)
- Challenge authoring UI → v1.5

</domain>

<decisions>
## Implementation Decisions

### Routing + AppShell (locked)
- **D-01:** Routes under `src/app/coding/page.tsx` and `src/app/coding/[challengeId]/page.tsx` (App Router server components wrapping client components). No route grouping (no `(challenges)` folder) — flat is simpler.
- **D-02:** AppShell nav entry added for both associate and trainer roles. Existing `Navbar.tsx` role matrix pattern. Label: "Coding". Icon: TBD — pick existing icon from design system (probably a chevron-code or terminal glyph already present).

### List Page (`/coding`)
- **D-03:** Server component fetches first page via `/api/coding/challenges?limit=20` — hydrate client component with initial data. Client handles filter state (URL search params), cursor pagination ("Load more" button — no infinite scroll in v1.4).
- **D-04:** Card-based list (reuses existing Card variants). Each card shows: title, language tag, difficulty badge, skillSlug pill, status badge (unstarted/attempted/passed derived from latest attempt). Empty state: full-card empty component with CTA to contact trainer for cohort assignment.
- **D-05:** Filters as dropdowns in a sticky top bar: language, week, difficulty, status. URL-encoded (`?language=python&week=3`). Server respects filters (Phase 39 D-14).

### Solve Page (`/coding/[challengeId]`)
- **D-06:** Layout: two-column on md+, stacked on mobile. Left: prompt markdown (rendered via existing markdown renderer). Right: editor + controls + attempt history.
- **D-07:** Monaco editor loaded via `next/dynamic` with `ssr: false`. Bundled language workers for the 5 allowlisted languages (python, javascript, typescript, java, sql, csharp). Theme derived from current color-mode (light/dark Monaco theme paired with DESIGN.md palette).
- **D-08:** Language toggle: dropdown at top of editor (only shows languages the challenge supports per `challenge.languages`). Default = first language in list. Switching resets code to starter for that language (`challenge.starters[lang]`).
- **D-09:** Submit button: POSTs to `/api/coding/submit` with `{ challengeId, language, code }`. Disabled while a submission is pending. On success, switch to "pending" state with attempt id and kick off polling.
- **D-10:** Run button: PRESENT IN UI (disabled with "Coming soon" tooltip) — keeps the surface visible so v1.5 doesn't need a re-layout. No backend in v1.4.

### Polling + States (locked)
- **D-11:** `usePollAttempt(attemptId)` custom hook. States: `queued` → `running` → `{pass|fail|timeout|runtime_error|compile_error|mle}`. Polling: 500ms initial, exponential backoff to 5 sec, stop at 60 sec wall clock (surfaces "Taking longer than expected — check back soon" message).
- **D-12:** Verdict card shows: overall pill (colored per verdict), visible test results accordion (stdin, your-output, expected, pass/fail per test), hidden tests summary "X/Y hidden tests passed" — never the inputs.
- **D-13:** Error toasts for network failures, 429 rate-limit (surfaces `Retry-After`), 403 forbidden (language not supported for this associate's cohort).

### Attempt History Sidebar
- **D-14:** Loads last 10 attempts for the current challenge + current associate via a new client-side call to `/api/coding/attempts?challengeId=X&limit=10` (new query-param on existing `/api/coding/attempts/[id]` — or a new list route; planner picks). Each entry: timestamp, verdict badge, language, "View" button that swaps attempt into the main panel to re-display.

### Design System Compliance
- **D-15:** All new components must use DESIGN.md tokens. No hardcoded hex. Dark mode toggled via existing boot script / color-mode context.
- **D-16:** Phase 40 will trigger the UI gate in plan-phase — UI-SPEC.md must be generated for each frontend plan before execution. `/gsd-ui-phase 40` runs before planner.

### Claude's Discretion
- Monaco theme names (pick from Monaco's built-in themes that pair best with DESIGN palette)
- Attempt history "Load more" vs paginated controls
- Skill pill styling (reuse existing skill-bar component from Phase 29?)

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

### Milestone-level
- `.planning/REQUIREMENTS.md` §CODING-UI-01..05
- `.planning/ROADMAP.md` §Phase 40
- `.planning/phases/39-execution-api/39-CONTEXT.md` — API shapes this phase consumes
- `DESIGN.md` — tokens, typography, color, motion — mandatory read before any visual code
- `.planning/PROJECT.md` §Design System — dark mode decisions, DESIGN.md single source of truth

### Existing code to mirror
- `src/components/AppShell.tsx` (or equivalent shell) — extend nav
- `src/components/Navbar.tsx` — role-aware nav pattern
- `src/components/ui/Card.tsx` (if exists) — reuse for challenge list
- `src/components/ui/Badge.tsx` (if exists) — for verdict badges
- Existing markdown renderer (wherever the README renderer lives for question banks)
- Color-mode context / boot script — used for Monaco theme sync

### Libraries
- `@monaco-editor/react` — Monaco editor with React wrapper (dynamic import). Install in this phase.

### Explicitly out-of-scope
- Trainer coding panel — Phase 41
- SQL dialect label — Phase 42
- `/api/coding/run` endpoint — v1.5

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- AppShell + role-aware Navbar (Phase 27/32 unified shell)
- Card, Badge, Button primitives
- Existing markdown renderer for question-banks → reuse for challenge prompts
- Skill bars from Phase 29 Associate Data Visualization — reuse or extend for skill pills

### Established Patterns
- Server components fetch initial data, client components handle interaction
- URL-encoded filter state on list pages (precedent: trainer roster)
- Dynamic imports for heavy client-only components (precedent: if Monaco not present, may need to introduce pattern)

### Integration Points
- `/api/coding/submit` + `/api/coding/attempts/[id]` + `/api/coding/challenges` from Phase 39
- AppShell `navItems` array — role-keyed map

### Known Constraints
- Monaco adds ~2MB to bundle — MUST lazy-load. `next/dynamic` with `ssr: false`
- Tailwind 4 + DESIGN.md token system — no Tailwind arbitrary value escapes unless token already covers it

</code_context>

<specifics>
## Specific Ideas

- CODING-UI-03: "Run/Submit states surfaced explicitly in UI: queued → running → verdict" — D-11 maps 1:1.
- CODING-UI-03: "hidden tests show only pass count, never inputs" — D-12 enforces.
- CODING-UI-05: "role-aware nav" — D-02.
- Codex discovery §6: "Judge0 queue states not surfaced in UI looks broken" — D-11 handles with explicit queued/running states + 60-sec "taking longer" fallback.

</specifics>

<deferred>
## Deferred Ideas

- **Local Run (no submit) preview** — sandbox-in-browser via WASM or pyodide. v1.5+
- **Keyboard shortcuts for editor** — v1.5
- **Collaborative editing** — v2.0
- **Code diff view across attempts** — v1.5
- **Per-language starter code editor** — v1.5 authoring

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 40-ui-mvp*
*Context gathered: 2026-04-18 (auto)*
