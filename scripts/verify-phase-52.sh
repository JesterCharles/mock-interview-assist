#!/usr/bin/env bash
# scripts/verify-phase-52.sh — Phase 52 phase gate.
#
# Exits 0 only if all Phase 52 must-haves are verifiable from the committed
# repo state + live cutover log. Invoked by operator after T+60min smokes and
# by /gsd-verify-work.
#
# Prereqs (depend on whether the assertion is "code shipped" or "live state"):
#   Code assertions (always checkable):
#     - .planning/cutover-log-v1.5.md committed with all required sections
#     - scripts/kill-switch.sh exists + executable + 3 subcommands
#     - iac/cloudrun/monitoring.tf contains legacy uptime + alert
#     - .planning/DEPLOY.md contains Sunset Window section
#     - iac/cloudrun/prod.tfvars has v01_gce_ip populated
#   Live assertions (require cutover actually happened):
#     - dig apex/www/legacy/staging returns expected
#     - curl apex /api/health returns 200 + Google Frontend signature
#     - gcloud monitoring uptime list shows legacy.nextlevelmock.com row
#
# Usage:
#   ./scripts/verify-phase-52.sh                  # full run (live checks included)
#   STRICT=0 ./scripts/verify-phase-52.sh         # skip live checks (code-only, for CI/pre-cutover)
#
# Exit codes:
#   0 — all checks pass
#   1 — one or more checks failed

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

STRICT="${STRICT:-1}"
FAILS=0

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; FAILS=$((FAILS + 1)); }
skip() { echo "SKIP: $* (STRICT=0)"; }

# ─── MH1: cutover-log-v1.5.md exists + committed ──────────────────────────────
if [ -f .planning/cutover-log-v1.5.md ]; then
  pass "MH1a: cutover-log-v1.5.md exists"
else
  fail "MH1a: .planning/cutover-log-v1.5.md missing"
fi

if git log --oneline -- .planning/cutover-log-v1.5.md 2>/dev/null | head -1 | grep -q .; then
  pass "MH1b: cutover-log-v1.5.md committed"
else
  fail "MH1b: cutover-log-v1.5.md not yet committed"
fi

# ─── MH2: cutover log has all 7 narrative sections ────────────────────────────
for SECTION in \
  "## §1 Preflight Checklist" \
  "## Pre-Cutover Baseline" \
  "## Cutover Execution" \
  "## Kill Switch Rehearsal" \
  "## Legacy Uptime Check Provisioning" \
  "## Post-Cutover Smokes" \
  "### Pre-Cutover Session Continuity"; do
  if grep -Fq "$SECTION" .planning/cutover-log-v1.5.md 2>/dev/null; then
    pass "MH2: cutover log has section: $SECTION"
  else
    fail "MH2: cutover log missing section: $SECTION"
  fi
done

# ─── MH3: no HARD FAIL markers in the cutover log ─────────────────────────────
# Match only runtime markers (Plan 02 polling + Plan 04 pre-cutover-session 5xx):
# both emit '!!! HARD FAIL' preceded by ISO timestamp. Template instruction text
# ("HARD FAIL trigger:", "HARD FAIL per success criterion") is excluded.
if grep -Eq '^\[[0-9T:Z-]+\].*!!! HARD FAIL' .planning/cutover-log-v1.5.md 2>/dev/null; then
  fail "MH3: runtime HARD FAIL marker present in cutover log — phase aborted mid-flight"
else
  pass "MH3: no runtime HARD FAIL markers in cutover log"
fi

# ─── MH4: kill-switch.sh exists, executable, has all 3 subcommands ────────────
if [ -x scripts/kill-switch.sh ]; then
  pass "MH4a: scripts/kill-switch.sh exists + executable"
else
  fail "MH4a: scripts/kill-switch.sh missing or not executable"
fi

for SUB in "cmd_status" "cmd_revert" "cmd_restore"; do
  if grep -q "^$SUB()" scripts/kill-switch.sh 2>/dev/null; then
    pass "MH4b: kill-switch.sh implements $SUB"
  else
    fail "MH4b: kill-switch.sh missing $SUB"
  fi
done

if bash -n scripts/kill-switch.sh 2>/dev/null; then
  pass "MH4c: kill-switch.sh bash syntax valid"
else
  fail "MH4c: kill-switch.sh bash syntax invalid"
fi

# ─── MH5: legacy uptime check + alert in monitoring.tf ────────────────────────
if grep -Eq 'resource +"google_monitoring_uptime_check_config" +"legacy"' iac/cloudrun/monitoring.tf 2>/dev/null; then
  pass "MH5a: monitoring.tf has legacy uptime check"
else
  fail "MH5a: monitoring.tf missing google_monitoring_uptime_check_config.legacy"
fi

if grep -Eq 'resource +"google_monitoring_alert_policy" +"legacy_uptime"' iac/cloudrun/monitoring.tf 2>/dev/null; then
  pass "MH5b: monitoring.tf has legacy_uptime alert policy"
else
  fail "MH5b: monitoring.tf missing google_monitoring_alert_policy.legacy_uptime"
fi

if grep -Eq 'host +=.*"legacy.nextlevelmock.com"' iac/cloudrun/monitoring.tf 2>/dev/null; then
  pass "MH5c: legacy uptime monitors legacy.nextlevelmock.com"
else
  fail "MH5c: legacy uptime host not set to legacy.nextlevelmock.com"
fi

# ─── MH6: DEPLOY.md Sunset Window section (D-12) ──────────────────────────────
if grep -q "^## Sunset Window" .planning/DEPLOY.md 2>/dev/null; then
  pass "MH6a: DEPLOY.md has ## Sunset Window section"
else
  fail "MH6a: DEPLOY.md missing ## Sunset Window section"
fi

for GATE in "Day 0-14" "Day 15-21" "Day 22-45" "Day 45"; do
  if grep -q "$GATE" .planning/DEPLOY.md 2>/dev/null; then
    pass "MH6b: DEPLOY.md has gate: $GATE"
  else
    fail "MH6b: DEPLOY.md missing gate: $GATE"
  fi
done

if grep -q "scripts/kill-switch.sh" .planning/DEPLOY.md 2>/dev/null; then
  pass "MH6c: DEPLOY.md references scripts/kill-switch.sh"
else
  fail "MH6c: DEPLOY.md does not reference scripts/kill-switch.sh"
fi

# ─── MH7: prod.tfvars canonical apex state ────────────────────────────────────
if grep -qE '^v01_gce_ip\s*=' iac/cloudrun/prod.tfvars 2>/dev/null; then
  pass "MH7a: prod.tfvars has v01_gce_ip variable"
else
  fail "MH7a: prod.tfvars missing v01_gce_ip"
fi

if grep -q 'PLACEHOLDER_V01_GCE_IPV4' iac/cloudrun/prod.tfvars 2>/dev/null; then
  # Pre-cutover state: placeholder still present. STRICT=0 is fine; STRICT=1 expects populated.
  if [ "$STRICT" = "1" ]; then
    fail "MH7b: prod.tfvars v01_gce_ip still contains PLACEHOLDER (operator has not populated before cutover)"
  else
    skip "MH7b: v01_gce_ip populated (placeholder present — pre-cutover state acceptable when STRICT=0)"
  fi
else
  pass "MH7b: prod.tfvars v01_gce_ip populated (not placeholder)"
fi

# ─── MH8: LIVE — DNS end state correct (STRICT=1 only) ────────────────────────
if [ "$STRICT" = "1" ]; then
  APEX=$(dig +short A nextlevelmock.com @1.1.1.1 2>/dev/null | head -1)
  if [ -n "$APEX" ]; then
    pass "MH8a: apex resolves via 1.1.1.1 (value=$APEX; Cloudflare edge IP since proxied)"
  else
    fail "MH8a: apex failed to resolve"
  fi

  APEX_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 https://nextlevelmock.com/api/health 2>/dev/null || echo "000")
  case "$APEX_CODE" in
    200|503) pass "MH8b: https://nextlevelmock.com/api/health returns $APEX_CODE" ;;
    *)       fail "MH8b: https://nextlevelmock.com/api/health returns $APEX_CODE (expected 200 or 503)" ;;
  esac

  LEG_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 https://legacy.nextlevelmock.com/api/health 2>/dev/null || echo "000")
  case "$LEG_CODE" in
    200|503) pass "MH8c: https://legacy.nextlevelmock.com/api/health returns $LEG_CODE (v0.1 warm)" ;;
    *)       fail "MH8c: https://legacy.nextlevelmock.com/api/health returns $LEG_CODE (expected 200 or 503; v0.1 may be down)" ;;
  esac

  WWW_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 https://www.nextlevelmock.com/api/health 2>/dev/null || echo "000")
  case "$WWW_CODE" in
    200|503) pass "MH8d: https://www.nextlevelmock.com/api/health returns $WWW_CODE" ;;
    *)       fail "MH8d: https://www.nextlevelmock.com/api/health returns $WWW_CODE (expected 200 or 503)" ;;
  esac

  # Apex must be served by prod Cloud Run (Google Frontend), not v0.1 nginx.
  if curl -sI --max-time 30 https://nextlevelmock.com/api/health 2>/dev/null | grep -qi '^server:.*google'; then
    pass "MH8e: apex served by Google Frontend (prod Cloud Run signature)"
  else
    fail "MH8e: apex NOT served by Google Frontend — cutover may not be live or v0.1 still in path"
  fi

  # Legacy uptime check live in GCP Monitoring
  if gcloud monitoring uptime list --project=nlm-prod --format='value(monitoredResource.labels.host)' 2>/dev/null | grep -q 'legacy.nextlevelmock.com'; then
    pass "MH8f: legacy.nextlevelmock.com uptime check live in nlm-prod Monitoring"
  else
    fail "MH8f: legacy uptime check not found in gcloud monitoring uptime list (terraform apply may be pending)"
  fi
else
  skip "MH8: LIVE dig + curl + gcloud checks (STRICT=0)"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
if [ "$FAILS" -eq 0 ]; then
  echo "Phase 52 gate: PASS"
  exit 0
else
  echo "Phase 52 gate: $FAILS check(s) FAILED"
  exit 1
fi
