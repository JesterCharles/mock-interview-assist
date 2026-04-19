#!/bin/bash
# ============================================================================
# Phase 53 verify gate
# ============================================================================
# Runs all 10 Phase 53 must-have checks. Exit 0 = phase complete.
# Runbook: .planning/phases/53-reflect-maintain-runbook-finalization-decommission-plan/
# ============================================================================

set -uo pipefail

FAIL=0
CHECK=0

pass() { CHECK=$((CHECK+1)); echo "  [OK]  $1"; }
fail() { CHECK=$((CHECK+1)); FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }

echo "Phase 53 verify gate — running 10 checks"
echo ""

# 1. PIPELINE-REFLECT.md covers v1.4 + v1.5
if [ -f .planning/PIPELINE-REFLECT.md ] \
   && grep -q "^## v1.4" .planning/PIPELINE-REFLECT.md \
   && grep -q "^## v1.5" .planning/PIPELINE-REFLECT.md; then
  pass "PIPELINE-REFLECT.md exists and covers v1.4 + v1.5"
else
  fail "PIPELINE-REFLECT.md missing or missing v1.4/v1.5 sections"
fi

# 2. PIPELINE-MAINTAIN.md has numeric health_score
if [ -f .planning/PIPELINE-MAINTAIN.md ] \
   && grep -qE '^health_score: [0-9]+(\.[0-9]+)?$' .planning/PIPELINE-MAINTAIN.md; then
  pass "PIPELINE-MAINTAIN.md exists with numeric health_score"
else
  fail "PIPELINE-MAINTAIN.md missing or health_score not numeric"
fi

# 3. Second-brain retro note
if [ -f "$HOME/second-brain/projects/nlm/notes/retro-2026-04-18.md" ]; then
  pass "second-brain retro-2026-04-18.md exists"
else
  fail "second-brain retro-2026-04-18.md missing"
fi

# 4. Second-brain milestone summary
if [ -f "$HOME/second-brain/projects/nlm/notes/milestone-v1.5-summary.md" ]; then
  pass "second-brain milestone-v1.5-summary.md exists"
else
  fail "second-brain milestone-v1.5-summary.md missing"
fi

# 5. DEPLOY.md §7 + §8 + §9
if [ -f .planning/DEPLOY.md ] \
   && grep -q "^## 7. Secret Rotation" .planning/DEPLOY.md \
   && grep -q "^## 8. Supabase Migration Promotion" .planning/DEPLOY.md \
   && grep -q "^## 9. v0.1 Sunset + Day-45 Teardown" .planning/DEPLOY.md; then
  pass "DEPLOY.md contains §7 + §8 + §9"
else
  fail "DEPLOY.md missing one or more of §7 / §8 / §9"
fi

# 6. decommission-checklist-v01.md with 9 numbered steps
if [ -f .planning/decommission-checklist-v01.md ]; then
  STEPS=$(grep -cE '^\- \[ \] \*\*[0-9]\.\*\*' .planning/decommission-checklist-v01.md || true)
  if [ "$STEPS" -eq 9 ]; then
    pass "decommission-checklist-v01.md exists with 9 numbered steps"
  else
    fail "decommission-checklist-v01.md has $STEPS steps (expected 9)"
  fi
else
  fail "decommission-checklist-v01.md missing"
fi

# 7. decommission-v01.sh stub — correct shebang, syntax-valid, no uncommented gcloud
if [ -f scripts/decommission-v01.sh ]; then
  SHEBANG=$(head -1 scripts/decommission-v01.sh)
  if [ "$SHEBANG" = "#!/bin/bash" ]; then
    if bash -n scripts/decommission-v01.sh 2>/dev/null; then
      UNCOMMENTED_GCLOUD=$(grep -cE '^gcloud ' scripts/decommission-v01.sh || true)
      if [ "$UNCOMMENTED_GCLOUD" -eq 0 ]; then
        pass "decommission-v01.sh: shebang OK, syntax OK, 0 uncommented gcloud lines"
      else
        fail "decommission-v01.sh: $UNCOMMENTED_GCLOUD uncommented gcloud lines"
      fi
    else
      fail "decommission-v01.sh: bash -n syntax check failed"
    fi
  else
    fail "decommission-v01.sh: wrong shebang ($SHEBANG)"
  fi
else
  fail "scripts/decommission-v01.sh missing"
fi

# 8. CLAUDE.md Cloud Run + no docker-compose-up
if grep -q "Cloud Run" CLAUDE.md \
   && [ "$(grep -c 'docker compose up' CLAUDE.md)" -eq 0 ]; then
  pass "CLAUDE.md mentions Cloud Run and removed 'docker compose up'"
else
  fail "CLAUDE.md: Cloud Run missing or 'docker compose up' still present"
fi

# 9. README.md links DEPLOY.md
if grep -q '\[DEPLOY.md\](.planning/DEPLOY.md)' README.md; then
  pass "README.md links to .planning/DEPLOY.md"
else
  fail "README.md does not link to .planning/DEPLOY.md"
fi

# 10. v1.6 seeds
if [ -f .planning/seeds/v1.6-seeds.md ]; then
  pass "v1.6-seeds.md exists"
else
  fail "v1.6-seeds.md missing"
fi

echo ""
echo "---"
echo "Ran $CHECK checks; $FAIL failed."
if [ "$FAIL" -eq 0 ]; then
  echo "Phase 53 gate: PASS"
  exit 0
else
  echo "Phase 53 gate: FAIL"
  exit 1
fi
