# Phase 45 — iac/cloudrun/variables.tf
# Source: 45-CONTEXT.md D-09, D-12, D-13; 45-RESEARCH.md §Pattern 4 secret_names default.
variable "project_id" {
  description = "GCP project ID. nlm-staging-493715 (staging) or nlm-prod."
  type        = string
}

variable "region" {
  description = "GCP region for regional resources. Locked to us-central1 for v1.5."
  type        = string
  default     = "us-central1"
}

variable "env" {
  description = "Environment label applied to resource labels/descriptions. staging or prod."
  type        = string
  validation {
    condition     = contains(["staging", "prod"], var.env)
    error_message = "env must be one of: staging, prod."
  }
}

variable "required_apis" {
  description = "GCP APIs enabled by Terraform. serviceusage + cloudresourcemanager are also enabled out-of-band by scripts/enable-seed-apis.sh (chicken-and-egg; Pitfall 2)."
  type        = list(string)
  default = [
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "run.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
  ]
  # cloudbuild.googleapis.com intentionally dropped per 45-RESEARCH.md Open Question 4 (GH Actions builds in P48, not Cloud Build).
}

variable "secret_names" {
  description = "Secret Manager secret IDs to provision (shells only; values populated out-of-band via `gcloud secrets versions add`). D-09 — 13 secrets."
  type        = list(string)
  default = [
    "DATABASE_URL",
    "DIRECT_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "GITHUB_TOKEN",
    "NEXT_PUBLIC_SITE_URL",
    "ADMIN_EMAILS",
    "JUDGE0_URL",
    "JUDGE0_AUTH_TOKEN",
    "CODING_CHALLENGES_ENABLED",
  ]
}

variable "cloudrun_sa_id" {
  description = "Cloud Run runtime service account ID (D-13). Bound to secrets in iam.tf; attached to Cloud Run services in Phase 47."
  type        = string
  default     = "nlm-cloudrun-sa"
}

variable "ghactions_sa_id" {
  description = "GitHub Actions deployer service account ID (D-13). WIF bindings added in Phase 48; no role bindings in Phase 45."
  type        = string
  default     = "github-actions-deployer"
}

# Phase 47 additions

variable "initial_image_digest" {
  description = "Immutable @sha256 digest of the initial Cloud Run image (D-04). Defaults to the Phase 45 phase45-smoke digest. Phase 48 CI updates the revision via `gcloud run deploy --image=...`; this TF variable is NEVER used after first apply because lifecycle.ignore_changes is set on template.containers[0].image (T-47-07)."
  type        = string
  # No default — must be supplied via staging.tfvars so planner catches missing digest early.
}

variable "domain_name" {
  description = "Public hostname served by the staging HTTPS LB (D-12). Used in the managed SSL cert (Plan 02) and the Cloudflare A record (Plan 02)."
  type        = string
  default     = "staging.nextlevelmock.com"
}

variable "github_repo_slug" {
  description = "GitHub repository in 'owner/name' form (D-16). Load-bearing security control: the WIF attribute_condition restricts federation to this repo only (Plan 03). Tokens from any other repo silently get zero permissions."
  type        = string
  default     = "JesterCharles/mock-interview-assist"
}

variable "cf_zone_id" {
  description = "Cloudflare zone ID for nextlevelmock.com (D-12). Looked up once via `curl https://api.cloudflare.com/client/v4/zones?name=nextlevelmock.com` and stored in staging.tfvars."
  type        = string
  # No default — zone ID is account-specific; staging.tfvars supplies it.
}
