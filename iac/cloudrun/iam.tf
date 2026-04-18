# Phase 45 — iac/cloudrun/iam.tf
# Source: 45-RESEARCH.md §Pattern 5; D-11 (2 SAs per project); D-13 (account IDs); D-14 (accessor now, WIF deferred to P48).
# T-45-04 mitigation: per-secret binding via for_each — no project-level secretmanager.admin grant.
# T-45-05 mitigation: no google_service_account_key resources — only SYSTEM_MANAGED keys exist on SAs.

resource "google_service_account" "cloudrun" {
  project      = var.project_id
  account_id   = var.cloudrun_sa_id
  display_name = "NLM Cloud Run runtime identity (${var.env})"
  description  = "Attached to the NLM Cloud Run service in Phase 47. Reads secrets listed in var.secret_names."

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "ghactions" {
  project      = var.project_id
  account_id   = var.ghactions_sa_id
  display_name = "NLM GitHub Actions deployer (${var.env})"
  description  = "WIF principal bound in Phase 48. No role bindings in Phase 45."

  depends_on = [google_project_service.apis]
}

# Per-secret accessor binding — strictly scoped, no project-wide grant.
# for_each over the secret set keeps binding count == secret count (13 per project).
resource "google_secret_manager_secret_iam_member" "cloudrun_accessor" {
  for_each = google_secret_manager_secret.app

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun.email}"
}
