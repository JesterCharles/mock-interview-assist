// -----------------------------------------------------------------------------
// Outputs consumed by downstream automation (CI/CD workflows, runbooks).
// Internal IPs are not secrets — do NOT mark these sensitive.
// -----------------------------------------------------------------------------

output "app_vm_internal_ip" {
  description = "Internal IP of the imported app VM. Sourced by deploy-app.yml and by firewall.tf to scope Judge0 ingress."
  value       = google_compute_instance.app.network_interface[0].network_ip
}

output "judge0_internal_ip" {
  description = "Internal IP of the Judge0 VM. Consumed by deploy-judge0.yml and by the app VM to reach Judge0 on port 2358."
  value       = google_compute_instance.judge0.network_interface[0].network_ip
}

output "judge0_vm_name" {
  description = "Name of the Judge0 VM (mirrors var.judge0_vm_name). Used by deploy workflows + runbook."
  value       = google_compute_instance.judge0.name
}

output "judge0_service_account_email" {
  description = "Email of the least-privilege metrics SA attached to the Judge0 VM."
  value       = google_service_account.judge0_metrics.email
}

output "judge0_data_disk_name" {
  description = "Name of the attached persistent disk that holds Judge0 Postgres data (survives VM restart per D-04)."
  value       = google_compute_disk.judge0_data.name
}
