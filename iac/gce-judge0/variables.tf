// -----------------------------------------------------------------------------
// Variable declarations for the NLM infrastructure module.
//
// Sizing defaults (D-02) are driven by the Phase 38 spike report:
//   .planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md
// That spike committed n1-standard-2 for the Judge0 host (PARTIAL PASS:
// sandbox exec deferred to prod x86_64 VM; see Phase 43 Re-Verify Checklist).
// If a follow-up spike on the GCE VM changes this, update this file only.
//
// App VM attributes are IMPORT-ONLY. Do not edit app_vm_* defaults to resize
// the live VM — use `terraform import` + `terraform apply` with caution.
// -----------------------------------------------------------------------------

variable "project_id" {
  description = "GCP project id hosting both VMs (no default — must be set via tfvars or env)."
  type        = string
}

variable "region" {
  description = "GCP region for both VMs."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for both VMs (must be within var.region)."
  type        = string
  default     = "us-central1-a"
}

// -----------------------------------------------------------------------------
// App VM (imported — see app-vm.tf).
// -----------------------------------------------------------------------------

variable "app_vm_name" {
  description = "Name of the existing app VM to import into Terraform state."
  type        = string
}

variable "app_vm_machine_type" {
  description = "Machine type of the imported app VM. Read-only: set to match the LIVE VM during import. Do not use this to resize."
  type        = string
  default     = "e2-small"
}

// -----------------------------------------------------------------------------
// Judge0 VM (new — see judge0-vm.tf).
// -----------------------------------------------------------------------------

variable "judge0_vm_name" {
  description = "Name of the dedicated Judge0 VM created by this module."
  type        = string
  default     = "nlm-judge0-prod"
}

variable "judge0_machine_type" {
  description = "Machine type for the Judge0 VM. D-02 default per Phase 38 spike (n1-standard-2). Only resize after a follow-up spike."
  type        = string
  default     = "n1-standard-2"
}

variable "judge0_boot_image" {
  description = "Boot image for the Judge0 VM. Debian 12 chosen per CONTEXT.md Claude's Discretion (familiar, docker compose works cleanly)."
  type        = string
  default     = "debian-cloud/debian-12"
}

variable "judge0_data_disk_size_gb" {
  description = "Size (GB) of the persistent disk attached to the Judge0 VM for Postgres data. D-04 default 100 GB."
  type        = number
  default     = 100
}

variable "judge0_service_account_id" {
  description = "Short id for the least-privilege service account bound to the Judge0 VM (metrics logWriter only)."
  type        = string
  default     = "nlm-judge0-metrics"
}

// -----------------------------------------------------------------------------
// Networking (references existing VPC — see vpc.tf).
// -----------------------------------------------------------------------------

variable "vpc_network_name" {
  description = "Name of the existing VPC network to attach both VMs to. Override if your project uses a non-default VPC."
  type        = string
  default     = "default"
}

variable "vpc_subnet_name" {
  description = "Name of the existing subnet to attach both VMs to. Override if your project uses a non-default subnet."
  type        = string
  default     = "default"
}
