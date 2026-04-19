#!/usr/bin/env bash
# Phase 45 — D-16 smoke image push.
# Builds the Next.js app image from the repo root Dockerfile and pushes it to
# the STAGING Artifact Registry as `nlm-app:phase45-smoke`. Proves end-to-end
# wiring: Dockerfile → docker build → gcloud auth configure-docker → push → digest recorded.
#
# Source: 45-RESEARCH.md §Common Operation 3.
# Pitfall 7: always use full project-qualified URL (never omit project).
set -euo pipefail

PROJECT_ID="nlm-staging-493715"
REGION="us-central1"
REPO="nlm-app"
TAG="phase45-smoke"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/nlm-app"

# Find repo root (script may be invoked from iac/cloudrun/ or from repo root)
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "${REPO_ROOT}"

echo "Configuring docker auth against ${REGION}-docker.pkg.dev ..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "Building image from ${REPO_ROOT}/Dockerfile ..."
docker build -t nlm-app:test .

echo "Tagging as ${IMAGE_BASE}:${TAG} ..."
docker tag nlm-app:test "${IMAGE_BASE}:${TAG}"

echo "Pushing ..."
docker push "${IMAGE_BASE}:${TAG}"

echo "Verifying digest recorded in registry ..."
gcloud artifacts docker images list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/nlm-app" \
  --include-tags \
  --project="${PROJECT_ID}" \
  --format="value(IMAGE,DIGEST,TAGS)"

echo "Smoke image pushed successfully. Tag=${TAG} present in ${IMAGE_BASE}."
