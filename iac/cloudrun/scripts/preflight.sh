#!/usr/bin/env bash
# Phase 45 preflight — verifies local CLI versions before any terraform init.
# Source: 45-RESEARCH.md §Pitfall 1, §Environment Availability.
set -euo pipefail

fail() { echo "ERROR: $1" >&2; exit 1; }

command -v terraform >/dev/null 2>&1 || fail "terraform not on PATH. Install: brew install terraform"
command -v gcloud    >/dev/null 2>&1 || fail "gcloud not on PATH. Install Cloud SDK."
command -v gsutil    >/dev/null 2>&1 || fail "gsutil not on PATH (comes with Cloud SDK)."
command -v docker    >/dev/null 2>&1 || fail "docker not on PATH (needed for Plan 02 + 04)."

TF_VERSION="$(terraform version -json 2>/dev/null | tr -d '\n' | sed -n 's/.*"terraform_version":[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -n "$TF_VERSION" ] || fail "Could not parse terraform version."

# Require >= 1.6.0 (provider v7 minimum per 45-RESEARCH.md §Standard Stack)
MIN_MAJOR=1; MIN_MINOR=6
IFS='.' read -r TF_MAJOR TF_MINOR _ <<<"$TF_VERSION"
if [ "$TF_MAJOR" -lt "$MIN_MAJOR" ] || { [ "$TF_MAJOR" -eq "$MIN_MAJOR" ] && [ "$TF_MINOR" -lt "$MIN_MINOR" ]; }; then
  fail "terraform ${TF_VERSION} < ${MIN_MAJOR}.${MIN_MINOR}. Run: brew upgrade terraform"
fi

echo "preflight OK — terraform ${TF_VERSION}, gcloud + gsutil + docker present."
