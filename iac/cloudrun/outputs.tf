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
