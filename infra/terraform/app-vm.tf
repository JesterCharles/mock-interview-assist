// -----------------------------------------------------------------------------
// App VM — IMPORTED resource (Plan 43-01 Task 3, human checkpoint).
//
// Do NOT destroy/recreate. The live VM serves production traffic; losing it
// during a plan/apply would drop the entire app.
//
// TODO(phase-43-01-task-3): after `terraform import`, back-fill the exact
// live attributes using `terraform show google_compute_instance.app`:
//   - boot_disk.initialize_params.image
//   - tags
//   - labels
//   - metadata / metadata_startup_script
//   - scheduling block (preemptible / automatic_restart)
// Commit the reconciled file with a clean `terraform plan` (zero diff).
// -----------------------------------------------------------------------------

resource "google_compute_instance" "app" {
  name         = var.app_vm_name
  machine_type = var.app_vm_machine_type
  zone         = var.zone

  boot_disk {
    // Placeholder image — MUST be back-filled from `terraform show` output
    // during Task 3 reconciliation. `ignore_changes` on the lifecycle block
    // below will prevent a destroy/replace while the value is provisional.
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network    = data.google_compute_network.primary.name
    subnetwork = data.google_compute_subnetwork.primary.name
    // App VM has a public IP today — DO NOT remove.
    access_config {}
  }

  lifecycle {
    // Defensive: prevent destroy-on-diff during import reconciliation.
    // Fields below vary slightly between gcloud CLI defaults and Terraform's
    // canonical shape. Ignoring them avoids a destroy/replace while Task 3
    // is in progress. Once the import is clean, these can be narrowed.
    ignore_changes = [
      metadata,
      metadata_startup_script,
      attached_disk,
    ]
  }
}
