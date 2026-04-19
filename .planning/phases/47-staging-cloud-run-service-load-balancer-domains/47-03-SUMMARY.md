---
phase: 47-staging-cloud-run-service-load-balancer-domains
plan: 03
subsystem: workload-identity-federation
one_liner: "WIF pool + OIDC provider HCL for both nlm-staging-493715 + nlm-prod + D-18 least-privilege bindings + wif-smoke.yml workflow_dispatch shipped; terraform apply + workflow run HALTED"
tags: [infra, terraform, wif, oidc, iam, ci, halt]
requires: [47-01]
provides:
  - iac/cloudrun/wif.tf (data.google_project.current + pool + OIDC provider + SA impersonation)
  - iac/cloudrun/iam.tf extended with 3 D-18 bindings (artifactregistry.writer, run.admin, SA-scoped iam.serviceAccountUser)
  - .github/workflows/wif-smoke.yml (workflow_dispatch only; proves WIF end-to-end)
affects:
  - iac/cloudrun: adds 6 resources per env (3 WIF + 3 IAM); +12 across both projects once applied
  - .github/workflows: new wif-smoke workflow consumes STAGING_PROJECT_NUMBER repo variable
tech_stack:
  added:
    - "google-github-actions/auth@v2 + setup-gcloud@v2 (GitHub Actions uses, Pitfall 8 ordering)"
  patterns:
    - "data.google_project.current.number for principalSet URI (Pitfall 3)"
    - "SA-scoped google_service_account_iam_member for roles/iam.serviceAccountUser (NOT project-level)"
    - "attribute_condition literal load-bearing — repo-slug gate (T-47-02)"
key_files:
  created:
    - iac/cloudrun/wif.tf
    - .github/workflows/wif-smoke.yml
    - .planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-03-SUMMARY.md
  modified:
    - iac/cloudrun/iam.tf (3 new resources appended)
decisions:
  - "Unattended mode: shipped HCL + YAML + terraform plan; DID NOT apply and DID NOT run workflow."
  - "Captured project numbers from live gcloud: STAGING=168540542629, PROD=609812564722. Plan output confirms principalSet URI expands to the correct number (not the project ID string)."
  - "wif-smoke.yml created but NOT dispatched — requires gh CLI + repo-scope PAT + applied WIF bindings, all operator-gated."
metrics:
  tasks_completed: 2
  tasks_halted: 1
  commits: 2
  duration_minutes: 7
  completed_date: 2026-04-18
---

# Phase 47 Plan 03: Workload Identity Federation Summary

## What Was Built

1. **`iac/cloudrun/wif.tf`** — 4 resources:
   - `data.google_project.current` (Pitfall 3 number lookup)
   - `google_iam_workload_identity_pool.github` (`pool_id = "github-actions"`, D-13)
   - `google_iam_workload_identity_pool_provider.github`:
     - `oidc.issuer_uri = "https://token.actions.githubusercontent.com"`
     - `attribute_mapping` has all 4 keys (D-15)
     - **`attribute_condition = "attribute.repository == \"${var.github_repo_slug}\""`** — T-47-02 load-bearing
   - `google_service_account_iam_member.wif_impersonation`:
     - `role = "roles/iam.workloadIdentityUser"`
     - `member` uses `${data.google_project.current.number}` (Pitfall 3 — NOT `var.project_id`)

2. **`iac/cloudrun/iam.tf`** (appended, Phase 45 content preserved) — 3 D-18 bindings:
   - `ghactions_artifactregistry_writer` (project-level `roles/artifactregistry.writer`)
   - `ghactions_run_admin` (project-level `roles/run.admin`)
   - `ghactions_act_as_cloudrun_sa` (**SA-scoped** `roles/iam.serviceAccountUser` on `nlm-cloudrun-sa` — NOT project-wide)

3. **`.github/workflows/wif-smoke.yml`** — workflow_dispatch only:
   - `permissions: { id-token: write, contents: read }` (OIDC mint requirement)
   - Sequence: checkout → `google-github-actions/auth@v2` (WIF exchange) → `setup-gcloud@v2` → `gcloud auth list` + `print-identity-token` proof
   - `workload_identity_provider: projects/${{ vars.STAGING_PROJECT_NUMBER }}/...` (uses repo variable, not secret)
   - `service_account: github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com`

**Plan evidence:**

```
terraform plan -var-file=staging.tfvars
  Plan: 16 to add, 0 to change, 0 to destroy.
  # includes principalSet member expansion:
  + member = "principalSet://iam.googleapis.com/projects/168540542629/locations/global/workloadIdentityPools/github-actions/attribute.repository/JesterCharles/mock-interview-assist"
```

Confirms: the `${data.google_project.current.number}` interpolation resolves to `168540542629` (the staging project number, pulled live from `gcloud projects describe nlm-staging-493715`). NOT `nlm-staging-493715` string (which would silent-fail — Pitfall 3).

**Project numbers captured live:**
- `nlm-staging-493715` → `168540542629`
- `nlm-prod` → `609812564722`

## What Was NOT Built (HALT)

**Tasks 2-B/2-C live apply (both projects) + Task 3 repo-variable set + workflow run — HALTED.**

- **Task 2 apply:** `terraform apply -var-file=staging.tfvars` then re-init + `-var-file=prod.tfvars`. Non-destructive but a live IAM mutation — halted per unattended rules.
- **Task 3 `gh variable set`:** Requires repo PAT. Not destructive but out of scope for headless agent.
- **Task 3 workflow dispatch:** Requires Task 2 apply to be live first. Chained HALT.

## Verification

```
$ test -f iac/cloudrun/wif.tf && echo FOUND; test -f .github/workflows/wif-smoke.yml && echo FOUND
FOUND
FOUND
$ grep -c 'data "google_project" "current"' iac/cloudrun/wif.tf
1
$ grep -q 'attribute_condition = "attribute.repository == \\"\${var.github_repo_slug}\\""' iac/cloudrun/wif.tf && echo T-47-02
T-47-02
$ grep -q 'principalSet://iam.googleapis.com/projects/\${data.google_project.current.number}' iac/cloudrun/wif.tf && echo Pitfall-3-OK
Pitfall-3-OK
$ ! grep 'principalSet://iam.googleapis.com/projects/\${var.project_id}' iac/cloudrun/wif.tf
# exit 0

$ grep -q 'role    = "roles/artifactregistry.writer"' iac/cloudrun/iam.tf && echo D-18-1
D-18-1
$ grep -q 'role    = "roles/run.admin"' iac/cloudrun/iam.tf && echo D-18-2
D-18-2
$ grep -q 'service_account_id = google_service_account.cloudrun.name' iac/cloudrun/iam.tf && echo D-18-3-sa-scoped
D-18-3-sa-scoped
$ ! grep 'roles/owner' iac/cloudrun/iam.tf && ! grep 'roles/editor' iac/cloudrun/iam.tf && echo T-47-03
T-47-03

$ grep -q 'workflow_dispatch:' .github/workflows/wif-smoke.yml && echo DISPATCH-ONLY
DISPATCH-ONLY
$ ! grep -E '^\s*(push|pull_request):' .github/workflows/wif-smoke.yml
# exit 0
$ grep -q 'id-token: write' .github/workflows/wif-smoke.yml && echo OIDC-PERMS
OIDC-PERMS
$ grep -q 'vars.STAGING_PROJECT_NUMBER' .github/workflows/wif-smoke.yml && echo PROJECT-NUMBER-REPO-VAR
PROJECT-NUMBER-REPO-VAR
```

## Deviations from Plan

### HALT (Unattended Mode)

**HALT: needs operator** — Task 2 (`terraform apply` both projects) + Task 3 (`gh variable set` + `gh workflow run wif-smoke.yml`).

Next operator steps, in order:
```bash
# 1) Apply WIF bindings to staging
cd iac/cloudrun
terraform init -reconfigure -backend-config="prefix=cloudrun/staging"
terraform apply -var-file=staging.tfvars \
  -target=data.google_project.current \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account_iam_member.wif_impersonation \
  -target=google_project_iam_member.ghactions_artifactregistry_writer \
  -target=google_project_iam_member.ghactions_run_admin \
  -target=google_service_account_iam_member.ghactions_act_as_cloudrun_sa

# 2) Same against prod
terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
terraform apply -var-file=prod.tfvars -target=... (same 7 resources)

# 3) Set GH repo variables (project numbers — non-secret)
gh variable set STAGING_PROJECT_NUMBER --body 168540542629 --repo JesterCharles/mock-interview-assist
gh variable set PROD_PROJECT_NUMBER --body 609812564722 --repo JesterCharles/mock-interview-assist

# 4) Dispatch + verify smoke
gh workflow run wif-smoke.yml --ref main --repo JesterCharles/mock-interview-assist
# wait, then:
gh run list --workflow=wif-smoke.yml --limit 1 --json conclusion -q '.[0].conclusion'
# Expected: success
```

### Auto-fixes

None.

## Commits

| Task | Subject | Hash |
|------|---------|------|
| 1+2 | feat(47-03): add WIF pool+provider + D-18 least-privilege bindings (CI-04, T-47-02/03) | `3afd146` |
| 3 | feat(47-03): add wif-smoke.yml workflow_dispatch workflow (D-19, Pitfall 8 ordering) | `bc1702d` |

## Self-Check: PASSED

- Files:
  - FOUND: iac/cloudrun/wif.tf
  - FOUND: iac/cloudrun/iam.tf (new D-18 bindings present)
  - FOUND: .github/workflows/wif-smoke.yml
- Commits: 3afd146, bc1702d present.
- `terraform validate` exit 0.
- `terraform plan` confirms principalSet URI uses project NUMBER `168540542629` (NOT var.project_id string).
- grep assertions: T-47-02, T-47-03, Pitfall 3, dispatch-only all PASS.
