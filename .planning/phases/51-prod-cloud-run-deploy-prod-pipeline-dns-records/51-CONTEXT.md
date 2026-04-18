# Phase 51: Prod Cloud Run + Deploy-Prod Pipeline + DNS Records - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Phase 51 **mirrors Phase 47 for prod** + adds the tag-triggered `deploy-prod.yml` pipeline + provisions **all DNS records** so Phase 52 is just a single Cloudflare A-record flip. Prod Cloud Run service is LIVE but **not yet serving `nextlevelmock.com`** — DNS still points at v0.1 GCE until Phase 52.

**In scope:** `iac/cloudrun/cloudrun-prod.tf`, `loadbalancer-prod.tf`, `dns-prod.tf`, `deploy-prod.yml` (parallel structure to staging), DNS records: `nextlevelmock.com` A → prod LB IP (orange-cloud ON), `www.nextlevelmock.com` A → prod LB IP, `staging.nextlevelmock.com` A → staging LB IP (already exists from Phase 47 — verify), `legacy.nextlevelmock.com` A → v0.1 GCE LB IP (NEW), `.planning/DEPLOY.md` cutover runbook, rollback validation run against prod.

**Out of scope:** Cutting `nextlevelmock.com` A record from v0.1 GCE to prod Cloud Run (Phase 52), decommissioning v0.1 (Phase 53), prod data migration (no data to migrate — prod Supabase is wiped empty per Phase 46).

**CRITICAL:** Phase 51 DNS record for `nextlevelmock.com` points at **v0.1 GCE LB IP (existing, unchanged)**. The A record for prod Cloud Run LB IP is `www.nextlevelmock.com` (orange-cloud OFF for now). Phase 52 flips the apex. This keeps public users on v0.1 until cutover.

</domain>

<decisions>
## Implementation Decisions

### DNS Record Matrix (DNS-01, DNS-02, DNS-03)
- **D-01:** Records at Cloudflare (apex `nextlevelmock.com` zone):
  | Name | Type | Value | Proxied | TTL |
  |------|------|-------|---------|-----|
  | `nextlevelmock.com` | A | v0.1 GCE LB IP (existing) | ON (orange-cloud) | Auto |
  | `www.nextlevelmock.com` | A | prod Cloud Run LB IP (new) | OFF | 300 |
  | `staging.nextlevelmock.com` | A | staging Cloud Run LB IP (Phase 47) | OFF | 300 |
  | `legacy.nextlevelmock.com` | A | v0.1 GCE LB IP | OFF | 300 |
- **D-02:** Phase 52 flip: `nextlevelmock.com` A record value → prod Cloud Run LB IP, proxied stays ON. `www` stays pointed at prod Cloud Run (no change at cutover). `legacy` stays pointed at v0.1 GCE for 30 days. `staging` unchanged.
- **D-03:** Prod apex TTL stays at Cloudflare "Auto" (300s) during v1.5. Phase 52 pre-step (T-24h) lowers to explicit 300s for safety.

### Prod Cloud Run (mirrors Phase 47 INFRA-04)
- **D-04:** Service name `nlm-prod` in project `nlm-prod`, region `us-central1`. Config identical to staging per INFRA-04 (min=0, max=10, cpu=1, mem=512Mi, timeout=300s). Reuses same Dockerfile image built by CI.
- **D-05:** Initial deploy uses the **latest staging-approved digest** from Phase 48's latest `deploy-staging.yml` run. Phase 51 Plan 01 task: capture the current staging digest + push to prod Artifact Registry + deploy to prod Cloud Run. This provides a validated rollback baseline for prod from day 1.
- **D-06:** Runtime SA `nlm-cloudrun-sa@nlm-prod.iam.gserviceaccount.com` (from Phase 45).
- **D-07:** All 13 secrets mounted (same pattern as staging); prod Secret Manager values were populated in Phase 46 Plan 03.

### Prod Load Balancer + SSL (INFRA-05)
- **D-08:** Identical structure to Phase 47's staging LB: global IP `nlm-prod-lb-ip`, global forwarding rule, HTTP(S) proxy, URL map, backend service with serverless NEG to Cloud Run.
- **D-09:** Managed SSL cert for both `nextlevelmock.com` + `www.nextlevelmock.com` (one cert, two domains in `managed.domains`). Cert must reach ACTIVE status BEFORE DNS cutover (Phase 52 blocker).
- **D-10:** Cloudflare orange-cloud ON for prod apex → Phase 52. In Phase 51 the apex still points at v0.1 GCE (already orange-proxied). `www` points at prod Cloud Run with proxied OFF (direct LB IP).

### deploy-prod.yml (CI-03)
- **D-11:** Clone `deploy-staging.yml` pattern. Triggers: `push` tags matching `v*` (SemVer). Steps:
  1. Build + push image to prod Artifact Registry (digest output)
  2. `prisma migrate deploy` against prod `DIRECT_URL` (from prod Secret Manager)
  3. `gcloud run deploy nlm-prod --image=<digest>` targeting prod project
  4. Smoke check: `curl -sf https://nlm-prod-<hash>.run.app/api/health` against the default Cloud Run URL (pre-DNS); 200/503 accepted
  5. On failure: email ADMIN_EMAILS + post commit status "failure"
- **D-12:** WIF auth uses prod-specific pool (`nlm-prod` project) — already provisioned in Phase 47 D-14. `PROD_PROJECT_NUMBER` GH repo variable set.
- **D-13:** Required approval: NO auto-deploy to prod without a git tag. First prod deploy in Phase 51 is a tag `v1.5.0-rc1` (release candidate; full v1.5.0 tagged in Phase 52).

### Cutover Runbook (DNS-03)
- **D-14:** `.planning/DEPLOY.md` — full operator runbook. Sections:
  1. **Pre-flight checklist (T-24h before cutover)**: SSL ACTIVE both domains, uptime check green 24h, staging load test signed off (Phase 49), SECURITY-v1.5.md signed off (Phase 49 HARD-03), prod Cloud Run revision matches latest staging digest, ADMIN_EMAILS channel verified (received a test email in last 7 days), Supabase prod project reachable from prod Cloud Run (manual curl from a revision), Cloudflare API token valid + zone access confirmed, team notified in advance.
  2. **T-24h pre-step**: Lower Cloudflare TTL on `nextlevelmock.com` to 300s.
  3. **Cutover step (T-0)**: Cloudflare A-record swap — `nextlevelmock.com` value `<v0.1 IP>` → `<prod Cloud Run LB IP>`. Orange-cloud stays ON.
  4. **Verification (T+5min)**: `dig +short nextlevelmock.com @1.1.1.1` returns new IP; `curl -sfI https://nextlevelmock.com/api/health` returns 200 from prod; Supabase session from the app returns valid session (test using trainer-token against `/api/associate/me`).
  5. **Rollback procedure**: Cloudflare A-record swap back to `<v0.1 IP>`; `gcloud run services update-traffic nlm-prod --to-revisions=<previous-digest>=100 --project=nlm-prod` (via `rollback-prod.yml`).
  6. **Zero-downtime invariant**: Any active session started on v0.1 completes on v0.1 (existing Cloudflare cache + in-flight requests continue). New sessions after cutover go to prod Cloud Run.
- **D-15:** DEPLOY.md is the source of truth; the old `.planning/DEPLOY.md` (v0.1 GCE version) is archived to `.planning/milestones/v1.4-DEPLOY.md` and overwritten.

### rollback-prod.yml Validation (Success Criterion 5)
- **D-16:** Rehearsal: Phase 51 Plan 04 runs `gh workflow run rollback-prod.yml -f env=prod -f revision=<previous-digest>`. Verify traffic shifts via `gcloud run services describe nlm-prod --format='value(status.traffic[0].revisionName)'`. Then re-pin latest: another rollback-prod run with revision=latest.

### Claude's Discretion
- Exact Cloudflare zone lookup process (API vs dashboard — recommend API for automation).
- Whether to use a single SSL cert for apex + www or two separate certs — recommend one cert with both domains.
- `DEPLOY.md` section ordering and verbosity — planner writes.
- Whether to pin prod deploy to a specific digest or use the latest staging digest — use latest staging.

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` §CI (CI-03), §DNS (DNS-01, DNS-02, DNS-03)
- `.planning/ROADMAP.md` §Phase 51
- `.planning/phases/47-*/47-CONTEXT.md` (full staging pattern to clone)
- `.planning/phases/47-*/47-RESEARCH.md` (HCL patterns, LB chain)
- `.planning/phases/48-*/48-CONTEXT.md` (CI pattern, rollback-prod.yml already wired in Phase 48 with prod-env support)
- `.planning/phases/50-*/50-CONTEXT.md` (prod Judge0 flag = false confirmed)
- `.planning/DEPLOY.md` (existing v0.1 doc — Phase 51 rewrites)
- `.planning/milestones/v1.4-*` (archival location pattern)

### External
- Cloud Run + LB + SSL cert docs (same as Phase 47 research)
- Cloudflare DNS record creation via API or Terraform (same provider as Phase 47 — reuse token pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `iac/cloudrun/cloudrun-staging.tf`, `loadbalancer-staging.tf`, `dns-staging.tf` — all clone for prod (new files with `-prod.tf` suffix, same shape).
- `.github/workflows/deploy-staging.yml` — clone as `deploy-prod.yml`, swap `staging` → `prod` env refs + trigger to `v*` tag.

### Established Patterns
- HCL file-per-concern (Phase 45 D-20 continues).
- Digest-only Cloud Run pulls + `lifecycle.ignore_changes` on service image (Phase 47 Plan 01).

### Integration Points
- Phase 52 cutover = single Cloudflare record change; Phase 51's work makes it trivial.
- Phase 53 includes v0.1 decommission + archive of DEPLOY.md old version.

</code_context>

<specifics>
## Specific Ideas

- User wants cutover to be a **single-action** record swap — Phase 51's job is to make that true.
- **30-day rollback window** starts at Phase 52 cutover. `legacy.nextlevelmock.com` must remain valid for that full window (per Phase 53 SUNSET-03).
- Tag `v1.5.0-rc1` for Phase 51's first prod deploy; `v1.5.0` reserved for post-cutover.

</specifics>

<deferred>
## Deferred Ideas

- **Prod canary / percentage-based rollout** — deferred; v1.5 is one-shot cutover, 100% traffic at T-0.
- **Blue/green with pre-prod + prod** — deferred; staging + prod is enough for solo-dev.
- **Cloudflare Page Rules for caching** — deferred; defaults OK.
- **Auto-rollback on health-check fail** — manual rollback only in v1.5.

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 51-prod-cloud-run-deploy-prod-pipeline-dns-records*
*Context gathered: 2026-04-18 (auto mode)*
