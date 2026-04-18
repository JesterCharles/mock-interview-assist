# Phase 45 — iac/cloudrun/providers.tf
# Source: 45-RESEARCH.md §Pattern 1; D-04 backend prefix injected via -backend-config at init.
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0" # D-21 — v5 GA'd 2025-02-03 with breaking renames (cloudflare_record → cloudflare_dns_record). Stay on v4.
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

# Cloudflare provider — D-21 locks v4.x.
# Auth via CLOUDFLARE_API_TOKEN env var only (developer shell). Token is NOT persisted to Secret Manager (D-21, T-47-09).
# Scope: Zone.DNS.Edit on nextlevelmock.com zone only. Document token generation in iac/cloudrun/README.md (Plan 02).
provider "cloudflare" {
  # api_token intentionally omitted — reads CLOUDFLARE_API_TOKEN from the environment.
}
