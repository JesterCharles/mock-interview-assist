# Pipeline — Maintenance Snapshot (post-v1.4 ship)

**Date:** 2026-04-18
**Context:** Post-v1.4 cleanup. PR #7 open, merge deferred per no-auto-merge policy.
**Mode:** Autonomous / unattended. No code modified. No commits.

---

## Health Score: **7.5 / 10**

| Component | Score | Evidence |
|-----------|-------|----------|
| Test coverage | 9 / 10 | 963 passed + 4 skipped / 967 total (89 files, 1 skipped). Duration 3.80s. Zero failures. |
| Typecheck | 6 / 10 | 4 errors in `src/lib/coding-challenge-service.test.ts` (lines 240-241: tuple-index-on-empty-tuple + `as string`/`as RequestInit` narrowing). Production code clean. |
| Lint trend | 7 / 10 | Raw total 3459 (668 err / 2791 warn) but ~94% from `src/generated/prisma/**` (auto-gen) and `.obsidian/plugins/**` (non-project). **Project-only:** 149 errors + 32 warnings. Concentrated in test files (`no-explicit-any`). |

**Raw lint noise vs signal:** The 3459 figure is misleading — ESLint is scanning generated Prisma client (+2743) and an unrelated Obsidian plugin (+2272). True codebase health is 181 issues across ~20 files, dominated by test-file `any` usage.

### Top project-only lint hot spots

| File | Warnings | Errors |
|------|----------|--------|
| `src/app/page.tsx` | 3 | 18 |
| `src/lib/coding-challenge-service.test.ts` | 0 | 38 |
| `src/app/api/coding/submit/route.test.ts` | 0 | 22 |
| `src/app/api/coding/challenges/route.test.ts` | 0 | 22 |
| `src/app/api/coding/attempts/[id]/route.test.ts` | 0 | 13 |
| `src/lib/markdownParser.ts` | 3 | 0 |
| `src/app/trainer/onboarding/BulkPreviewTable.tsx` | 3 | 0 |
| `src/app/interview/page.tsx` | 2 | 0 |
| `src/lib/inviteHelper.ts` | 0 | 1 (prefer-const) |

### Red flags

- **Typecheck is red** on a test file. `npx tsc --noEmit` exits non-zero. Production code compiles clean, but CI that runs `tsc` will fail.
- `eslint-config-next` pinned to 16.1.1 while installed `next` is 16.2.3 and latest is 16.2.4 — config is one minor behind framework.

---

## Cleanup Actions Recommended (not executed)

1. **Fix `coding-challenge-service.test.ts:240-241` typecheck errors.** Two `as string` / `as RequestInit` casts on `fetchMock.mock.calls[0]` where the tuple is typed `[]`. One-line fix (narrow via `??` or non-null assertion + destructure). Unblocks `tsc --noEmit` gate.
2. **Archive stale top-level `.planning/` artifacts from v1.3 cycle.** 3 files are orphaned from prior milestones and should move to `.planning/milestones/v1.3-*/`:
   - `.planning/AUTONOMOUS-REPORT.md` (Apr 18 — v1.3 close)
   - `.planning/AUTONOMOUS-REPORT-GAP.md` (Apr 17 — v1.3 gap-closure)
   - `.planning/CHECKPOINT-v1.3-reflect.md` (Apr 17)
   Keeping them at `.planning/` root pollutes the working tree view and git status. Move during next `/gsd-cleanup` pass.
3. **Tidy `no-explicit-any` in coding-bank test suite.** 95 errors cluster in 4 files — most are mock fixtures. A single-session pass with `unknown` + type guards would drop project lint error count from 149 → ~40.
4. **Bump `eslint-config-next` 16.1.1 → 16.2.4** to match `next` framework version. Zero-risk patch.
5. **Review `.planning/intel/` staleness.** All 9 files dated 2026-04-15 (3 days old, below 30-day threshold). **No action yet** — but flag for refresh after v1.5 kickoff since MSA-from-day-1 changed architecture materially (new coding-challenge models, Judge0 stack).

---

## Tool Version Status

| Package | Pinned | Installed | Latest | Status |
|---------|--------|-----------|--------|--------|
| `next` | ^16.2.3 | 16.2.3 | 16.2.4 | patch behind — safe bump |
| `prisma` / `@prisma/client` | ^7.7.0 | 7.7.0 | 7.7.0 | **current** |
| `tsx` | ^4.21.0 | 4.21.0 | 4.21.0 | **current** |
| `p-limit` | ^7.3.0 | 7.3.0 | 7.3.0 | **current** (newly added Phase 44) |
| `react` / `react-dom` | 19.2.3 | 19.2.3 | 19.2.5 | 2 patches behind |
| `typescript` | ^5 | 5.9.3 | 6.0.3 | TS 6 out — major, hold |
| `eslint` | 9.x | 9.39.2 | 10.2.1 | ESLint 10 out — major, hold |
| `eslint-config-next` | 16.1.1 | 16.1.1 | 16.2.4 | **lagging framework** — bump |
| `@langchain/openai` | ^1.2.0 | 1.2.0 | 1.4.4 | 2 minors behind |
| `tailwindcss` / `@tailwindcss/postcss` | ^4.1.18 | 4.1.18 | 4.2.2 | 1 minor behind |
| `zustand` | ^5.0.9 | 5.0.9 | 5.0.12 | 3 patches behind |
| `lucide-react` | ^0.562.0 | 0.562.0 | 1.8.0 | major v1 released — eval for v1.5 |

All v1.4-critical pins (Prisma, p-limit, tsx) are current. No security-driven upgrades pending.

---

## Planning Directory Health

- **Milestones archived:** v1.0, v1.1, v1.2, v1.3 (under `.planning/milestones/`).
- **Active phases:** 20 directories in `.planning/phases/` covering 26-44. Smallest dir (`35-shell-scope-reconciliation/`) has 4 files (PLAN + SUMMARY + CONTEXT + DISCUSSION-LOG) — all legitimate, none empty/malformed.
- **Most recent phase:** `42-sql-mvp-sqlite/` — 10 files including REVIEW/REVIEW-FIX/VALIDATION-GAPS (healthy).
- **Seeds:** 3 files (`v1.3-gap-closure`, `v1.3-reflect`, `v1.4-discovery`) — all within 30 days.
- **Reports:** 3 milestone summaries (v1.0, v1.1, v1.2). v1.3/v1.4 summaries **not yet generated** — queue for `/gsd-complete-milestone` when v1.4 fully closes (post-deployment).
- **STATE.md:** Current at `v1.4 / Phase 44 PARTIAL`, last updated 2026-04-18T12:29. Progress 96% (8/9 phases, 27/28 plans). Accurate.

No empty or malformed phase dirs. No orphaned phase subdirectories.

---

## Next Maintenance Window

**Trigger conditions (any one):**
- v1.4 Phase 44 HARD-01/02/03 closed (Judge0 deploy verified) → run `/gsd-complete-milestone v1.4`, generate `MILESTONE_SUMMARY-v1.3.md` + `v1.4.md`, then archive `v1.3-*` + `v1.4-*` under milestones/.
- PR #7 merged → re-run `npm run lint` + `tsc --noEmit`, confirm green gate, re-score.
- v1.5 planning kickoff → refresh `.planning/intel/*` (now 3 days stale against v1.4-era architecture; refresh before v1.5 to avoid plan drift).
- 30-day cadence tick (earliest: 2026-05-18) → full `/pipeline-maintain` rerun regardless.

**Suggested order when window opens:**
1. Fix coding-challenge-service.test.ts typecheck (5 min, unblocks CI).
2. Bump `eslint-config-next` patch (5 min).
3. Move 3 orphaned `.planning/` root reports to archive (1 min).
4. Refresh `.planning/intel/` (15 min via `/gsd-intel --refresh`).
5. Drop `no-explicit-any` in coding test suite (30-45 min, drops project lint -65%).
