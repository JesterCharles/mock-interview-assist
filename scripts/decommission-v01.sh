#!/bin/bash
# ============================================================================
# v0.1 GCE DECOMMISSION SCRIPT — DO NOT RUN WITHOUT RUNBOOK
# ============================================================================
# EXECUTE MANUALLY ON DAY 45 (2026-06-02)
# Runbook: .planning/DEPLOY.md §9
# Checklist: .planning/decommission-checklist-v01.md
#
# This file intentionally contains NO live gcloud commands. Every command is
# commented out. Operator:
#   1. Read the runbook §9 in full
#   2. Verify preconditions (30-day warm window, uptime >= 99%, backup taken)
#   3. For each step: uncomment the corresponding block, replace placeholders
#      (<v0.1-project-id>, <legacy-LB-rule-name>, <legacy-IP-name>), execute,
#      verify, re-comment before moving to next step.
#
# DO NOT pipe this file to bash. DO NOT `chmod +x` and run wholesale.
# ============================================================================

set -euo pipefail

echo "This script is a stub. Read .planning/DEPLOY.md §9 and uncomment step-by-step."
exit 1

# ----- Step 2: Delete legacy app VM -----
# gcloud compute instances delete nlm-app-vm \
#   --zone=us-central1-a \
#   --project=<v0.1-project-id> \
#   --quiet

# ----- Step 3: Delete legacy Judge0 VM -----
# gcloud compute instances delete judge0-vm \
#   --zone=us-central1-a \
#   --project=<v0.1-project-id> \
#   --quiet

# ----- Step 4: Delete legacy forwarding rule -----
# gcloud compute forwarding-rules delete <legacy-LB-rule-name> \
#   --region=us-central1 \
#   --project=<v0.1-project-id> \
#   --quiet

# ----- Step 5: Release legacy static IP -----
# gcloud compute addresses release <legacy-IP-name> \
#   --region=us-central1 \
#   --project=<v0.1-project-id>

# ----- Step 6: DNS record removal — use Cloudflare dashboard OR terraform -----
# (No gcloud command — remove `legacy.nextlevelmock.com` A record at Cloudflare.)

# ----- Step 7: Uptime check removal — use Cloud Monitoring console -----
# (No gcloud command — delete uptime check via https://console.cloud.google.com/monitoring/uptime)

# Step 1 (precondition verification), Step 8 (retention — no-op), Step 9 (docs PR)
# have no shell commands.
