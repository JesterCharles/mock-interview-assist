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

# Phase 47 additions — D-18 least-privilege role bindings for github-actions-deployer SA.
# T-47-03 mitigation: exactly 3 bindings; NO roles/owner or roles/editor.

# Project-level: push images to Artifact Registry (D-18)
resource "google_project_iam_member" "ghactions_artifactregistry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.ghactions.email}"
}

# Project-level: deploy Cloud Run services (D-18)
resource "google_project_iam_member" "ghactions_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.ghactions.email}"
}

# SA-level (NOT project-level — D-18 anti-pattern): iam.serviceAccountUser scoped ONLY on nlm-cloudrun-sa.
# Without this, `gcloud run deploy --service-account=nlm-cloudrun-sa@...` fails with
# "Permission iam.serviceAccounts.actAs denied on service account nlm-cloudrun-sa".
# Project-level roles/iam.serviceAccountUser would grant actAs on every SA — over-privileged.
resource "google_service_account_iam_member" "ghactions_act_as_cloudrun_sa" {
  service_account_id = google_service_account.cloudrun.name # Phase 45 nlm-cloudrun-sa SA
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.ghactions.email}"
}
