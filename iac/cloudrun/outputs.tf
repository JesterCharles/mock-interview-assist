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

# Phase 47 outputs

output "cloudrun_service_name" {
  description = "Cloud Run service name (D-01). Staging only; prod is Phase 51."
  value       = var.env == "staging" ? google_cloud_run_v2_service.nlm_staging[0].name : null
}

output "cloudrun_service_url" {
  description = "Cloud Run *.run.app URL before DNS cutover. Useful for pre-DNS smoke testing."
  value       = var.env == "staging" ? google_cloud_run_v2_service.nlm_staging[0].uri : null
}

# Phase 47 outputs — staging LB IP (consumed by Phase 51 dns-prod verify script)
output "staging_lb_ip" {
  description = "Global static IPv4 for staging HTTPS LB → nlm-staging Cloud Run (Phase 47)."
  value       = var.env == "staging" ? google_compute_global_address.nlm_staging_lb_ip[0].address : null
}

# Phase 51 outputs — prod Cloud Run + LB

output "prod_cloudrun_url" {
  description = "Default *.run.app URL for prod Cloud Run (pre-DNS smoke target). Null when applied with staging.tfvars."
  value       = var.env == "prod" ? google_cloud_run_v2_service.nlm_prod[0].uri : null
}

output "prod_lb_ip" {
  description = "Global static IP for prod LB. Consumed by dns-prod.tf www record (Plan 02) and by Phase 52 apex-flip. Null when applied with staging.tfvars."
  value       = var.env == "prod" ? google_compute_global_address.nlm_prod_lb_ip[0].address : null
}

output "prod_ssl_cert_name" {
  description = "Managed SSL cert resource name for status polling (nlm-prod-ssl-cert)."
  value       = var.env == "prod" ? google_compute_managed_ssl_certificate.nlm_prod_cert[0].name : null
}
