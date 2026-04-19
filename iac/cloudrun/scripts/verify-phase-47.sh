#!/usr/bin/env bash
# Phase 47 phase gate — aggregates every INFRA-04 / INFRA-05 / CI-04 assertion.
# Source: 47-RESEARCH.md §Operational Scripts; 47-VALIDATION.md Per-Task Verification Map.
# Exit 0 = all PASS; exit non-zero on first fail.
#
# Usage: bash iac/cloudrun/scripts/verify-phase-47.sh

set -euo pipefail

PROJECT_STAGING="nlm-staging-493715"
PROJECT_PROD="nlm-prod"
REGION="us-central1"
SERVICE="nlm-staging"
DOMAIN="staging.nextlevelmock.com"
REPO_SLUG="JesterCharles/mock-interview-assist"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }
info() { echo "..  : $*"; }

info "=== Phase 47 phase gate starting ==="

# ─── INFRA-04 — Cloud Run service config ───
info "Fetching Cloud Run service config..."
CONFIG_JSON=$(gcloud run services describe "${SERVICE}" \
  --region="${REGION}" --project="${PROJECT_STAGING}" --format=json)

# Digest-pinned pull (T-47-05, 47-01-01)
echo "${CONFIG_JSON}" | jq -e '.template.containers[0].image | test("@sha256:")' >/dev/null \
  || fail "image not digest-pinned (T-47-05)"
pass "INFRA-04: image is @sha256:-pinned"

# Baseline config (47-01-02)
BASELINE_CSV=$(echo "${CONFIG_JSON}" | jq -r '[.template.scaling.minInstanceCount, .template.scaling.maxInstanceCount, .template.containers[0].resources.limits.cpu, .template.containers[0].resources.limits.memory, .template.timeout] | @csv')
EXPECTED_CSV='0,10,"1","512Mi","300s"'
[[ "${BASELINE_CSV}" == "${EXPECTED_CSV}" ]] \
  || fail "INFRA-04 baseline mismatch: got ${BASELINE_CSV}, expected ${EXPECTED_CSV}"
pass "INFRA-04: baseline ${EXPECTED_CSV}"

# 13 secrets mounted (D-06)
ENV_COUNT=$(echo "${CONFIG_JSON}" | jq '[.template.containers[0].env[].name] | length')
[[ "${ENV_COUNT}" == "13" ]] \
  || fail "env-var count != 13 (got ${ENV_COUNT}) — D-06 violation"
pass "INFRA-04: 13 secrets mounted as env vars"

# Runtime SA = nlm-cloudrun-sa (D-05)
SA=$(echo "${CONFIG_JSON}" | jq -r '.template.serviceAccount')
[[ "${SA}" == "nlm-cloudrun-sa@${PROJECT_STAGING}.iam.gserviceaccount.com" ]] \
  || fail "runtime SA is ${SA}, expected nlm-cloudrun-sa@..."
pass "INFRA-04: runtime SA = nlm-cloudrun-sa"

# Public invoker IAM (Pitfall 4)
gcloud run services get-iam-policy "${SERVICE}" \
  --region="${REGION}" --project="${PROJECT_STAGING}" --format=json \
  | jq -r '.bindings[]? | select(.role=="roles/run.invoker") | .members[]' \
  | grep -qx "allUsers" \
  || fail "roles/run.invoker:allUsers missing (Pitfall 4)"
pass "INFRA-04: roles/run.invoker:allUsers bound"

# T-47-07 lifecycle.ignore_changes (47-01-03)
grep -qE 'ignore_changes.*template\[0\]\.containers\[0\]\.image' iac/cloudrun/cloudrun-staging.tf \
  || fail "T-47-07: lifecycle.ignore_changes missing from cloudrun-staging.tf"
pass "INFRA-04 / T-47-07: lifecycle.ignore_changes present"

# NEXT_PUBLIC_SITE_URL secret value (47-04-02, D-07)
SITE_URL=$(gcloud secrets versions access latest --secret=NEXT_PUBLIC_SITE_URL --project="${PROJECT_STAGING}")
[[ "${SITE_URL}" == "https://staging.nextlevelmock.com" ]] \
  || fail "NEXT_PUBLIC_SITE_URL secret value is '${SITE_URL}', expected 'https://staging.nextlevelmock.com'"
pass "INFRA-04 / D-07: NEXT_PUBLIC_SITE_URL populated"

# ─── INFRA-05 — LB + SSL + DNS ───
# SSL cert ACTIVE (47-02-01)
SSL_STATUS=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
  --project="${PROJECT_STAGING}" --format='value(managed.status)')
[[ "${SSL_STATUS}" == "ACTIVE" ]] \
  || fail "SSL cert status ${SSL_STATUS}, expected ACTIVE (may need more wait; see README Pitfall 1)"
pass "INFRA-05: managed SSL cert ACTIVE"

# HTTPS 200 (47-02-02)
curl -sfI "https://${DOMAIN}/api/health" | head -1 | grep -q '200' \
  || fail "HTTPS /api/health != 200"
pass "INFRA-05: https://${DOMAIN}/api/health = 200"

# DNS → LB IP direct, no orange cloud (47-02-03, T-47-06)
LB_IP=$(gcloud compute addresses describe nlm-staging-lb-ip --global --project="${PROJECT_STAGING}" --format='value(address)')
DIG_IP=$(dig +short "${DOMAIN}" A | head -1)
[[ "${DIG_IP}" == "${LB_IP}" ]] \
  || fail "DNS ${DIG_IP} != LB ${LB_IP} — orange cloud likely ON (T-47-06)"
pass "INFRA-05: dig ${DOMAIN} → ${LB_IP} (LB direct)"

# No Cloudflare proxy headers (T-47-06 negative)
if curl -sI "https://${DOMAIN}/api/health" | grep -qi '^cf-ray:'; then
  fail "cf-ray header present — Cloudflare proxy is ON (flip proxied=false)"
fi
pass "INFRA-05 / T-47-06: no cf-ray header (orange cloud OFF)"

# Forwarding rule port 443
PORT_RANGE=$(gcloud compute forwarding-rules describe nlm-staging-https-fwd --global --project="${PROJECT_STAGING}" --format='value(portRange)')
[[ "${PORT_RANGE}" == "443-443" ]] \
  || fail "forwarding rule port range ${PORT_RANGE} != 443-443"
pass "INFRA-05: forwarding rule on 443"

# ─── CI-04 — WIF ───
# WIF pool ACTIVE in both projects (47-03-01)
for P in "${PROJECT_STAGING}" "${PROJECT_PROD}"; do
  S=$(gcloud iam workload-identity-pools describe github-actions --location=global --project="${P}" --format='value(state)' 2>/dev/null || echo NONE)
  [[ "${S}" == "ACTIVE" ]] || fail "WIF pool state ${S} in ${P} (expected ACTIVE)"
done
pass "CI-04: WIF pool ACTIVE in both projects"

# D-16 attribute condition restricts to NLM repo (T-47-02)
COND=$(gcloud iam workload-identity-pools providers describe github \
  --workload-identity-pool=github-actions \
  --project="${PROJECT_STAGING}" --location=global \
  --format='value(attributeCondition)')
[[ "${COND}" == *"${REPO_SLUG}"* ]] \
  || fail "WIF condition does not restrict to ${REPO_SLUG} (T-47-02)"
pass "CI-04 / T-47-02: attribute_condition locked to ${REPO_SLUG}"

# D-18 exact role matrix for github-actions-deployer (T-47-03)
ROLES=$(gcloud projects get-iam-policy "${PROJECT_STAGING}" \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions-deployer@${PROJECT_STAGING}.iam.gserviceaccount.com" \
  --format="value(bindings.role)" | sort | paste -sd ',')
EXPECTED_ROLES='roles/artifactregistry.writer,roles/run.admin'
[[ "${ROLES}" == "${EXPECTED_ROLES}" ]] \
  || fail "github-actions-deployer project-level roles = [${ROLES}], expected [${EXPECTED_ROLES}] (T-47-03)"
pass "CI-04 / T-47-03 / D-18: github-actions-deployer project roles exact"

# SA-scoped iam.serviceAccountUser on nlm-cloudrun-sa (D-18)
gcloud iam service-accounts get-iam-policy "nlm-cloudrun-sa@${PROJECT_STAGING}.iam.gserviceaccount.com" --format=json \
  | jq -r '.bindings[]? | select(.role=="roles/iam.serviceAccountUser") | .members[]' \
  | grep -q "github-actions-deployer@${PROJECT_STAGING}" \
  || fail "github-actions-deployer lacks iam.serviceAccountUser on nlm-cloudrun-sa (D-18)"
pass "CI-04 / D-18: iam.serviceAccountUser scoped on nlm-cloudrun-sa"

# Zero USER_MANAGED SA keys (47-03-03, CI-04)
USER_KEYS=$(gcloud iam service-accounts keys list --iam-account="github-actions-deployer@${PROJECT_STAGING}.iam.gserviceaccount.com" \
  --format='value(keyType)' | grep -c USER_MANAGED || true)
[[ "${USER_KEYS}" == "0" ]] \
  || fail "${USER_KEYS} USER_MANAGED keys exist on github-actions-deployer (CI-04 forbids)"
pass "CI-04: zero USER_MANAGED SA keys"

# wif-smoke.yml last run success (47-03-02)
if command -v gh >/dev/null 2>&1; then
  CONCLUSION=$(gh run list --workflow=wif-smoke.yml --limit 1 --json conclusion -q '.[0].conclusion' --repo "${REPO_SLUG}" 2>/dev/null || echo "none")
  [[ "${CONCLUSION}" == "success" ]] \
    || fail "wif-smoke.yml last run conclusion = ${CONCLUSION} (expected success; see D-19)"
  pass "CI-04 / D-19: wif-smoke.yml last run = success"
else
  info "gh CLI not available; skipping wif-smoke.yml run check (manually verify)"
fi

# ─── Cold-start probe ───
bash iac/cloudrun/scripts/coldstart-probe-staging.sh \
  || fail "cold-start probe failed"
pass "INFRA-04 SC#4: cold-start probe OK"

echo
echo "All Phase 47 assertions PASSED."
