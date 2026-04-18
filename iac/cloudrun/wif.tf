# Phase 47 — iac/cloudrun/wif.tf
# Source: 47-RESEARCH.md §Patterns 8 + 9; D-13..D-17; T-47-02 (attribute_condition) + T-47-03 (least-priv) + T-47-08 (per-project pool).
#
# D-14: This module applies once per env (staging then prod). Each apply creates its OWN pool.
# The two pools are isolated — a pool in nlm-staging-493715 cannot impersonate SAs in nlm-prod.

# Pitfall 3: principalSet URI requires project NUMBER (not project ID). Use data source.
data "google_project" "current" {
  project_id = var.project_id
}

# Pattern 8: Workload Identity Pool
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions" # D-13
  display_name              = "GitHub Actions"
  description               = "OIDC federation for GH Actions — NLM repo only (D-16 attribute_condition enforces). Phase 47 proves end-to-end with wif-smoke.yml."

  depends_on = [google_project_service.apis]
}

# Pattern 8: OIDC Provider under the pool
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github" # D-13
  display_name                       = "GitHub OIDC"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com" # D-13
    # allowed_audiences omitted — defaults to the provider resource name,
    # which matches what google-github-actions/auth@v2 sends by default.
  }

  # D-15: attribute mapping — what GCP sees from the GitHub OIDC token
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # D-16 — T-47-02 mitigation (LOAD-BEARING SECURITY CONTROL).
  # Without this, ANY GitHub-hosted workflow on ANY repo can federate into this GCP project.
  # Tokens from any other repo silently fail the condition and get zero permissions.
  attribute_condition = "attribute.repository == \"${var.github_repo_slug}\""
}

# Pattern 9: SA impersonation binding (D-17).
# CRITICAL — principalSet uses project NUMBER (Pitfall 3). `data.google_project.current.number` resolves correctly.
resource "google_service_account_iam_member" "wif_impersonation" {
  service_account_id = google_service_account.ghactions.name # Phase 45 github-actions-deployer SA
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repo_slug}"

  depends_on = [google_iam_workload_identity_pool_provider.github]
}
