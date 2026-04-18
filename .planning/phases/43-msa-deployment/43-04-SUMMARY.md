---
phase: 43-msa-deployment
plan: 04
subsystem: docs
tags: [runbook, operations, incident-response]
dependency-graph:
  requires: [plans 43-01, 43-02, 43-03]
  provides: [single-source-of-truth for ops]
  affects: [v1.4 readiness, monthly + quarterly review cadence]
tech-stack:
  added: []
  patterns: [tiered recovery procedures, explicit time-to-resolve estimates, append-only review log]
key-files:
  created:
    - docs/runbooks/coding-stack.md
  modified: []
decisions:
  - Six mandated sections per D-13 + three appendices (secrets setup, metrics install, deferred work)
  - All commands use literal placeholders (`$PROJECT`, `$JUDGE0_VM_NAME`) so operators must set env explicitly
  - Destructive commands (terraform taint, instances stop) segregated into separate code blocks with warnings
  - Included Phase 38 re-verify checklist inline in §2 for visibility
metrics:
  duration: ~5 min
  completed: 2026-04-18
  line_count: 510
---

# Phase 43 Plan 04: Coding Stack Runbook Summary

One-liner: 510-line ops runbook with architecture diagram, Judge0 patching
cadence, scale-up procedure, abuse response playbook, tiered queue-death
recovery, daily/weekly/monthly/quarterly checklist, and three appendices
covering secrets setup, metrics installation, and deferred v1.5+ work.

## Six Mandated Sections (D-13)

1. **Architecture Overview** — ASCII diagram of the 2-VM topology with
   firewall path, persistent disk, metrics → Logs Explorer → alert wiring.
   Includes committed sizing table.
2. **Judge0 Patching Cadence** — monthly GHSA review + 48h CVE SLA, step-by-step
   upgrade procedure, **Phase 38 re-verify checklist** (8 items, MUST
   complete before first prod submission), append-only Review Log.
3. **Scale-Up Procedure** — decision tree (queue vs disk vs p95), exact
   variable names in `variables.tf`, disruptive vs non-disruptive note,
   resize2fs command.
4. **Abuse Response Playbook** — triage query, rate-limit override via
   `.env.docker` sed, Supabase ban, nuclear Judge0 spin-down, recovery.
   Sandbox invariant reminder (enable_network=false, cgroup caps, runtime:
   runc).
5. **Queue-Death Recovery** — 3 tiers with explicit time estimates: worker
   restart (2 min) → full stack restart (5 min) → `terraform taint` + apply
   (20 min). Post-mortem required if Tier 3 fires.
6. **Ops Checklist** — daily/weekly/monthly/quarterly cadences with
   checkboxes and estimated durations.

## Appendices

- **A: GitHub Actions Secrets Setup** — full table of 9 secrets with source
  command / value hints.
- **B: Metrics Pusher Installation** — scp, env file at 0600, systemd
  service + timer, enable + verify, alert query setup (3 queries).
- **C: Deferred to v1.5** — staging/prod split, canary, multi-region, WIF.

## Cross-References Verified

- Plan 43-01 Terraform variable names (`judge0_machine_type`,
  `judge0_data_disk_size_gb`) appear verbatim in §3 (scale-up).
- Plan 43-02 workflow tag conventions (`app-v*`, `judge0-v*`) appear in §1
  (architecture) and §2 (patching upgrade procedure).
- Plan 43-03 metrics path (`push-judge0-metrics`, `/etc/judge0/metrics.env`)
  appears in Appendix B.
- D-12 alert thresholds (`queueDepth > 50`, `p95Ms > 15000`) appear verbatim
  in Appendix B.

## Alert Thresholds Documented

Per D-12 (console-configured, not Terraform):
- `jsonPayload.queueDepth > 50` sustained 5 min
- `jsonPayload.p95Ms > 15000` sustained 5 min
- `jsonPayload.status = "unreachable"` sustained 2 min (catastrophic)

## Deviations from Plan

None — runbook matches plan structure exactly; added a committed sizing
table in §1 for quick reference (minor additive improvement).

## Open Items for Phase 44 / v1.5

- **Phase 44 load test** — runs against the live stack after
  `DEPLOY-CHECKPOINT.md` completes. Alert thresholds should get a real-world
  validation pass.
- **Alert channel integration** (PagerDuty/Slack) — user choice, not in
  Terraform scope
- **Staging environment** (backlog 999.1) — v1.5
- **Canary/rolling deploys** — v1.5
- **Workload Identity Federation** (replace `GCP_SA_KEY` JSON) — v1.5
- **Managed instance groups / autoscaling** — v2.0

## Self-Check: PASSED

- `docs/runbooks/coding-stack.md`: FOUND (510 lines, ≥ 250 required)
- All 6 D-13 sections present (Architecture, Patching, Scale-Up, Abuse,
  Queue-Death, Ops Checklist)
- All reference greps PASS (Judge0, judge0-v, app-v, judge0_machine_type,
  push-judge0-metrics, queueDepth > 50, p95Ms > 15000)
- Commit 64d6966: FOUND on main
