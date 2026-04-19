# v0.1 GCE Decommission Checklist

**Target date:** 2026-06-02 (2026-04-18 cutover + 45 days)
**Executed by:** ______________________
**Executed on:** ______________________
**Runbook:** `.planning/DEPLOY.md` §9

This standalone checklist mirrors DEPLOY.md §9. Tick each box as you complete it. Commands live in `scripts/decommission-v01.sh` (commented out by default — uncomment one block per step).

## Preconditions

- [ ] 30-day warm window elapsed without rollback
- [ ] Prod Cloud Run uptime >= 99% over past 30 days
- [ ] No outstanding kill-switch requests
- [ ] Fresh prod Supabase `pg_dump` taken within 24h

## Teardown Steps

- [ ] **1.** Confirmed 30-day warm window elapsed without rollback
- [ ] **2.** Deleted legacy app VM (`nlm-app-vm`)
- [ ] **3.** Deleted legacy Judge0 VM (`judge0-vm`)
- [ ] **4.** Deleted legacy forwarding rule
- [ ] **5.** Released legacy static IP
- [ ] **6.** Removed `legacy.nextlevelmock.com` DNS record
- [ ] **7.** Removed legacy uptime check from Cloud Monitoring
- [ ] **8.** `iac/gce-judge0/` retained as v1.6 reference (per Phase 50 D-13)
- [ ] **9.** Updated `.planning/STATE.md` + `.planning/PROJECT.md` to remove v0.1 references

## Post-teardown

- [ ] Announced internally (email / Slack)
- [ ] v1.5 retro action item closed
- [ ] This file committed with sign-off name + date filled in
