# Phase 45 — iac/cloudrun/providers.tf
# Source: 45-RESEARCH.md §Pattern 1; D-04 backend prefix injected via -backend-config at init.
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }

  backend "gcs" {
    bucket = "nlm-tfstate"
    # prefix is injected per-env at init time via:
    #   terraform init -reconfigure -backend-config="prefix=cloudrun/staging"
    #   terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
    # (Pitfall 3: backend blocks forbid variables — partial config + -backend-config flag is the supported path.)
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
