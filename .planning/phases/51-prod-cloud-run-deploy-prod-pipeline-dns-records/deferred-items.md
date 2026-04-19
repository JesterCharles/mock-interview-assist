# Phase 51 Deferred Items

Items found during Phase 51 execution that are OUT OF SCOPE and deferred to the owning phase.

## 1. `data.google_secret_manager_secret_version.admin_emails` 404 during `terraform plan -var-file=prod.tfvars`

**Found during:** Plan 51-01 `terraform plan` validation
**File:** `iac/cloudrun/monitoring.tf` line 29
**Error:** `googleapi: Error 404: Secret [projects/609812564722/secrets/ADMIN_EMAILS] not found or has no versions.`
**Owner phase:** Phase 46 (operator-pending secret value population in `nlm-prod` Secret Manager)
**Owner plan:** Phase 46 Plan 03 Task 4 operator checkpoint
**Scope decision:** Out of P51 scope — this data source lives in P48's monitoring.tf and requires `ADMIN_EMAILS` to have at least one version in prod Secret Manager. Phase 46's operator runbook populates all 13 prod secrets; this error resolves once that runbook completes.
**Workaround during plan:** None needed — `terraform plan` still successfully shows all 9 Phase 51 resources to add; the error surfaces only at the very end. Any Phase 51 targeted apply (`terraform apply -target=google_cloud_run_v2_service.nlm_prod ...`) will NOT hit this data source because the target list excludes `monitoring.tf` resources.
**Unblocks:** Phase 48 Plan 04 Task 3 operator step (terraform apply monitoring + email verification) resolves this permanently.

No other deferred items from Phase 51.
