---
phase: 53-reflect-maintain-runbook-finalization-decommission-plan
plan: 03
subsystem: docs
tags: [docs, claudemd, readme, cloudrun]
dependency_graph:
  requires: [53-01]
  provides: [updated CLAUDE.md deploy story, updated README.md overview]
  affects: [all future Claude sessions read the updated deploy context]
tech_stack:
  added: []
  patterns: [single-source-of-truth deploy story (DEPLOY.md linked from both docs)]
key_files:
  created: []
  modified:
    - CLAUDE.md
    - README.md
decisions:
  - "CLAUDE.md loses the `docker compose up` deploy line entirely (T-53-03)"
  - "README.md keeps `docker compose up` only under `## Docker (Local Dev Only)` — distinct semantic context"
  - "CLAUDE.md Tech Stack adds @faker-js/faker, k6, google-github-actions"
metrics:
  tasks_completed: 2
  commits: 1
  files_created: 0
  files_modified: 2
  duration: "~4min"
  completed_date: "2026-04-18"
---

# Phase 53 Plan 03: CLAUDE.md + README.md Cloud Run Update

Stale "GCE + docker compose" deploy story removed from CLAUDE.md; Cloud Run pointer added to README.md overview. Docker section in README.md renamed to explicit "Local Dev Only".

## Files Modified

| File | Edits |
|------|-------|
| `CLAUDE.md` | 3 edits: delete `Docker: docker compose up...` line; add `## Deploy` section (D-08 verbatim); extend Tech Stack with @faker-js/faker + k6 + google-github-actions |
| `README.md` | 2 edits: append `Deployed to Cloud Run on GCP. See [DEPLOY.md](.planning/DEPLOY.md).` to overview; rename `## Docker` → `## Docker (Local Dev Only)` with Cloud Run pointer |

## CLAUDE.md — 3 Edits

### Edit 1: DELETE `docker compose up` line
Removed: `Docker: \`docker compose up\` (uses \`.env.docker\`, maps port 80 → 3000).`
Result: `grep -c "docker compose up" CLAUDE.md` = 0.

### Edit 2: ADD `## Deploy` section
Inserted after `## Commands`, before `## Architecture`:
```
## Deploy

Deployed to Cloud Run on GCP. See `.planning/DEPLOY.md`. Env vars live in Google Secret Manager per project. CI: `.github/workflows/pr-checks.yml` + `deploy-staging.yml` + `deploy-prod.yml` + `rollback-prod.yml`. Auth via WIF — no SA keys in repo.
```

### Edit 3: Extend `## Tech Stack`
Added 3 entries at end:
- Seed data: @faker-js/faker (devDep, staging seeder per Phase 46)
- Load testing: k6 (loadtest/baseline.js per Phase 49)
- CI auth: google-github-actions/auth + setup-gcloud via WIF (no SA keys in repo)

## README.md — 2 Edits

### Edit 1: Overview deploy pointer (D-11)
Added after opening paragraph:
> Deployed to Cloud Run on GCP. See [DEPLOY.md](.planning/DEPLOY.md).

### Edit 2: Docker section rename + context (D-12)
- Renamed `## Docker` → `## Docker (Local Dev Only)`
- Added contextualizing paragraph pointing at DEPLOY.md for prod
- `docker compose up` command preserved (still valid for local Judge0 dev)

## T-53-03 Mitigation

Verify-block assert: `grep -c "docker compose up" CLAUDE.md` must be 0.
Result: **0** (passed).

README.md intentionally retains `docker compose up` under "Docker (Local Dev Only)" and "Coding Challenges — Local Dev" — different semantic context (local dev, not prod deploy story). Plan D-10 scope was CLAUDE.md only.

## Sanity Check

`npx tsc --noEmit` → clean (no source code modified).

## Verification

All automated verify-block greps passed for both tasks:
- CLAUDE.md: 0× "docker compose up", `## Deploy` present, Cloud Run / WIF / deploy-staging / rollback-prod / @faker-js/faker / k6 / google-github-actions all present
- README.md: "Deployed to Cloud Run on GCP" present, `[DEPLOY.md](.planning/DEPLOY.md)` link present, `## Docker (Local Dev Only)` header present, "Production runs on Cloud Run" pointer present

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
