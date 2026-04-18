// -----------------------------------------------------------------------------
// Judge0 VM — dedicated GCE instance for sandboxed code execution (D-01, D-04).
//
// CRITICAL: no public IP (no access_config block on network_interface).
// Ingress to port 2358 is gated by firewall.tf to the app VM internal IP only.
//
// Persistent disk carries Judge0 Postgres data across VM restarts (D-04).
// Redis state is ephemeral by design — Judge0 server rebuilds the queue on
// restart.
// -----------------------------------------------------------------------------

resource "google_compute_disk" "judge0_data" {
  name = "${var.judge0_vm_name}-data"
  type = "pd-standard"
  size = var.judge0_data_disk_size_gb
  zone = var.zone

  // Deletion protection: persistent disk survives VM restart; we should not
  // let `terraform destroy` silently wipe Postgres data.
  // Terraform's resource-level prevent_destroy is a separate mechanism.
  lifecycle {
    prevent_destroy = false
    // NOTE: intentionally false for v1.4. Flip to `true` once the stack is
    // stable enough that no-one should be recreating this disk. For now,
    // Task 3 human-checkpoint owner may need to taint + recreate.
  }
}

resource "google_compute_instance" "judge0" {
  name         = var.judge0_vm_name
  machine_type = var.judge0_machine_type
  zone         = var.zone
  tags         = ["judge0", "internal-only"]

  boot_disk {
    initialize_params {
      image = var.judge0_boot_image
      size  = 20
    }
  }

  // Persistent data disk per D-04 — attached, not boot.
  attached_disk {
    source      = google_compute_disk.judge0_data.id
    device_name = "judge0-data"
  }

  network_interface {
    network    = data.google_compute_network.primary.name
    subnetwork = data.google_compute_subnetwork.primary.name
    // NO access_config block — no public IP. D-03 internal-only.
  }

  service_account {
    email  = google_service_account.judge0_metrics.email
    scopes = ["cloud-platform"] // narrowed by the IAM role binding in service-accounts.tf
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  // Allow `terraform apply` to stop the VM for machine_type changes. Without
  // this, any disruptive update fails at plan time.
  allow_stopping_for_update = true

  lifecycle {
    // Judge0 VM is NOT cattle: it's the single code-execution host for the
    // whole coding stack. Accidentally blowing it away via `terraform
    // destroy` or a plan that re-creates it wipes Postgres data until the
    // attached persistent disk re-attaches, and costs ~5 min of downtime
    // to bootstrap docker compose. Flipping this on forces the operator
    // to explicitly `terraform taint google_compute_instance.judge0` before
    // a replace — see runbook §5 Tier 3 recovery (WR-07, Phase 43 review).
    prevent_destroy = true
  }
}
