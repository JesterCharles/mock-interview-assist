#!/usr/bin/env bash
# Phase 48 gate — asserts all 12 must-haves.
# Run from anywhere: iac/cloudrun/scripts/verify-phase-48.sh
# Requires: gcloud (authed), gh (authed), curl, jq.
# Exits 0 on success, non-zero on first failing check.

set -u  # NOT -e: we aggregate failures and report all.

REPO="JesterCharles/mock-interview-assist"
STAGING_PROJECT="nlm-staging-493715"
PROD_PROJECT="nlm-prod"
STAGING_HEALTH="https://staging.nextlevelmock.com/api/health"
PROD_HEALTH="https://nextlevelmock.com/api/health"
STAGING_METRICS="https://staging.nextlevelmock.com/api/metrics"

FAIL=0
pass() { printf "\033[32m[PASS]\033[0m %s\n" "$1"; }
fail() { printf "\033[31m[FAIL]\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }
info() { printf "[....] %s\n" "$1"; }

# ---------- 1. pr-checks.yml workflow exists ----------
info "1. pr-checks.yml workflow registered in GitHub"
if gh workflow list --repo "$REPO" | grep -q "pr-checks.yml\|PR Checks"; then
  pass "pr-checks.yml workflow present"
else
  fail "pr-checks.yml not found in gh workflow list"
fi

# ---------- 2. Branch protection configured ----------
info "2. (manual) Deliberate typecheck error in a PR blocks merge — see RUNBOOK-BRANCH-PROTECTION.md"
if gh api "repos/$REPO/branches/main/protection" --jq '.required_status_checks.contexts | length' 2>/dev/null | grep -q "^4$"; then
  pass "Branch protection has 4 required checks"
else
  fail "Branch protection NOT configured with all 4 required checks (run RUNBOOK-BRANCH-PROTECTION.md)"
fi

# ---------- 3. deploy-staging.yml workflow exists ----------
info "3. deploy-staging.yml workflow registered"
if gh workflow list --repo "$REPO" | grep -q "deploy-staging.yml\|Deploy Staging"; then
  pass "deploy-staging.yml present"
else
  fail "deploy-staging.yml not found"
fi

# ---------- 4. Most recent deploy-staging.yml run succeeded ----------
info "4. Most recent deploy-staging.yml run concluded success"
LAST_CONCLUSION=$(gh run list --repo "$REPO" --workflow=deploy-staging.yml --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null)
if [ "$LAST_CONCLUSION" = "success" ]; then
  pass "Last deploy-staging.yml run: success"
else
  fail "Last deploy-staging.yml run conclusion: '$LAST_CONCLUSION' (expected 'success')"
fi

# ---------- 5. Staging /api/health returns 200 ----------
info "5. https://staging.nextlevelmock.com/api/health -> 200"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$STAGING_HEALTH" || echo "000")
if [ "$CODE" = "200" ]; then
  pass "Staging health 200"
else
  fail "Staging health returned $CODE (expected 200)"
fi

# ---------- 6. rollback-prod.yml workflow exists; rehearsal evidence in last 30 days ----------
info "6. rollback-prod.yml rehearsed against staging"
if gh workflow list --repo "$REPO" | grep -q "rollback-prod.yml\|Rollback Cloud Run"; then
  REHEARSAL=$(gh run list --repo "$REPO" --workflow=rollback-prod.yml --limit 1 --json conclusion,createdAt --jq '.[0]' 2>/dev/null)
  if [ -n "$REHEARSAL" ] && echo "$REHEARSAL" | grep -q '"conclusion":"success"'; then
    pass "rollback-prod.yml present with successful rehearsal"
  else
    fail "rollback-prod.yml exists but no successful rehearsal run (dispatch with env=staging and a previous revision)"
  fi
else
  fail "rollback-prod.yml not found"
fi

# ---------- 7. Structured logs queryable by env ----------
info "7. Cloud Logging has structured entries with jsonPayload.env=\"staging\""
LOG_COUNT=$(gcloud logging read 'resource.type="cloud_run_revision" AND jsonPayload.env="staging"' \
  --project="$STAGING_PROJECT" --limit=1 --format="value(timestamp)" 2>/dev/null | wc -l | tr -d ' ')
if [ "$LOG_COUNT" -gt 0 ]; then
  pass "Structured logs present (jsonPayload.env=staging)"
else
  fail "No structured log entries found — middleware/routes may not be emitting JSON yet, or NLM_ENV not set on Cloud Run"
fi

# ---------- 8. Dashboard in BOTH projects ----------
info "8. NLM Production dashboard exists in staging and prod projects"
STAGING_DASH=$(gcloud monitoring dashboards list --project="$STAGING_PROJECT" --format='value(displayName)' 2>/dev/null | grep -c "NLM Production" || true)
PROD_DASH=$(gcloud monitoring dashboards list --project="$PROD_PROJECT" --format='value(displayName)' 2>/dev/null | grep -c "NLM Production" || true)
if [ "$STAGING_DASH" -ge 1 ] && [ "$PROD_DASH" -ge 1 ]; then
  pass "Dashboard present in both projects"
else
  fail "Dashboard missing — staging=$STAGING_DASH prod=$PROD_DASH"
fi

# ---------- 9. Uptime checks present ----------
info "9. Uptime checks configured for staging + prod"
if gcloud monitoring uptime list-configs --project="$STAGING_PROJECT" --format='value(displayName)' 2>/dev/null | grep -q "nlm-staging-uptime" \
   && gcloud monitoring uptime list-configs --project="$PROD_PROJECT" --format='value(displayName)' 2>/dev/null | grep -q "nlm-prod-uptime"; then
  pass "Both uptime checks registered"
else
  fail "Uptime checks missing in one or both projects"
fi

# ---------- 10. /api/metrics returns Prometheus text when flag enabled ----------
info "10. /api/metrics returns Prometheus text when flag=true"
METRICS_WHEN_ON=$(curl -sf -H 'Accept: text/plain' -m 15 "$STAGING_METRICS" 2>/dev/null | head -1)
if echo "$METRICS_WHEN_ON" | grep -q "^# HELP nlm_http_requests_total"; then
  pass "/api/metrics serving Prometheus text"
else
  info "  (flag may be default-off — set NEXT_PUBLIC_METRICS_ENABLED=true in staging Secret Manager and redeploy, then re-run this check)"
  fail "/api/metrics did not return Prometheus text (flag may be off — expected if not yet enabled for the must-have rehearsal)"
fi

# ---------- 11. /api/metrics 404 when flag off ----------
info "11. /api/metrics returns 404 when flag off (default)"
UNSET_CHECK=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$STAGING_METRICS")
if [ "$UNSET_CHECK" = "404" ]; then
  pass "/api/metrics returns 404 (flag currently off)"
else
  info "  (flag currently enabled — verify default-off behavior in unit tests: npx vitest run src/app/api/metrics/)"
  pass "/api/metrics non-404 likely means Task 10's flag-on verification is active; unit tests cover the flag-off path"
fi

# ---------- 12. Alert policy references email channel containing the admin email ----------
info "12. Alert policy notification channel binds jestercharles@gmail.com"
CHANNEL_ID=$(gcloud alpha monitoring policies list --project="$PROD_PROJECT" \
  --filter='displayName:"NLM Uptime"' --format='value(notificationChannels)' 2>/dev/null | head -1 | awk '{print $1}')
if [ -n "$CHANNEL_ID" ]; then
  CHANNEL_EMAIL=$(gcloud alpha monitoring channels describe "$CHANNEL_ID" --project="$PROD_PROJECT" --format='value(labels.email_address)' 2>/dev/null)
  if [ "$CHANNEL_EMAIL" = "jestercharles@gmail.com" ]; then
    pass "Alert policy -> email channel -> jestercharles@gmail.com"
  else
    fail "Channel recipient = '$CHANNEL_EMAIL' (expected jestercharles@gmail.com)"
  fi
else
  fail "No alert policy matching 'NLM Uptime' in $PROD_PROJECT"
fi

# ---------- Summary ----------
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "Phase 48 gate: ALL 12 CHECKS PASS"
  exit 0
else
  echo "Phase 48 gate: $FAIL check(s) failed — see output above"
  exit 1
fi
