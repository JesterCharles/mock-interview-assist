// -----------------------------------------------------------------------------
// Next Level Mock — infrastructure root module (Phase 43 MSA deployment).
//
// Topology: two GCE VMs in the same VPC.
//   - app VM    : imported (see app-vm.tf, Plan 43-01 Task 3)
//   - judge0 VM : new (see judge0-vm.tf), no public IP, attached PD for Postgres
//
// State: GCS bucket `${PROJECT_ID}-tfstate` (versioned). Supply the concrete
// bucket name at init-time with:
//
//   terraform init \
//     -backend-config="bucket=${PROJECT_ID}-tfstate" \
//     -backend-config="prefix=nlm/prod"
//
// Decision refs: D-01..D-06 (see .planning/phases/43-msa-deployment/43-CONTEXT.md).
// -----------------------------------------------------------------------------

terraform {
  // Production target is >= 1.6.0 (module written against 1.6+). We allow
  // 1.5.x here so local dev environments that haven't upgraded yet can still
  // run `terraform validate` / `fmt`. CI should pin 1.6+ before `apply`.
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  // D-06: remote state in GCS. Bucket/prefix injected via -backend-config at
  // `terraform init` time (see README.md Bootstrap section). Do NOT hard-code
  // the bucket name here — it varies per GCP project.
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
