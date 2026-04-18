# Phase 45 — iac/cloudrun/registry.tf
# Source: 45-RESEARCH.md §Pattern 3; D-07 (one repo per project, name "nlm-app", DOCKER, us-central1).
# T-45-02 mitigation (image tampering): Phase 48 CI will enforce digest-only pulls when deploying Cloud Run.
resource "google_artifact_registry_repository" "nlm_app" {
  project       = var.project_id
  location      = var.region
  repository_id = "nlm-app"
  format        = "DOCKER"
  description   = "NLM Next.js app images (${var.env})"

  # No cleanup_policies in Phase 45 — image churn low during bootstrap.
  # No remote_repository_config / virtual_repository_config — we push our own builds.

  depends_on = [google_project_service.apis]
}
