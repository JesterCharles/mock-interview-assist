# Phase 45 — prod env vars. Apply with: terraform apply -var-file=prod.tfvars
project_id = "nlm-prod"
env        = "prod"
region     = "us-central1"

# Phase 48 — uptime check target (defaults already correct)
uptime_host_prod = "nextlevelmock.com"
