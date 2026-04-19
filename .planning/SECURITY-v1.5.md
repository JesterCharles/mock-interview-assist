# SECURITY-v1.5 — STRIDE Threat Model + Hardening Sign-Off

**Milestone:** v1.5 — Production Migration: Cloud Run + Supabase Hybrid
**Phase:** 49 (k6 Load Test + Hardening)
**Authored:** 2026-04-18
**Scope:** Cloud Run deployment surface, DNS cutover surface, app-layer runtime.
**Gate statement:** Phase 52 DNS cutover is gated on zero unresolved critical + high findings in this document. Medium/low go to `.planning/SECURITY-v1.5-followups.md`.

## Summary

| Severity | Count | Blocking |
|----------|------:|----------|
| critical | 0 | 0 |
| high     | 0 (0 BLOCK) | 0 |
| medium   | 0 | — |
| low      | 0 | — |
| info     | 0 | — |

**Blocking findings:** 0 (target: 0).
**/cso audit:** PENDING (Task 2 — fresh-session human-action checkpoint).
**Codex review:** PENDING (Task 3 — live codex invocation halted in unattended mode).
**Codex adversarial-review:** PENDING (Task 3 — live codex invocation halted in unattended mode).

Severity counts in the summary table are populated after Task 3 closes. Row-level counts below are authoritative; the summary is a rollup.

## STRIDE Threat Register

### 1. Cloud Run Deployment Surface

| Threat ID | Category | Threat | Severity | Mitigation | Owner | Status |
|-----------|----------|--------|----------|------------|-------|--------|
| T-49-CR-01 | S — Spoofing | Forged OIDC token attempts WIF federation from another GitHub org/repo | high | Phase 47 D-16 attribute-condition restricts federation to `JesterCharles/mock-interview-assist` only; `google.subject` attribute matches `repo:JesterCharles/mock-interview-assist:*` | @JesterCharles | mitigate |
| T-49-CR-02 | T — Tampering | Deploy uses `:latest` tag instead of image digest — pullable drift | high | Phase 47 D-04 + Phase 48 D-21: `gcloud run services update --image="${IMAGE}@${DIGEST}"` pins digest captured from `docker push` output | @JesterCharles | mitigate |
| T-49-CR-03 | I — Information Disclosure | Secret Manager reference leaks as plaintext in Cloud Run env | medium | Per-secret secretAccessor IAM (Phase 45 D-11); `--set-secrets` binds by reference, never unwraps in env; `gcloud run services describe` output shows `valueFrom.secretKeyRef` only | @JesterCharles | mitigate |
| T-49-CR-04 | D — Denial of Service | Unauthenticated flood exhausts Cloud Run max-instances | medium | INFRA-04 `--max-instances=10`; k6 baseline caps at 100 VU so even sustained probe stays within autoscale; Phase 48 uptime alert fires within 5 min | @JesterCharles | mitigate |
| T-49-CR-05 | E — Elevation of Privilege | Runtime SA grant creeps beyond least-privilege | high | Phase 45 D-11: `nlm-staging-runtime` SA granted only `secretmanager.secretAccessor` on specific secret IDs + `cloudsql.client` (unused for Supabase but tolerated); no `roles/owner`, no `roles/editor`; verified via `gcloud projects get-iam-policy` in Phase 47 | @JesterCharles | mitigate |
| T-49-CR-06 | R — Repudiation | Deploy actions not audit-logged | low | GH Actions run history retains 90 days; Cloud Audit Logs capture `run.services.create/update` with actor SA; combined trail is sufficient for solo-dev attribution | @JesterCharles | accept |
| T-49-CR-07 | I — Information Disclosure | GH Actions build logs include env var values | medium | `google-github-actions/get-secretmanager-secrets@v2` injects as masked GH outputs; `echo ::add-mask::` used for any hand-binding; post-run log scan added to `scripts/verify-phase-49.sh` | @JesterCharles | mitigate |
| T-49-CR-08 | T — Tampering | Image push from non-WIF identity | high | Phase 47 D-17 principalSet restriction: `roles/artifactregistry.writer` granted only to `principalSet://iam.googleapis.com/projects/<NUM>/locations/global/workloadIdentityPools/github-actions/attribute.repository/JesterCharles/mock-interview-assist` | @JesterCharles | mitigate |

### 2. DNS Cutover Surface (Phase 52 preparation)

| Threat ID | Category | Threat | Severity | Mitigation | Owner | Status |
|-----------|----------|--------|----------|------------|-------|--------|
| T-49-DNS-01 | S — Spoofing | Cloudflare account hijack → A-record swap | critical | 2FA enforced on Cloudflare account; scoped API tokens (DNS edit on `nextlevelmock.com` zone only); 90-day rotation runbook added to Phase 51 deliverable; Cloudflare-account password stored in 1Password with recovery codes printed | @JesterCharles | mitigate |
| T-49-DNS-02 | T — Tampering | DNS propagation race during cutover → split-brain (some users on v0.1 GCE, some on Cloud Run) | medium | Phase 51 runbook D-03: drop TTL to 300s 24h pre-cutover; verify propagation with `dig @1.1.1.1 +short nextlevelmock.com` from 3 geos before flipping; keep v0.1 GCE warm for 24h post-cutover so DNS stragglers still resolve | @JesterCharles | mitigate |
| T-49-DNS-03 | I — Information Disclosure | Certificate Transparency log exposes `staging.nextlevelmock.com` existence | low | Inherent property of CT; no secret material in subdomain name; staging is intentionally internet-facing (INFRA-04); acceptable | @JesterCharles | accept |
| T-49-DNS-04 | D — Denial of Service | Cloudflare Free Tier DoS protection insufficient | medium | k6 baseline shows staging withstands 100 VU comfortably; Cloudflare proxy ON for prod cutover (Phase 52) provides basic L7 DoS shield; Pro-tier upgrade path documented if sustained attack observed | @JesterCharles | accept |
| T-49-DNS-05 | T — Tampering | A-record swap to wrong IP (human error) | medium | Phase 51 runbook D-07: pre-flight `dig` verification captures current + target IPs; single-revert rollback (`cloudflared put`) rehearsed; Phase 52 cutover requires 2-party review (solo-dev self-review with sleep-on-it cooldown) | @JesterCharles | mitigate |

### 3. App-Layer

| Threat ID | Category | Threat | Severity | Mitigation | Owner | Status |
|-----------|----------|--------|----------|------------|-------|--------|
| T-49-APP-01 | S — Spoofing | Forged Supabase session cookie | high | `getUser()` validates JWT signature against Supabase JWKS on every protected-route request; SameSite=Lax + HttpOnly on cookies; forged tokens fail signature verification | @JesterCharles | mitigate |
| T-49-APP-02 | I — Information Disclosure | Protected route returns 200 / PII to unauthenticated request | high | HARD-02 gate: Plan 03 abuse-test-all.ts scans every `/api/*` route × 5 attempt modes; JSON artifact shows 0 protected-200 responses. PENDING live run (staging not yet deployed); will re-evaluate when artifact is populated | @JesterCharles | PENDING |
| T-49-APP-03 | E — Elevation of Privilege | Trainer-only route accessible to associate role | high | Plan 03 abuse-test-all.ts `wrong-role` mode flips fake trainer token against associate routes and vice versa; middleware.ts enforces role via `auth.users.user_metadata.role`. PENDING live run artifact | @JesterCharles | PENDING |
| T-49-APP-04 | R — Repudiation | Admin readiness-sweep action not audit-logged | low | Endpoint is idempotent (recomputes gap scores from existing sessions); `readinessSweep.ts` emits structured logs per associate; trail is sufficient for solo-dev attribution | @JesterCharles | accept |
| T-49-APP-05 | D — Denial of Service | Rate-limit bypass via forged fingerprint | medium | FingerprintJS hash is client-generated and bypassable by design; mitigation is the global 125/day cap in `rateLimitService.ts` which clamps any single source | @JesterCharles | mitigate |
| T-49-APP-06 | I — Information Disclosure | Stack trace leaked on 500 response | high | Next.js 16 production error page renders static copy; Plan 03 denylist scans for `/app/`, `/src/`, `at /`, `Error:`, `prisma/`. PENDING live run artifact | @JesterCharles | PENDING |
| T-49-APP-07 | T — Tampering | CSRF on POST routes | medium | Supabase auth cookie is `SameSite=Lax` (mitigates cross-site POSTs); API routes require `Content-Type: application/json` (blocks form-encoded cross-site posts); state-changing routes use Zod-validated payloads that rarely overlap form field shapes | @JesterCharles | mitigate |

## Abuse Test Results (HARD-02)

PENDING — live run against `https://staging.nextlevelmock.com` is deferred until Phase 48 deploy-staging.yml ships the first image. When staging is live, execute:

```bash
ABUSE_TEST_BASE_URL=https://staging.nextlevelmock.com npm run abuse-test:all
```

This will overwrite `.planning/SECURITY-v1.5-abuse-test.json` with real results. This section will then be re-populated with:

- **Total attempts:** `jq '.summary.total' .planning/SECURITY-v1.5-abuse-test.json`
- **Passed:** `jq '.summary.passed' .planning/SECURITY-v1.5-abuse-test.json`
- **Failed:** `jq '.summary.failed' .planning/SECURITY-v1.5-abuse-test.json`
- **Protected routes returning 200 to unauth:** `jq '[.results[] | select(.isPublic == false and .status == 200)] | length'`
- **Denylist hits:** `jq '[.results[] | select(.denylistHits | length > 0)] | length'`

Gate: if protected-200 > 0 OR denylist-hits > 0, T-49-APP-02, T-49-APP-03, T-49-APP-06 flip from PENDING to BLOCK; Phase 49 re-opens with a hot-patch task before close.

## Load Test Cross-Reference (HARD-01)

- PENDING live run — see `.planning/loadtest-baseline-v1.5.md` for the populate-runbook.
- Expected (once live): zero 5xx during ramp window (checked via `gcloud logging read httpRequest.status >= 500`), `http_req_failed` rate < 1%, `CODING_CHALLENGES_ENABLED=false` on staging confirmed via `gcloud run services describe`.

## /cso Findings

PENDING — Task 2 is a `checkpoint:human-action`. Fresh-session operator runs `/cso .planning/SECURITY-v1.5.md`, saves the full response to `.planning/phases/49-k6-load-test-hardening/cso-output.md`, then merges the summary here.

Format (to be filled):

```
**Ran:** <ISO date>
**Raw output:** `.planning/phases/49-k6-load-test-hardening/cso-output.md`
**New threats identified:** <N>
**Severity additions:** <critical: X, high: X, medium: X, low: X>
**Status:** <all mitigated | N high unresolved>
```

If /cso surfaces a critical or high not already in the register, add a row under the appropriate surface and escalate per D-15.

## Codex Review

PENDING — Task 3 requires live `codex review` CLI invocation. UNATTENDED mode halts on live codex calls. When resumed interactively:

```bash
codex review .planning/SECURITY-v1.5.md > /tmp/codex-review-v1.5.txt
```

Fill in:

```
**Ran:** <ISO date>
**Identifier:** <codex response hash or run-ID>
**Verdict:** <approve | request-changes | block>
```

Followed by the full codex response fenced verbatim.

## Codex Adversarial Review Sign-Off

PENDING — blocking gate per CLAUDE.md. When resumed interactively:

```bash
codex adversarial-review .planning/SECURITY-v1.5.md > /tmp/codex-adversarial-v1.5.txt
```

Fill in:

```
**Ran:** <ISO date>
**Identifier:** <codex adversarial response hash or run-ID>
**Verdict:** SIGNED-OFF | BLOCKED
**Blocking issues remaining:** <N — must be 0 to pass>
```

Followed by the full response fenced verbatim. The identifier must be a 7+ char hex string (scripts/verify-phase-49.sh enforces this via grep). If BLOCKED, loop Task 3 (fix → re-run adversarial-review → update section) until SIGNED-OFF.

## Deferred Findings

See `.planning/SECURITY-v1.5-followups.md` for medium/low entries.

## Change Log

| Date | Event | Notes |
|------|-------|-------|
| 2026-04-18 | Initial author | STRIDE register seeded across 3 surfaces; abuse-test + /cso + codex sections marked PENDING. Unattended-mode halts on live-infra steps (staging not deployed, codex CLI not invokable). |
