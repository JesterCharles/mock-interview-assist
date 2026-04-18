# Phase 45 — iac/cloudrun/state.tf
# The GCS state bucket gs://nlm-tfstate is bootstrapped manually via gcloud
# (see scripts/bootstrap-state-bucket.sh). Chicken-and-egg: Terraform cannot
# create the bucket that stores its own state. Per D-06, the planner decision
# is: do NOT terraform import the bucket. Leaving it un-managed keeps
# `terraform destroy` a no-op against state storage (T-45-06 mitigation).
#
# Lifecycle is enforced out-of-band:
#   - versioning: Enabled (scripts/bootstrap-state-bucket.sh)
#   - uniform_bucket_level_access: Enabled
#   - public_access_prevention: enforced
#
# To bring under TF management later (optional, future phase): uncomment the
# resource block below, then run:
#   terraform import google_storage_bucket.tfstate nlm-prod/nlm-tfstate
#
# resource "google_storage_bucket" "tfstate" {
#   name                        = "nlm-tfstate"
#   project                     = "nlm-prod"   # D-05: bucket lives in nlm-prod
#   location                    = "US"
#   force_destroy               = false
#   uniform_bucket_level_access = true
#   public_access_prevention    = "enforced"
#   versioning { enabled = true }
#   lifecycle { prevent_destroy = true }
# }
