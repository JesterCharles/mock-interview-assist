#!/usr/bin/env bash
# Phase 45 tfstate bucket bootstrap — D-05 (bucket in nlm-prod), D-06 (manual one-time).
# Source: 45-RESEARCH.md §Common Operation 1.
# Safe to re-run: create step tolerates 409 AlreadyOwnedByYou; updates are idempotent.
set -euo pipefail

PROJECT_ID="nlm-prod"
BUCKET="nlm-tfstate"

echo "Creating gs://${BUCKET} in ${PROJECT_ID} (US multi-region, uniform access, PAP enforced)..."
gcloud storage buckets create "gs://${BUCKET}" \
  --project="${PROJECT_ID}" \
  --location=US \
  --uniform-bucket-level-access \
  --public-access-prevention \
  2>&1 | grep -v "already exists" || true

echo "Enabling object versioning..."
gcloud storage buckets update "gs://${BUCKET}" --versioning

echo "Verifying..."
gsutil versioning get "gs://${BUCKET}"                       # expect: Enabled
gsutil uniformbucketlevelaccess get "gs://${BUCKET}"         # expect: Enabled

echo "Bucket bootstrap complete — ready for 'terraform init -backend-config=prefix=cloudrun/<env>'."
