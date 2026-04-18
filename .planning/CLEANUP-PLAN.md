# Repo Cleanup Plan — pre-v1.5 execute

**Generated:** 2026-04-18
**Status:** DRAFT — approved for execution in a separate fresh-context session
**Branch target:** `v1.5/cleanup` (this doc lives on `v1.5/cleanup-plan`)
**Predecessor:** v1.5/discover (PR #8)

## Purpose

Clean up legacy / accidentally-committed / orphaned artifacts from v0.1-era development BEFORE v1.5 execute phase. Reduce repo noise, fix `.gitignore` hygiene, delete truly dead code. **Zero changes to active source, live infra, Prisma schema, or production runtime paths.**

## Execution rule

This plan is the **sole input** for the cleanup execution session. The executor should:
1. Open a fresh Claude Code session
2. Check out `v1.5/cleanup-plan` to read this plan
3. Branch `v1.5/cleanup` from main
4. Execute the numbered steps below exactly as written
5. Do NOT widen scope based on the executor's own survey — only act on paths in this document
6. PR against main when done

## Scope — precise file list

### Category A: Unconditional delete (safe, zero-reference, zero-risk)

| # | Path | Size | Evidence | Notes |
|---|------|------|----------|-------|
| A1 | `Untitled.base` | 39 B | Obsidian vault artifact; zero references in codebase, docs, or CI; committed by mistake in `ca8d50f` vault-backup commit | Delete |
| A2 | `public/next.svg` | ~1 KB | Next.js boilerplate; zero imports anywhere | Delete |
| A3 | `public/vercel.svg` | ~1 KB | Next.js boilerplate; zero imports anywhere | Delete |
| A4 | `public/file.svg` | ~1 KB | Next.js boilerplate; zero imports anywhere | Delete |
| A5 | `public/globe.svg` | ~1 KB | Next.js boilerplate; zero imports anywhere | Delete |
| A6 | `public/window.svg` | ~1 KB | Next.js boilerplate; zero imports anywhere | Delete |

**Verification before deletion (run once, expect zero results):**
```bash
grep -r "Untitled\.base" .
grep -rE "(next|vercel|file|globe|window)\.svg" --include="*.ts" --include="*.tsx" --include="*.css" --include="*.md" --include="*.json" src app public
```

### Category B: Verify-then-delete (strong evidence of dead, but warrants one grep pass)

#### B1. Orphaned PIN migration

- **Path:** `prisma/migrations/20260414180750_add_associate_pin/migration.sql` (and its parent directory)
- **Evidence:**
  - Adds `pinGeneratedAt` + `pinHash` columns that are dropped by a LATER migration (`0004_drop_pin_columns` or similar — verify exact name during exec)
  - Current `prisma/schema.prisma` has zero PIN fields
  - CLAUDE.md: *"PIN auth was removed in v1.2 (Phase 25). Supabase Auth is the sole auth mechanism."*
- **Verification (expect zero hits across app code):**
  ```bash
  grep -rE "(pinHash|pinGeneratedAt|associate_pin)" src/
  grep -rE "(pinHash|pinGeneratedAt)" prisma/schema.prisma
  ```
- **Action:** Delete the migration directory (keep the later `drop_pin_columns` migration — it's the canonical record of PIN removal)
- **DO NOT** delete `0004_drop_pin_columns` or any other migration — just the `20260414180750_add_associate_pin` one

#### B2. Judge0 spike harness

- **Paths:**
  - `scripts/judge0-spike.ts`
  - `scripts/judge0-spike-fixtures/` (all JSON fixtures inside)
- **Evidence:**
  - Not referenced in `package.json` scripts (no `npm run judge0-spike`)
  - Documented in `.planning/phases/38-judge0-infrastructure/SPIKE-VERIFICATION.md` as one-time-run harness
  - Zero imports from anywhere else in codebase
- **Verification:**
  ```bash
  grep -r "judge0-spike" package.json .github/ src/ scripts/
  ```
  Expected hits: only in `.planning/phases/38-*` (documentation references — those stay)
- **Action:** Delete `scripts/judge0-spike.ts` + `scripts/judge0-spike-fixtures/` directory
- **Do NOT** touch the spike documentation at `.planning/phases/38-judge0-infrastructure/SPIKE-VERIFICATION.md` — it stays as historical record

### Category C: `.gitignore` additions (no file deletions, prevent future bad commits)

Add to `.gitignore`:

```gitignore

# Editor config (personal, not shared across team)
.obsidian/

# Ephemeral Playwright test output
test-results/.last-run.json
```

**Do NOT** `git rm` the currently-committed `.obsidian/` files or `test-results/.last-run.json` in this pass. Those stay in history. We just stop NEW commits of them. Separate decision later if we want to purge history.

### Category D: DO NOT TOUCH in this cleanup

These look legacy but are load-bearing or actively useful. The executor must NOT modify any of them:

- `prisma/schema.prisma` and **all** migrations except B1 above
- `src/generated/prisma/` (generated Prisma client)
- `Dockerfile`, `docker-compose.yml`, `next.config.ts`, `package.json`, `package-lock.json`
- `CLAUDE.md`, `DESIGN.md`, `PROJECT.md`, `README.md`, `ARCHITECTURE.md` (if present), `CHANGELOG.md`
- `gce-deployment-guide.md` — legacy v0.1 reference but still informative for v1.5 migration context
- `infra/terraform/judge0-vm.tf` — Phase 43 scaffolding; deferred to v1.6 reference
- `.planning/milestones/v1.0-*`, `v1.1-*`, `v1.2-*`, `v1.3-*`, `v1.4-*` — historical archives
- All scripts added in last 30 days (April 2026): `scripts/load-test-coding.ts`, `scripts/abuse-test-coding.ts`, `scripts/validate-challenge.ts`, `scripts/seed-coding-demo.ts`
- Recent migrations (`20260415000000_add_auth_event/`, `20260416000000_add_profile/`, `20260418000000_add_gapscore_prev_score/`)
- Any file modified in the last 30 days, unless explicitly listed in Category A or B
- `v0.1` production deployment (currently on GCE) — out of repo scope anyway

## Execution checklist (for fresh-context session)

```markdown
## Cleanup execution — working checklist

- [ ] Fresh Claude Code session, read `.planning/CLEANUP-PLAN.md` only
- [ ] `git checkout main && git pull`
- [ ] `git checkout -b v1.5/cleanup`
- [ ] Run all Category A verification greps — confirm zero hits
- [ ] Delete Category A files (A1-A6)
- [ ] Run Category B1 verification grep — confirm zero hits
- [ ] Delete B1 (`prisma/migrations/20260414180750_add_associate_pin/`)
- [ ] Run `npx prisma validate` — schema still valid?
- [ ] Run `npx prisma migrate status` (against a safe local DB) OR inspect migrations folder — confirm no broken ordering
- [ ] Run Category B2 verification grep — confirm zero hits outside `.planning/phases/38-*`
- [ ] Delete B2 (`scripts/judge0-spike.ts` + `scripts/judge0-spike-fixtures/`)
- [ ] Edit `.gitignore` — add Category C entries
- [ ] Run `npm run typecheck` — passes?
- [ ] Run `npm run lint` — passes?
- [ ] Run `npm run test` — passes? (should be unchanged from pre-cleanup baseline)
- [ ] Run `npm run build` — passes? (critical — ensures no import from deleted files)
- [ ] Commit each category as its own commit:
  - `chore(cleanup): remove unused Next.js boilerplate + Obsidian artifact`
  - `chore(cleanup): drop orphaned PIN migration (shadowed by drop_pin_columns)`
  - `chore(cleanup): remove Phase 38 Judge0 spike harness (one-time validation complete)`
  - `chore(gitignore): stop committing .obsidian + ephemeral test-results`
- [ ] Push `v1.5/cleanup` to origin
- [ ] Open PR against main, link to this plan document
- [ ] Confirm PR CI passes (once branch protection is in place)
- [ ] Self-review diff — every deleted file maps to an A/B entry in this plan
```

## Rollback

If anything breaks after merge:
- Every deletion lives in a discrete commit — `git revert <sha>` for the specific category
- `.gitignore` additions are non-destructive; revert is cosmetic
- Prisma migration delete is the only one that could cause DB drift — but since the migration was never applied in any live env (`20260414180750_add_associate_pin` is shadowed by later drop), revert is safe

## Scope boundaries (hard)

- **No refactors.** Deleting files only. No renames, no moves.
- **No package.json changes** beyond the executed deletions' dependency implications (which should be none — nothing in package.json references judge0-spike or Next.js boilerplate SVGs).
- **No Prisma schema edits.**
- **No infra changes.**
- **No documentation updates** except the `.gitignore` edit listed.
- **No follow-on "while I'm here" cleanups.** If new candidates surface during execution, capture them as issues/notes for a future cleanup pass — do not delete in this PR.

## After cleanup merges

- v1.5/discover (PR #8) and v1.5/cleanup merge in sequence (either order works — they don't overlap)
- Then: clear context, run `/pipeline-coordinator --from init` to start v1.5 init on `v1.5/init` branch
