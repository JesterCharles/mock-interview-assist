# Phase 45 — iac/cloudrun/outputs.tf
# Populated by Plans 02 + 03. Consumers: Phase 47 (Cloud Run) + Phase 48 (CI).
# Plan 02 adds: artifact_registry_repository_id
# Plan 03 adds: cloudrun_service_account_email, github_actions_sa_email, secret_ids

output "artifact_registry_repository_id" {
  description = "Fully qualified Artifact Registry repository resource ID. Consumed by Phase 47 Cloud Run deploy + Phase 48 CI image push."
  value       = google_artifact_registry_repository.nlm_app.id
}

output "artifact_registry_docker_url" {
  description = "Docker-ready Artifact Registry base URL. Append /nlm-app:<tag> when pushing."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.nlm_app.repository_id}"
}

output "cloudrun_service_account_email" {
  description = "Email of the Cloud Run runtime SA (nlm-cloudrun-sa). Attached to Cloud Run service in Phase 47."
  value       = google_service_account.cloudrun.email
}

output "github_actions_sa_email" {
  description = "Email of the GitHub Actions deployer SA. WIF principal bound in Phase 48."
  value       = google_service_account.ghactions.email
}

output "secret_ids" {
  description = "Map of secret-name -> fully qualified Secret Manager resource ID. Consumed by Phase 47 Cloud Run env-var mounts."
  value       = { for k, v in google_secret_manager_secret.app : k => v.id }
}
