# Phase 45 — iac/cloudrun/secrets.tf
# Source: 45-RESEARCH.md §Pattern 4; D-09 (13 secrets); D-10 (TF owns shells only — no values).
# T-45-01 mitigation: NO google_secret_manager_secret_version resources — plaintext never enters tfstate.
# Values are populated out-of-band via `gcloud secrets versions add` (see iac/cloudrun/README.md).
resource "google_secret_manager_secret" "app" {
  for_each = toset(var.secret_names)

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  labels = {
    env       = var.env
    managed   = "terraform"
    component = "nlm-app"
  }

  depends_on = [google_project_service.apis]
}
