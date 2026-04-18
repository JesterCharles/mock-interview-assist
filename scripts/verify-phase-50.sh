#!/usr/bin/env bash
# Phase 50 phase gate — verify every JUDGE-INTEG requirement is satisfied.
#
# Exits 0 only when all in-repo checks pass. External checks (gcloud Secret
# Manager, staging URL) SKIP rather than FAIL when their dependencies are
# not yet ready.
#
# Pre-reqs for full check (not required for exit 0):
#   - Plans 01-03 merged
#   - `bash scripts/populate-coding-flag-secrets.sh` has been run
#   - gcloud auth login done; access to both GCP projects
#
# Integration checks (#8, #9) require staging Cloud Run deployed (Phase 47).

set -euo pipefail

PASS=0
FAIL=0
SKIP=0

pass() { echo "  [PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
skip() { echo "  [SKIP] $1"; SKIP=$((SKIP+1)); }

echo "== Phase 50 Phase Gate =="
echo ""

echo "Check 1: Plan 01 artifacts"
if [ -f src/lib/codingFeatureFlag.ts ] && grep -q "isCodingEnabled" src/lib/codingFeatureFlag.ts; then
  pass "src/lib/codingFeatureFlag.ts exports isCodingEnabled"
else fail "isCodingEnabled helper missing"; fi
if grep -q "export class CodingFeatureDisabledError" src/lib/judge0Errors.ts; then
  pass "CodingFeatureDisabledError class present"
else fail "CodingFeatureDisabledError class missing"; fi

echo ""
echo "Check 2: Plan 02 server-side guards"
# status/route.ts must exist + reference isCodingEnabled (but does NOT use the
# 503 guard — it's the probe that returns the {enabled} body directly)
if [ -f "src/app/api/coding/status/route.ts" ] && grep -q "isCodingEnabled" "src/app/api/coding/status/route.ts"; then
  pass "status endpoint exists and reads flag"
else fail "status endpoint missing or not reading flag"; fi

# The 7 other routes that MUST call isCodingEnabled() for the 503 short-circuit
ROUTES=(
  "src/app/api/coding/submit/route.ts"
  "src/app/api/coding/challenges/route.ts"
  "src/app/api/coding/challenges/[id]/route.ts"
  "src/app/api/coding/attempts/route.ts"
  "src/app/api/coding/attempts/[id]/route.ts"
  "src/app/api/coding/bank/refresh/route.ts"
  "src/app/api/trainer/[slug]/coding/route.ts"
)
for r in "${ROUTES[@]}"; do
  if [ -f "$r" ] && grep -q "isCodingEnabled" "$r"; then
    pass "$r guarded"
  else fail "$r missing isCodingEnabled guard"; fi
done
if grep -q "isCodingEnabled\|CodingFeatureDisabledError" src/lib/judge0Client.ts; then
  pass "judge0Client.ts guarded"
else fail "judge0Client.ts missing guard"; fi
if grep -q "isCodingEnabled" src/lib/codingAttemptPoll.ts; then
  pass "codingAttemptPoll.ts guarded"
else fail "codingAttemptPoll.ts missing guard"; fi

echo ""
echo "Check 3: Plan 03 UI artifacts"
if [ -f src/components/coding/CodingComingSoon.tsx ] && grep -q "Coding Challenges Coming Soon" src/components/coding/CodingComingSoon.tsx; then
  pass "CodingComingSoon component present"
else fail "CodingComingSoon component missing"; fi
if grep -q "CodingComingSoon" src/app/coding/page.tsx; then
  pass "/coding/page.tsx renders ComingSoon"
else fail "/coding/page.tsx missing ComingSoon"; fi
if grep -q "CodingComingSoon" "src/app/coding/[challengeId]/page.tsx"; then
  pass "/coding/[challengeId]/page.tsx renders ComingSoon"
else fail "/coding/[challengeId]/page.tsx missing ComingSoon"; fi
if grep -q "FEATURE_DISABLED" src/components/coding/SubmitBar.tsx; then
  pass "SubmitBar surfaces FEATURE_DISABLED"
else fail "SubmitBar missing FEATURE_DISABLED dispatch"; fi

echo ""
echo "Check 4: IaC relabel"
if [ -d iac/gce-judge0 ] && [ ! -e infra/terraform ] && grep -q "REFERENCE TEMPLATE" iac/gce-judge0/README.md; then
  pass "iac/gce-judge0/ relabeled with banner; infra/terraform/ removed"
else fail "IaC relabel incomplete"; fi
if [ -f iac/cloudrun/judge0.tf.disabled ] && grep -q "## Activation" iac/cloudrun/judge0.tf.disabled; then
  pass "iac/cloudrun/judge0.tf.disabled stub committed with Activation section"
else fail "judge0.tf.disabled stub missing"; fi
# Terraform ignores .disabled — prove the glob does NOT match judge0.tf.disabled
# via bash: *.tf expansion excludes .disabled suffix.
shopt -s nullglob
TF_FILES=(iac/cloudrun/*.tf)
shopt -u nullglob
MATCHED=0
for f in "${TF_FILES[@]}"; do
  if [[ "$f" == *judge0.tf.disabled ]]; then MATCHED=1; fi
done
if [ "$MATCHED" -eq 0 ]; then
  pass ".disabled suffix excludes judge0.tf.disabled from *.tf glob"
else fail "judge0.tf.disabled leaked into *.tf glob"; fi

echo ""
echo "Check 5: Test suite green"
if npm run test -- src/lib/__tests__/codingFeatureFlag.test.ts > /dev/null 2>&1; then
  pass "codingFeatureFlag unit tests pass"
else fail "codingFeatureFlag unit tests fail"; fi
if npx tsc --noEmit > /dev/null 2>&1; then
  pass "tsc --noEmit clean"
else fail "tsc --noEmit has errors"; fi

echo ""
echo "Check 6: Secret Manager values (requires gcloud auth)"
if command -v gcloud > /dev/null 2>&1; then
  PROD_FLAG=$(gcloud secrets versions access latest --secret=CODING_CHALLENGES_ENABLED --project=nlm-prod 2>/dev/null || echo "__MISSING__")
  if [ "$PROD_FLAG" = "false" ]; then
    pass "nlm-prod CODING_CHALLENGES_ENABLED == 'false'"
  elif [ "$PROD_FLAG" = "__MISSING__" ]; then
    skip "nlm-prod secret not accessible (run populate-coding-flag-secrets.sh)"
  else fail "nlm-prod CODING_CHALLENGES_ENABLED is '$PROD_FLAG' (expected 'false')"; fi

  STAGING_FLAG=$(gcloud secrets versions access latest --secret=CODING_CHALLENGES_ENABLED --project=nlm-staging-493715 2>/dev/null || echo "__MISSING__")
  if [ "$STAGING_FLAG" = "true" ]; then
    pass "nlm-staging-493715 CODING_CHALLENGES_ENABLED == 'true'"
  elif [ "$STAGING_FLAG" = "__MISSING__" ]; then
    skip "nlm-staging-493715 secret not accessible (run populate-coding-flag-secrets.sh)"
  else fail "nlm-staging-493715 CODING_CHALLENGES_ENABLED is '$STAGING_FLAG' (expected 'true')"; fi
else
  skip "gcloud not installed — skip Secret Manager checks"
fi

echo ""
echo "Check 7: Integration (staging deployed — Phase 47 dependency)"
if curl -sf --max-time 5 "https://staging.nextlevelmock.com/api/coding/status" > /tmp/coding-status.json 2>/dev/null; then
  if command -v jq > /dev/null 2>&1; then
    ENABLED=$(jq -r '.enabled' /tmp/coding-status.json 2>/dev/null || echo "parse-error")
    if [ "$ENABLED" = "true" ]; then
      pass "staging /api/coding/status returns enabled:true (matches staging flag)"
    elif [ "$ENABLED" = "false" ]; then
      fail "staging /api/coding/status returns enabled:false (expected true for staging)"
    else
      fail "staging /api/coding/status returned invalid JSON: $ENABLED"
    fi
  else
    skip "jq not installed — cannot parse staging status response"
  fi
else
  skip "staging URL unreachable (Phase 47 not yet shipped)"
fi

echo ""
echo "== Summary: $PASS pass, $FAIL fail, $SKIP skip =="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
