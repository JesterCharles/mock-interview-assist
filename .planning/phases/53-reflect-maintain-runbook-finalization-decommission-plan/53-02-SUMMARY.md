---
phase: 53-reflect-maintain-runbook-finalization-decommission-plan
plan: 02
subsystem: deploy-runbook
tags: [deploy, sunset, runbook, decommission]
dependency_graph:
  requires: [53-01]
  provides: [DEPLOY.md §7/§8/§9, decommission-checklist-v01.md, decommission-v01.sh stub]
  affects: [day-45 operator task, Phase 53 gate]
tech_stack:
  added: []
  patterns: [commented-out destructive commands with exit-1 guard, dual-file checklist (runbook + standalone)]
key_files:
  created:
    - .planning/decommission-checklist-v01.md
    - scripts/decommission-v01.sh
  modified:
    - .planning/DEPLOY.md
decisions:
  - "Script stub writes with no exec bit (T-53-02 layer 4 defense)"
  - "Script has `exit 1` banner-trap as first line after declaration (T-53-02 layer 3)"
  - "Target teardown date 2026-06-02 pinned (cutover 2026-04-18 + 45 days)"
  - "iac/gce-judge0/ retained as v1.6 reference template (Phase 50 D-13 final)"
metrics:
  tasks_completed: 2
  commits: 1
  files_created: 2
  files_modified: 1
  duration: "~8min"
  completed_date: "2026-04-18"
---

# Phase 53 Plan 02: DEPLOY.md + Decommission Plan Summary

Finalizes the v1.5 deploy runbook with §7 Secret Rotation + §8 Supabase Migration Promotion + §9 v0.1 Day-45 Teardown. Ships the day-45 checklist as a standalone file and a commented-out script stub.

## Files Created / Modified

| File | Status | Purpose |
|------|--------|---------|
| `.planning/DEPLOY.md` | modified | Appended §7, §8, §9 after existing Sunset Window + Post-Cutover Reminders |
| `.planning/decommission-checklist-v01.md` | created | Standalone 9-step day-45 checklist with sign-off fields |
| `scripts/decommission-v01.sh` | created | Commented-out teardown script stub (T-53-02 mitigations layered) |

## 9-Step Teardown Structure (per D-06)

1. Confirm 30-day warm window elapsed without rollback
2. Delete legacy app VM (`nlm-app-vm`)
3. Delete legacy Judge0 VM (`judge0-vm`)
4. Delete legacy forwarding rule
5. Release legacy static IP
6. Remove `legacy.nextlevelmock.com` DNS record (Cloudflare)
7. Remove legacy uptime check from Cloud Monitoring
8. Retain `iac/gce-judge0/` as v1.6 reference (per Phase 50 D-13 — do NOT delete)
9. Update `.planning/STATE.md` + `.planning/PROJECT.md` to remove v0.1 references

Target date: **2026-06-02** (cutover + 45 days).

## T-53-02 Mitigation Layers (accidental destructive run)

1. All `gcloud` commands commented out in script.
2. Top-of-file `DO NOT RUN WITHOUT RUNBOOK` banner.
3. Explicit `exit 1` after banner: wholesale-run aborts before touching anything.
4. File written without exec bit (`0644`).
5. Verify block grep: `!grep -E '^gcloud ' scripts/decommission-v01.sh` — 0 uncommented gcloud lines.

## Verification

All automated verify-block greps passed:
- `^## 7. Secret Rotation`, `^## 8. Supabase Migration Promotion`, `^## 9. v0.1 Sunset + Day-45 Teardown`
- `gcloud secrets versions add`, `prisma migrate deploy`, `Additive-only policy` all present
- `2026-06-02` in DEPLOY.md + checklist
- 9 numbered step checkboxes in checklist
- Script: `#!/bin/bash` shebang, `bash -n` syntax clean, banner present, 0 uncommented gcloud

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
