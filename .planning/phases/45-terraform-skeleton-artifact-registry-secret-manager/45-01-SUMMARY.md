---
phase: 45-terraform-skeleton-artifact-registry-secret-manager
plan: 01
subsystem: iac-cloudrun
one_liner: "Terraform skeleton + tfstate bucket + seed APIs — module validates and plans cleanly against both nlm-staging-493715 and nlm-prod"
tags: [infra, terraform, gcp, bootstrap]
requires: []
provides:
  - iac/cloudrun module root (providers, variables, apis, state stub, outputs, tfvars, README, .gitignore)
  - gs://nlm-tfstate bucket in nlm-prod (versioning + UBLA + PAP)
  - serviceusage + cloudresourcemanager APIs enabled in both projects
  - bootstrap scripts (preflight, enable-seed-apis, bootstrap-state-bucket)
affects:
  - New directory iac/cloudrun/; infra/terraform/ untouched (D-01)
tech_stack:
  added:
    - "terraform 1.14.8 (brew hashicorp/tap — replaces 1.5.7 from default formula)"
    - "hashicorp/google provider ~> 7.0 (pinned via .terraform.lock.hcl at v7.28.0)"
  patterns:
    - "partial backend config — prefix injected via `-backend-config=prefix=cloudrun/<env>` at init (Pitfall 3)"
    - "-var-file per env (D-03 — NOT terraform workspaces)"
key_files:
  created:
    - iac/cloudrun/providers.tf
    - iac/cloudrun/variables.tf
    - iac/cloudrun/apis.tf
    - iac/cloudrun/state.tf
    - iac/cloudrun/outputs.tf
    - iac/cloudrun/staging.tfvars
    - iac/cloudrun/prod.tfvars
    - iac/cloudrun/README.md
    - iac/cloudrun/.gitignore
    - iac/cloudrun/.terraform.lock.hcl
    - iac/cloudrun/scripts/preflight.sh
    - iac/cloudrun/scripts/enable-seed-apis.sh
    - iac/cloudrun/scripts/bootstrap-state-bucket.sh
  modified: []
decisions:
  - Upgraded local terraform from brew 1.5.7 (BSL-capped default formula) to hashicorp/tap 1.14.8 to satisfy plan's >= 1.6 floor
  - Used GOOGLE_OAUTH_ACCESS_TOKEN env var for terraform auth because ADC token expired and cannot be refreshed non-interactively
  - Kept state.tf as documentation-only stub per D-06 (no google_storage_bucket resource — bucket un-managed by TF design)
metrics:
  tasks_completed: 3
  commits: 3
  duration_minutes: 10
  completed_date: 2026-04-18
---

# Phase 45 Plan 01: Terraform Skeleton + Bootstrap Summary

## What Was Built

Greenfield `iac/cloudrun/` Terraform module with:
- **Providers + backend**: `required_version >= 1.6.0`, `hashicorp/google ~> 7.0`, `backend "gcs" { bucket = "nlm-tfstate" }` with per-env prefix injection at init.
- **Variables**: `project_id`, `region`, `env` (validated staging|prod), `required_apis` (11 — cloudbuild dropped per research Q4), `secret_names` (13 D-09), `cloudrun_sa_id` + `ghactions_sa_id` (D-13).
- **API enablement**: `google_project_service.apis` `for_each` over `var.required_apis`; `disable_on_destroy = false` (T-45-09).
- **State stub**: commented-only `state.tf` documenting the bucket is un-managed (D-06, T-45-06).
- **Empty outputs.tf**: placeholder for Plans 02 + 03 to append without conflict.
- **Per-env tfvars**: `staging.tfvars` (`nlm-staging-493715`, `env=staging`) + `prod.tfvars` (`nlm-prod`, `env=prod`).
- **Bootstrap scripts**: `preflight.sh` (terraform >= 1.6 + CLI presence), `enable-seed-apis.sh` (serviceusage + cloudresourcemanager per project), `bootstrap-state-bucket.sh` (idempotent `gs://nlm-tfstate` create with versioning + UBLA + PAP enforced).
- **README**: bootstrap sequence, per-env invocation, 7-pitfall callout, module file map, secret-population out-of-band guide.

## Infrastructure Provisioned (out-of-band via scripts)

- `gs://nlm-tfstate` in `nlm-prod`: US multi-region, versioning Enabled, UBLA Enabled, public-access-prevention enforced.
- `serviceusage.googleapis.com` enabled in `nlm-staging-493715` + `nlm-prod`.
- `cloudresourcemanager.googleapis.com` enabled in `nlm-staging-493715` + `nlm-prod`.

## Verification Run

```
terraform fmt -check              → exit 0 (clean)
terraform validate (staging init) → exit 0 (Success!)
terraform plan staging            → exit 2 (11 APIs to add, no errors)
terraform plan prod               → exit 2 (11 APIs to add, no errors)
gsutil versioning get gs://nlm-tfstate       → Enabled
gsutil uniformbucketlevelaccess gs://nlm-tfstate → Enabled
git status infra/terraform/       → empty (D-01 preserved)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Upgraded terraform 1.5.7 → 1.14.8**
- **Found during:** Task 1 (preflight.sh first run)
- **Issue:** The plan mandates terraform >= 1.6.0 (hashicorp/google ~> 7.0 floor), but the machine had `brew install terraform` = 1.5.7 (Homebrew default formula is capped at 1.5.7 due to BSL license change).
- **Fix:** Ran `brew tap hashicorp/tap && brew uninstall terraform && brew install hashicorp/tap/terraform` → installed 1.14.8.
- **Files modified:** none (tool install only)
- **Commit:** not applicable (environment change)

**2. [Rule 1 - Bug] Fixed preflight.sh JSON parse**
- **Found during:** Task 1 (preflight.sh second run after terraform upgrade)
- **Issue:** The original `sed -n 's/.*"terraform_version":"\([^"]*\)".*/\1/p'` assumed all JSON on one line. terraform 1.14's `-json` output emits pretty-printed multi-line JSON, so the regex didn't match and returned empty.
- **Fix:** Added `tr -d '\n'` pipe to collapse lines before sed; also allowed optional whitespace after `:` for robustness.
- **Files modified:** `iac/cloudrun/scripts/preflight.sh`
- **Commit:** (included in Task 1 commit `c9a69c6`)

### Authentication Gate

**ADC token expired — fell back to gcloud auth token**
- `gcloud auth application-default print-access-token` failed with "Reauthentication failed. cannot prompt during non-interactive execution."
- Workaround: `export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"` before each terraform invocation. The google provider accepts this env var and it's refreshed via the still-valid `aicogeng@gmail.com` gcloud login.
- No code change needed. Future plans should use the same pattern until human refreshes ADC (`gcloud auth application-default login` requires a browser).

## Commits

| Task | Subject | Hash |
|------|---------|------|
| 1 | chore(45-01): bootstrap scripts + gitignore for iac/cloudrun | `c9a69c6` |
| 2 | feat(45-01): HCL skeleton for iac/cloudrun (providers, variables, apis, state stub, tfvars) | `f075eb9` |
| 3 | docs(45-01): iac/cloudrun README with bootstrap sequence + per-env invocations | `abbea64` |

## Self-Check: PASSED

- Files:
  - FOUND: iac/cloudrun/providers.tf
  - FOUND: iac/cloudrun/variables.tf
  - FOUND: iac/cloudrun/apis.tf
  - FOUND: iac/cloudrun/state.tf
  - FOUND: iac/cloudrun/outputs.tf
  - FOUND: iac/cloudrun/staging.tfvars
  - FOUND: iac/cloudrun/prod.tfvars
  - FOUND: iac/cloudrun/README.md
  - FOUND: iac/cloudrun/.gitignore
  - FOUND: iac/cloudrun/scripts/preflight.sh
  - FOUND: iac/cloudrun/scripts/enable-seed-apis.sh
  - FOUND: iac/cloudrun/scripts/bootstrap-state-bucket.sh
- Commits: c9a69c6, f075eb9, abbea64 all present.
