---
phase: 50-judge0-integration-points-flag-audit
plan: 04
subsystem: iac-phase-gate
tags: [iac, terraform, phase-gate, git-mv, v1.6-deferred]
requires:
  - 50-01
  - 50-02
  - 50-03
provides:
  - iac/gce-judge0/ (relabeled reference template)
  - iac/cloudrun/judge0.tf.disabled
  - scripts/verify-phase-50.sh
affects:
  - ARCHITECTURE.md
  - docs/runbooks/coding-stack.md
  - .gitignore
tech-stack:
  added: []
  patterns:
    - "git mv for history-preserving directory relabel"
    - "Terraform .disabled suffix excludes files from *.tf glob processing"
    - "Phase-gate script with PASS/FAIL/SKIP states (external dependencies skip gracefully)"
key-files:
  created:
    - iac/cloudrun/judge0.tf.disabled
    - scripts/verify-phase-50.sh
  modified:
    - iac/gce-judge0/README.md (banner rewrite)
    - ARCHITECTURE.md
    - docs/runbooks/coding-stack.md
    - .gitignore
  moved:
    - "infra/terraform/ → iac/gce-judge0/ (9 files, history preserved)"
decisions:
  - "git mv over rm+cp to preserve full v1.4 phase-43 commit history on each .tf file"
  - "No provider blocks in .disabled file (D-11) — resources only, comes alive only after rename"
  - "Phase gate SKIPs external checks (secrets, staging URL) rather than FAILing when upstream phases not yet applied"
  - "terraform fmt clean; terraform validate deferred (requires init which would create state, outside Phase 50 scope)"
metrics:
  duration: ~8min
  completed: 2026-04-18
  tasks: 2
  phase-gate: 21 PASS / 0 FAIL / 3 SKIP
---

# Phase 50 Plan 04: IaC Relabel + v1.6 Stub + Phase Gate Summary

**One-liner:** git-mv'd `infra/terraform/` → `iac/gce-judge0/` with REFERENCE TEMPLATE banner; committed v1.6 Judge0 activation stub at `iac/cloudrun/judge0.tf.disabled`; added `scripts/verify-phase-50.sh` phase gate (21 PASS / 0 FAIL / 3 SKIP).

## What Was Built

### Task 1: Relabel v1.4 GCE layout as reference template

- `git mv infra/terraform iac/gce-judge0` — 9 files moved with rename detection preserving history.
- Removed empty `infra/` parent directory.
- `iac/gce-judge0/README.md`: prepended a bold "REFERENCE TEMPLATE — NOT ACTIVE INFRASTRUCTURE" banner explaining the v1.5 → v1.6 timeline; original v1.4 content retained below as "## Original v1.4 Content".
- Updated live markdown references:
  - `ARCHITECTURE.md` (one reference updated with cross-link to `iac/cloudrun/judge0.tf.disabled`)
  - `docs/runbooks/coding-stack.md` (5 references via replace_all)
- Left archived docs untouched: `.planning/milestones/v1.4-phases/**`, `.planning/phases/43-*`, `.planning/phases/44-*` (historical record).
- `.gitignore` additions: `iac/gce-judge0/.terraform.lock.hcl`, `.terraform/`, `terraform.tfstate*` — prevents accidental state commit if anyone runs `terraform init` in the reference dir.
- `terraform fmt -check -diff` clean across all 8 .tf files.

Commit: `ddaa6a7` — `chore(50-04): relabel infra/terraform to iac/gce-judge0 as v1.4 reference template`

### Task 2: v1.6 Judge0 activation stub + phase gate

- `iac/cloudrun/judge0.tf.disabled`: 108-line commented HCL documenting the full v1.6 stack — VPC connector (10.8.0.0/28 CIDR), firewall rule (Cloud Run → Judge0 VM port 2358 only), Cloud Run `vpc_access` egress patch (PRIVATE_RANGES_ONLY), `data "google_compute_instance"` reference, Secret Manager rotation pattern. Ends with 13-step Activation runbook. No `provider` blocks (D-11). Terraform-inert — `.disabled` suffix excludes from `*.tf` glob.
- `scripts/verify-phase-50.sh`: executable phase gate, 7 check groups:
  1. Plan 01 artifacts (flag helper, error class)
  2. Plan 02 server-side guards (8 routes total — status + 7 guarded)
  3. Plan 03 UI artifacts (ComingSoon, pages, SubmitBar FEATURE_DISABLED)
  4. IaC relabel (banner, stub, `.disabled` excluded from glob)
  5. Test suite (codingFeatureFlag tests + tsc)
  6. Secret Manager values (SKIPs if gcloud unauthenticated)
  7. Staging URL probe (SKIPs if Phase 47 not deployed)
- First run: 21 PASS / 0 FAIL / 3 SKIP (expected skips for upstream-dependent checks).

Commit: `f76edca` — `feat(50-04): add v1.6 Judge0 TF stub + phase gate script`

## Deviations from Plan

None — plan executed exactly as written. Plan header listed `iac/gce-judge0/app-vm.tf` etc. as "files_modified" in frontmatter; those are outcomes of the `git mv` (not content edits), so no additional action needed.

## Threat Flags

None.

## Self-Check: PASSED

- `iac/gce-judge0/` has 9 files (README + 8 .tf) FOUND
- `infra/terraform/` removed FOUND
- `iac/gce-judge0/README.md` contains "REFERENCE TEMPLATE" FOUND
- `iac/cloudrun/judge0.tf.disabled` contains "## Activation" FOUND
- `iac/cloudrun/judge0.tf.disabled` has NO `provider "google"` block (grep confirms)
- `scripts/verify-phase-50.sh` executable, `bash -n` clean FOUND
- Phase gate runs end-to-end, exit 0 (21 PASS / 0 FAIL / 3 SKIP) VERIFIED
- `terraform fmt -check -diff` in `iac/gce-judge0/` exits clean
- Commits `ddaa6a7` + `f76edca` FOUND in git log
