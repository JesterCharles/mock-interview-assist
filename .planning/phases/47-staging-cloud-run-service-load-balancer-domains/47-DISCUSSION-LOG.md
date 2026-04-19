# Phase 47: Staging Cloud Run Service + Load Balancer + Domains - Discussion Log

> Audit trail only. Decisions in `47-CONTEXT.md`.

**Date:** 2026-04-18
**Mode:** `--auto`
**Areas:** Cloud Run service shape, Load Balancer + SSL + DNS, WIF, module layout extensions, cold-start verification

---

## Cloud Run Resource

| Option | Selected |
|--------|----------|
| `google_cloud_run_v2_service` (provider v7; recommended) | ✓ |
| `google_cloud_run_service` (v1, legacy) |  |

**Rationale:** v2 is the supported surface and matches v7 provider idioms.

---

## SSL Certificate Product

| Option | Selected |
|--------|----------|
| `google_compute_managed_ssl_certificate` (classic, simple HCL) | ✓ (D-planner-discretion confirms) |
| `google_certificate_manager_certificate` (newer) |  |

**Rationale:** Classic suits staging; planner may switch if docs advise for prod. Both auto-renew.

---

## Cloudflare Proxy Mode

| Option | Selected |
|--------|----------|
| Orange-cloud OFF on staging; direct A record to LB IP | ✓ |
| Orange-cloud ON on staging |  |
| CNAME to LB hostname |  |

**Rationale:** Keep staging dumb-simple. Orange cloud = Phase 51 prod only.

---

## WIF Scope

| Option | Selected |
|--------|----------|
| Provision WIF in BOTH `nlm-staging-493715` and `nlm-prod` during Phase 47 | ✓ |
| Only staging now; prod in Phase 51 |  |

**Rationale:** WIF is one-time infra; doing both here keeps Phase 51 light. Cost = 0.

---

## Cloudflare Token Storage

| Option | Selected |
|--------|----------|
| Pass via developer env var during `terraform apply`; not persisted in Secret Manager | ✓ |
| Store in Secret Manager (new secret name) |  |

**Rationale:** Only needed at apply time, not runtime. Keeps Phase 45 secret list closed.

---

## Env-Var Mount Pattern

| Option | Selected |
|--------|----------|
| Mount all 13 secrets via `--set-secrets` even if Phase 47 doesn't use all | ✓ |
| Mount only what's immediately needed |  |

**Rationale:** Surface missing-value errors early; cheap and matches Cloud Run env mount shape.

---

## Cold-Start Probe

| Option | Selected |
|--------|----------|
| Dedicated `coldstart-probe-staging.sh` script — force scale-to-zero, curl, assert < 30s | ✓ |
| Inline in `verify-phase-45.sh` |  |

**Rationale:** Probe requires a `sleep 300` + instance-count watching; separate script keeps `verify-*` scripts idempotent.

---

## Deferred Ideas
- Cloud CDN, Cloud Armor WAF, regional LB, Certificate Manager, min-instances>0 on staging.
