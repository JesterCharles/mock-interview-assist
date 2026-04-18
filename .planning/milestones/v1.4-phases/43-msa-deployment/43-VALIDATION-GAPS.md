---
phase: 43-msa-deployment
audit_date: 2026-04-18
auditor: gsd-validate-phase (Opus 4.7 1M)
requirements: [IAC-01, IAC-02, IAC-03, IAC-04, IAC-05]
---

# Phase 43 Validation Gaps

## Summary

Phase 43 is an **infrastructure + CI/CD + docs** phase. Automatable validation
is already embedded in each plan's `<verify>` block and has been run. The
remaining gaps are intrinsically manual and gated behind
`DEPLOY-CHECKPOINT.md` (live GCP apply + VM bootstrap).

**Resolved / Already Green:** 6 automated checks (all re-run during this audit).

| Check | Command | Status |
|-------|---------|--------|
| IAC-04 unit tests | `npm run test -- --run scripts/push-judge0-metrics.test.mjs` | PASS (6/6) |
| IAC-01 terraform fmt | `cd infra/terraform && terraform fmt -check` | PASS |
| IAC-01 terraform validate | `terraform init -backend=false && terraform validate` | PASS |
| IAC-02 workflow YAML (pr-checks) | `node -e "require('js-yaml').load(...)"` | PASS |
| IAC-02 workflow YAML (deploy-app) | ditto | PASS |
| IAC-02 workflow YAML (deploy-judge0) | ditto | PASS |

Greps inside `<verify>` blocks (internal-only firewall marker, `/api/health`
probe, rollback block, `X-Auth-Token`, runbook 6-section keywords) also all
pass — confirmed via plan files themselves.

## Manual-Only Gaps (Cannot Be Automated in CI)

| Req | Gap | Why Manual |
|-----|-----|-----------|
| IAC-01 | `terraform apply` creates Judge0 VM; app VM imports with zero-diff | Requires live GCP auth + live VM inspection. Tracked in `DEPLOY-CHECKPOINT.md` Steps 1-9. |
| IAC-01 | Firewall `source_ranges` = [app VM internal IP/32] at runtime | Verified post-apply via `gcloud compute firewall-rules describe`. |
| IAC-02 | `app-v*` tag push actually deploys + health-check passes | Requires a real tag push + GCR push + SSH; cannot run in PR CI. |
| IAC-02 | `judge0-v*` tag push redeploys Judge0 + `/system_info` passes | Same — live Judge0 VM needed. |
| IAC-03 | Rollback fires on induced health failure | Requires chaos test against live VM; deferred to Phase 44 load test. |
| IAC-04 | Metrics land in Logs Explorer every 60s | Requires systemd timer on real Judge0 VM (Appendix B). |
| IAC-05 | Runbook playbooks rehearsed end-to-end | Human sign-off; append to `coding-stack.md` Review Log. |

## Recommendations

- Leave manual gaps open. They are covered by the `DEPLOY-CHECKPOINT.md`
  human-action list and the Phase 44 load test against the live stack.
- No further automated tests are warranted — the unit-testable surface
  (percentile math + payload shape) is already covered.
- Pipeline owner signs off these gaps as "manual-gated, accepted" when
  `DEPLOY-CHECKPOINT.md` Steps 1-9 complete.

## Files for Commit

- `.planning/phases/43-msa-deployment/43-VALIDATION-GAPS.md` (this file)
