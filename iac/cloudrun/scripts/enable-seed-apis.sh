#!/usr/bin/env bash
# Phase 45 seed-API enable — MUST run before first `terraform init`.
# Source: 45-RESEARCH.md §Pitfall 2 (terraform-provider-google#14174).
set -euo pipefail

for PROJECT in nlm-staging-493715 nlm-prod; do
  echo "Enabling seed APIs in ${PROJECT}..."
  gcloud services enable \
    serviceusage.googleapis.com \
    cloudresourcemanager.googleapis.com \
    --project="${PROJECT}"
done
echo "Seed APIs enabled in both projects."
