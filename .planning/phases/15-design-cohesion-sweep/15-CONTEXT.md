# Phase 15: Design Cohesion Sweep - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** Direct write (scope bounded — migrate + delete sweep, no new features)

<domain>
## Phase Boundary

Migrate ALL remaining legacy routes + shared components onto DESIGN.md tokens introduced in Phase 14, then delete the legacy `--nlm-*` tokens and CSS utility classes from `globals.css`. End state: single unified design system, zero parallel token stacks, zero retrofit debt before v1.2 feature work begins.

**In scope (migrate to DESIGN.md tokens):**
- Pages: `/` (anonymous automated-interview root), `/interview`, `/review`, `/dashboard`, `/login`, `/pdf`, `/history`, `/question-banks`
- Shared components: `Navbar`, `QuestionCard`, `SpeechToText`, `ProgressBar`
- Any other file under `src/app/` or `src/components/` that imports legacy classes

**Legacy to DELETE after migration:**
- Tokens: all `--nlm-*` custom properties in `:root` block of `src/app/globals.css`
- Utility classes: `.nlm-bg`, `.glass-card`, `.glass-card-strong`, `.gradient-text`, `.gradient-text-static`, `.glow-border`, `.glow-border-cyan`, `.progress-gradient`, `.recording-ring`, `.btn-primary`, `.btn-accent` (legacy versions — NEW `.btn-accent-flat`, `.btn-secondary-flat` survive)
- Motion keyframes: `gradient-shift`, `float`, `pulse-glow`, `shimmer`, `recording-pulse`, `progress-glow`, `border-glow-pulse`
- Legacy `--background` / `--foreground` if only referenced by deleted utilities

**Out of scope:**
- Net-new features (routes, APIs, DB schema) — migration only
- Rewriting component logic beyond class/style swaps
- New design tokens beyond what DESIGN.md already defines
- Deleting PublicShell comment reference to `--nlm-bg-primary` (comment updates fine, behavior preserved)

</domain>

<decisions>
## Implementation Decisions

### Token + utility migration
- **D-01:** Every file currently importing a legacy class must be updated to use DESIGN.md equivalents. Mapping table:
  | Legacy | DESIGN.md replacement |
  |--------|-----------------------|
  | `.nlm-bg` / `--nlm-bg-primary` | `bg-[var(--bg)]` (warm parchment) applied to `body` via globals |
  | `.glass-card` / `.glass-card-strong` | Surface card: `bg-[var(--surface)]` + `border border-[var(--border)]` + subtle shadow `0 1px 2px rgba(0,0,0,0.04)` |
  | `.gradient-text` / `.gradient-text-static` | Clash Display heading in `var(--ink)` — NO gradients. Accent color `var(--accent)` only for emphasis. |
  | `.glow-border` / `.glow-border-cyan` | Plain `border border-[var(--border)]` or subtle focus ring `ring-1 ring-[var(--accent)]/30` |
  | `.progress-gradient` | Flat `bg-[var(--accent)]` progress fill |
  | `.recording-ring` | Static flat ring (no animation) or brief scale pulse (one-time) |
  | `.btn-primary` / `.btn-accent` | `.btn-accent-flat` (primary) or `.btn-secondary-flat` (secondary) |
  | `--nlm-primary`, `--nlm-accent`, `--nlm-teal`, `--nlm-purple` | `var(--accent)` (burnt orange is the sole accent per DESIGN.md) |
  | `--nlm-success/warning/danger` | `var(--success)` / `var(--warning)` / `var(--danger)` |

- **D-02:** Motion keyframes deleted entirely. DESIGN.md allows ONLY: fade-in (150ms), slide-up (200ms), one-time scale pulse on record. No gradient-shift, float, pulse-glow, shimmer, border-glow-pulse, progress-glow. If a page needs a recording indicator, use a static dot + `text-[var(--accent)]` "Recording" label.

- **D-03:** `body` background switches from legacy dark `#0f1525` to DESIGN `#F5F0E8` globally via `globals.css`. All pages inherit warm parchment.

- **D-04:** Typography: Clash Display for page headings, DM Sans for body, JetBrains Mono for tabular-nums / PIN / code. Fonts already loaded in `layout.tsx` from Phase 14 — no additions.

### Scope per page
- **D-05:** `/` (anonymous root automated-interview, `src/app/page.tsx`) — wrap in `PublicShell`, replace hero glow card with surface card, replace gradient heading with Clash Display flat. Highest regression risk — keep interview state machine untouched, only restyle.
- **D-06:** `/interview` — wrap trainer-led session in token-driven shell. Keep all existing logic (STT, scoring, timer). Only swap classes. Mid-session regression risk: run full interview path in manual QA before commit.
- **D-07:** `/review` — swap classes only. Score table / validator UI logic unchanged.
- **D-08:** `/dashboard` — setup wizard is multi-phase. Token swap only, preserve wizard flow. Already partially on tokens per 14-CONTEXT D-14 — this phase completes it.
- **D-09:** `/login` (trainer) — already migrated in Phase 14 (14-01). Verify only; no changes expected.
- **D-10:** `/pdf`, `/history`, `/question-banks` — lower-traffic routes; standard token swap.
- **D-11:** Shared components (`Navbar`, `QuestionCard`, `SpeechToText`, `ProgressBar`) — MUST migrate before consumer pages commit, or adopt backwards-compatible prop swap. Recommended order: components first, then pages.

### Deletion gate
- **D-12:** Before deleting `--nlm-*` tokens + legacy utilities, run grep sweep:
  ```
  grep -rE "nlm-bg|glass-card|gradient-text|glow-border|progress-gradient|recording-ring|--nlm-|animation:.*(gradient-shift|float|pulse-glow|shimmer|recording-pulse|progress-glow|border-glow-pulse)" src/
  ```
  Must return ZERO matches outside `globals.css` itself before deletion commit. `globals.css` hits will be removed in the same commit.

- **D-13:** Deletion commit is the FINAL commit of the phase. No partial deletion.

### PublicShell expansion
- **D-14:** Extend `PublicShell` (introduced Phase 14) to be used as the default wrapper for all public/interview pages. Trainer-gated pages use existing trainer layout. Wizard/setup pages may need a `DashboardShell` variant — decide during plan (Claude's discretion).

### Visual regression safety
- **D-15:** Playwright visual spec coverage per page at `tests/visual/phase-15/*.spec.ts`. Take full-page screenshot pre-migration (baseline from git checkout of pre-phase-15 commit), post-migration (current), diff advisory only. If a page differs by > 95% (semantic break) flag for manual review.
- **D-16:** Unit/integration tests must stay green — typecheck, eslint, vitest full suite. No regressions.

### Hard constraints
- **D-17:** NO new design tokens added. DESIGN.md is frozen contract.
- **D-18:** NO feature changes. Behavior identical pre/post.
- **D-19:** NO partial migration left behind at phase close. If a file is touched, it is fully migrated.
- **D-20:** /interview and /review session flows must be manually exercised end-to-end (trainer-led full interview → score → PDF) before phase marked complete. High regression risk.

### Claude's Discretion
- Exact shell/wrapper component boundaries (one `PublicShell` vs. introduce `DashboardShell`)
- Which components to memoize / defer vs. inline restyle
- Recording indicator visual (flat dot vs. labeled flat pill)
- Skeleton/loading state styling within DESIGN tokens
- Commit granularity (one PR per page vs. one per logical group)

</decisions>

<specifics>
## Specific Ideas

- Grouping for execution efficiency (Claude's discretion to form plans):
  - Plan A: shared components (Navbar, QuestionCard, SpeechToText, ProgressBar) — unblocks everything
  - Plan B: legacy pages (/, /interview, /review) — highest regression risk, manual QA required
  - Plan C: remaining pages (/dashboard, /pdf, /history, /question-banks) — lower risk
  - Plan D: legacy deletion + grep gate + visual tests — closer
- Readiness signal typography already exists (`ReadinessSignal.tsx` from Phase 14) — reuse
- DESIGN.md Anti-Patterns section — enforce as lint-like grep gate
- Consider `@layer` ordering if Tailwind arbitrary values collide with DESIGN tokens during migration

</specifics>

<canonical_refs>
## Canonical References

### Design contract
- `DESIGN.md` — full system (frozen)
- `DESIGN.md` §Color, §Typography, §Anti-Patterns, §Readiness Signal Pattern

### Phase 14 artifacts (foundation)
- `.planning/phases/14-design-cohesion/14-CONTEXT.md` — D-01/D-02/D-02a (tokens + new button utilities)
- `.planning/phases/14-design-cohesion/14-01-SUMMARY.md`
- `.planning/phases/14-design-cohesion/14-02-SUMMARY.md`
- `.planning/phases/14-design-cohesion/14-VERIFICATION.md`
- `src/components/layout/PublicShell.tsx`
- `src/components/readiness/ReadinessSignal.tsx`

### Requirements
- `.planning/REQUIREMENTS.md` — DESIGN-03 (NEW — add during planning: "All routes render on DESIGN.md tokens; legacy utilities deleted")
- `.planning/ROADMAP.md` §Phase 15

### Files to inspect (migration targets)
- `src/app/globals.css` — token + utility source
- `src/app/page.tsx` (root)
- `src/app/interview/page.tsx`
- `src/app/review/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/login/page.tsx` (verify only — Phase 14 output)
- `src/app/pdf/page.tsx`
- `src/app/history/page.tsx`
- `src/app/question-banks/page.tsx`
- `src/components/Navbar.tsx`
- `src/components/QuestionCard.tsx`
- `src/components/SpeechToText.tsx`
- `src/components/ProgressBar.tsx`

### Codex override
- `.planning/PIPELINE-PLAN-CODEX.md` §Finding 8 — DEFERRED DELETION IS OVERRIDDEN. User decision: unify now.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- DESIGN.md tokens + `.btn-accent-flat` / `.btn-secondary-flat` already in `globals.css` from Phase 14
- Clash Display + DM Sans + JetBrains Mono already loaded in `src/app/layout.tsx`
- PublicShell, ReadinessSignal, Cohort/Curriculum components available as reference

### Established Patterns
- CSS custom properties on `:root` + `@theme inline` mapping to Tailwind
- Inline style objects using `var(--token)` (per Phase 14 convention — no arbitrary hex)
- `border border-[var(--border)]` for dividers
- `bg-[var(--surface)]` for cards, `bg-[var(--bg)]` for pages

### Integration Points
- `globals.css` single source of truth — token additions/deletions cascade
- `layout.tsx` font loading (additive only)
- `PublicShell` wrapper expansion is opt-in per page

</code_context>

<deferred>
## Deferred Ideas

- Dark mode toggle wiring (tokens exist, no UI switch in scope)
- Responsive mobile redesign beyond baseline stack
- Component library extraction (Storybook etc.)
- Animation system redesign (stay on DESIGN.md motion rules)
- Icon system unification
- Design token linter as CI gate (grep sweep in phase only)

</deferred>

---

*Phase: 15-design-cohesion-sweep*
*Context gathered: 2026-04-14*
*Source: direct write (Codex #8 override — unify now)*
