# Phase 45 — iac/cloudrun/apis.tf
# Source: 45-RESEARCH.md §Pattern 2; T-45-09 (prevent API-disable DoS).
# disable_on_destroy=false is v7 default (State of the Art); set explicitly for clarity.
resource "google_project_service" "apis" {
  for_each = toset(var.required_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy         = false
  disable_dependent_services = false
}
