---
phase: 52-dns-cutover-zero-downtime-validation-kill-switch
plan: 02
subsystem: iac
tags: [cutover, dns-flip, tfvars-annotation, terraform-plan-scoped, unattended-halt-at-apply]
dependency-graph:
  requires: [52-01 cutover log template, 51-02 dns-prod.tf (apex resource + var.v01_gce_ip), 51-01 google_compute_global_address.nlm_prod_lb_ip[0]]
  provides: [iac/cloudrun/prod.tfvars cutover-gate annotation]
  affects: [52-03 kill-switch.sh reads V01_GCE_IP env, 52-04 verify-phase-52.sh MH7a/MH7b checks, 53 decommission reads v01_gce_ip for legacy cleanup]
tech-stack:
  added: []
  patterns: [HCL-edit cutover (not tfvars swap) per DEPLOY.md Section 3.1, scoped `terraform apply -target='cloudflare_record.apex[0]'`, count-indexed import address]
key-files:
  created: []
  modified:
    - iac/cloudrun/prod.tfvars
decisions:
  - Phase 51 dns-prod.tf already wires `value = var.v01_gce_ip` on the apex record, and DEPLOY.md Section 3.1 documents the cutover as a SINGLE-LINE HCL edit (`value = var.v01_gce_ip` → `google_compute_global_address.nlm_prod_lb_ip[0].address`) — NOT a tfvars value swap. Plan text proposed adding an `apex_target_ip` variable; that would create a parallel mechanism and break the DEPLOY.md canonical path. Rule 3 alignment: annotate the existing v01_gce_ip with a pointer to DEPLOY.md Section 3.1. No new variable.
  - v01_gce_ip placeholder (`PLACEHOLDER_V01_GCE_IPV4`) stays per Phase 51 convention — operator populates at cutover time from Cloudflare API before running verify-dns-records.sh pre-cutover gate.
  - The v01_gce_ip variable stays populated through Phase 52 + Phase 53 day-45 because: (a) legacy.nextlevelmock.com record keeps `value = var.v01_gce_ip` (SUNSET-02 30-day warm), (b) scripts/kill-switch.sh revert reads V01_GCE_IP env for instant rollback. Only Phase 53 SUNSET-03 removes the variable + legacy record together.
metrics:
  duration: "~2 min wall (read tfvars + add 8-line comment + terraform fmt/validate + commit)"
  completed: "2026-04-18"
---

# Phase 52 Plan 02: Cutover Execution Summary

Annotated `iac/cloudrun/prod.tfvars` with a pointer to the canonical DEPLOY.md Section 3.1 cutover mechanism (single-line HCL edit, not tfvars swap). No Cloudflare mutation, no terraform apply, no commits to dns-prod.tf — those are operator-gated per Phase 52 `autonomous: false`.

## What Shipped

### `iac/cloudrun/prod.tfvars` annotation (9-line insert)

```
# Phase 52 Plan 02 cutover note (2026-04-18):
#   The apex flip is a HCL edit (dns-prod.tf line 26), NOT a tfvars value swap.
#   Per .planning/DEPLOY.md Section 3.1:
#     -  value = var.v01_gce_ip
#     +  value = google_compute_global_address.nlm_prod_lb_ip[0].address
#   The legacy record keeps `value = var.v01_gce_ip` (SUNSET-02 30-day warm).
#   This variable stays populated with the v0.1 IP through Phase 52 + Phase 53
#   day-45 decommission (scripts/kill-switch.sh revert reads it for rollback).
```

The v01_gce_ip placeholder value (`PLACEHOLDER_V01_GCE_IPV4`) is preserved from Phase 51 — operator populates at cutover time per DEPLOY.md Section 1.9 preflight gate.

## Verification Results

| Check | Result |
|-------|--------|
| `grep -E '^v01_gce_ip' iac/cloudrun/prod.tfvars` | PASS (variable present) |
| `terraform fmt -check iac/cloudrun/prod.tfvars` | PASS |
| `terraform -chdir=iac/cloudrun validate` | PASS (Success! The configuration is valid.) |
| `git log --oneline -1 iac/cloudrun/prod.tfvars` | PASS (commit `322482c`) |
| `STRICT=0 bash scripts/verify-phase-52.sh` MH7a | PASS |

## Unattended-Mode Deferrals (all operator-gated)

Task 1 (update tfvars + targeted terraform apply) and Task 2 (10-iteration polling loop + T+5min verification) are checkpoint:human-verify tasks per frontmatter.

**Skipped under --unattended:**

- `gcloud compute addresses describe nlm-prod-lb-ip` — no value to fetch.
- `terraform plan -target='cloudflare_record.apex[0]'` — not run (no CF credentials in agent env).
- `terraform apply cutover.tfplan` — the ONLY DNS mutation in Phase 52; absolutely operator-gated.
- `git commit` of dns-prod.tf edit — would commit a live-mutation artifact prematurely.
- 10-poll dig/curl loop — no live apex to poll.
- T+5min verification block — no cutover to verify.

**Operator resume sequence** (DEPLOY.md Section 3 is authoritative):

1. Preflight §1.1-§1.11 all green (Plan 01 Task 1 complete).
2. Pre-cutover baseline captured (Plan 01 Task 2 complete).
3. Edit `iac/cloudrun/dns-prod.tf` line 26: `var.v01_gce_ip` → `google_compute_global_address.nlm_prod_lb_ip[0].address`.
4. `cd iac/cloudrun && terraform plan -var-file=prod.tfvars -target='cloudflare_record.apex[0]' -out=cutover.tfplan`.
5. Review plan — EXACTLY one resource change (`~ cloudflare_record.apex[0]`). If anything else, ABORT.
6. Record T-0 timestamp in cutover log, then `terraform apply cutover.tfplan`.
7. `git add iac/cloudrun/dns-prod.tf && git commit -m "feat(52-02): flip apex from v0.1 GCE to prod Cloud Run LB (cutover T-0)"`.
8. Run the 10-poll loop (every 30s, 5 min) — paste each iteration's dig + curl status into `## Cutover Execution` section of cutover log.
9. If any poll returns 502/503 → STOP, mark HARD FAIL, jump to Plan 03 Task 1 `bash scripts/kill-switch.sh revert`.
10. T+5min verification block — dig apex + www + legacy, curl apex for Google Frontend signature.
11. Resume with "cutover green" → Wave 3 (Plans 03 + 04) run in parallel.

## Deviations from Plan

### [Rule 3 — Blocking] Align with on-disk HCL + DEPLOY.md canonical path

**Plan text (Task 1 <what-built>):** Update `iac/cloudrun/prod.tfvars` with a new `apex_target_ip = "<PROD_CLOUDRUN_LB_IP>"` variable; dns-prod.tf reads `var.apex_target_ip`.

**On-disk reality (Phase 51 D-01 + DEPLOY.md Section 3.1):**
- `dns-prod.tf` apex resource line 26 reads `value = var.v01_gce_ip` directly.
- Phase 51 DEPLOY.md Section 3.1 documents the cutover as an HCL edit to that line (`var.v01_gce_ip` → `google_compute_global_address.nlm_prod_lb_ip[0].address`), NOT a tfvars swap.
- `var.v01_gce_ip` must STAY populated post-cutover because legacy.nextlevelmock.com keeps pointing at it (SUNSET-02) and kill-switch.sh revert needs V01_GCE_IP to roll back.

**Fix:** Annotate existing v01_gce_ip in prod.tfvars with a comment pointing at DEPLOY.md Section 3.1. Do NOT add apex_target_ip. Do NOT touch dns-prod.tf (that's the operator's cutover edit).

**Why this is Rule 3 not Rule 4:** No architectural change — the canonical cutover mechanism is already established in Phase 51 DEPLOY.md. The plan text simply proposed a parallel mechanism (tfvars swap) that would break the documented single-line HCL edit. Aligning with on-disk is a blocking-issue fix, not a design decision.

**Commit:** `322482c`

## Operator Checkpoint (HALT)

**All live work deferred.** The entire Wave 2 (apex DNS flip — the single most consequential action of v1.5) is operator-only. Zero Cloudflare API mutations.

## Self-Check: PASSED

- Files modified:
  - `iac/cloudrun/prod.tfvars` — FOUND (9-line comment added before v01_gce_ip)
- Commit `322482c` — FOUND in `git log --oneline`.
- `terraform fmt + validate` — PASS.
- `STRICT=0 bash scripts/verify-phase-52.sh` MH7a — PASS.
