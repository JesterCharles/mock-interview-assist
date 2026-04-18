# Phase 52: DNS Cutover + Zero-Downtime Validation + Kill Switch - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Phase 52 **executes the cutover** per the Phase 51 runbook: flips `nextlevelmock.com` A record from v0.1 GCE IP to prod Cloud Run LB IP, validates zero-downtime behavior for in-flight public-interview sessions, confirms `legacy.nextlevelmock.com` still serves v0.1, and commits the cutover log artifact. **v0.1 stays warm for 30 days** as rollback insurance.

**In scope:** Execute the DNS flip (terraform `apply` against `dns-prod.tf` with updated apex value, or manual Cloudflare API call per runbook), post-cutover verification (dig, curl, Supabase session check), in-flight session observation, cutover log artifact at `.planning/cutover-log-v1.5.md`, kill switch rehearsal (revert + re-cut for confidence), smoke tests across top user flows.

**Out of scope:** v0.1 GCE decommissioning (Phase 53, day-45 if no rollback), server-side prod data migration (nothing to migrate — public-interview sessions are ephemeral), Judge0 enablement (deferred to v1.6).

**HITL gate:** Phase 52 is **user-present only**. Cutover is irreversible in the sense that rollback = another DNS flip. Human presence required per `sync HITL` convention.

</domain>

<decisions>
## Implementation Decisions

### Cutover Execution (DNS-04)
- **D-01:** Cutover method: **Terraform-managed DNS change**. Update `iac/cloudrun/dns-prod.tf` apex record value from `var.v01_gce_ip` to `var.prod_cloudrun_lb_ip`. Run `terraform apply -var-file=prod.tfvars` targeting only the apex record: `terraform apply -target=cloudflare_record.apex`. This preserves the orange-cloud proxy setting.
- **D-02:** Alternative rollback: Single `terraform apply` swap back to v0.1, OR emergency: Cloudflare dashboard "Edit DNS record" → type back v0.1 IP → save (documented in DEPLOY.md kill-switch).
- **D-03:** TTL confirmed at 300s 24h prior (per Phase 51 D-03 / DEPLOY.md preflight). Actual propagation observed via `dig @1.1.1.1 nextlevelmock.com` polling.

### Zero-Downtime Validation (SUNSET-01, SUNSET-02)
- **D-04:** Pre-cutover: start a public-interview session on v0.1 (via `curl -X POST https://nextlevelmock.com/api/public/interview/start`); record session ID + first-question response.
- **D-05:** Execute cutover during that session (T-0).
- **D-06:** Continue the session through the agent endpoint (`POST /api/public/interview/agent` with the same session ID) — since session state lives in v0.1's local file storage + Supabase, and the A-record cache in the client's DNS resolver holds briefly, the request may still hit v0.1 via cached DNS. If it hits prod Cloud Run instead, the session will fail because prod doesn't have v0.1's local file state. **This is expected and documented** — zero-downtime means "no 502/5xx returned"; it does NOT mean "every pre-cutover session completes successfully on the post-cutover backend". Per the requirement wording ("session started before DNS propagation completes successfully"), the session completes IF the client's DNS cache still points at v0.1.
- **D-07:** Success definition for zero-downtime: (a) no 502/503 during cutover window (T-0 to T+5min), (b) new sessions after cutover work cleanly on prod, (c) at least one session started pre-cutover completes on v0.1 (documented proof). Failure of any = rollback trigger.
- **D-08:** Cutover log `cutover-log-v1.5.md` captures: T-0 timestamp, dig propagation times (every 30s for 5 min), curl status codes against both domains, session continuity test result, any anomalies. Committed to `.planning/` post-cutover.

### Kill Switch (DNS-04, SUNSET-04)
- **D-09:** Kill switch already exists as-documented per Phase 51 D-14 (DEPLOY.md §5 Rollback Procedure). Phase 52 **rehearses** the kill switch: at T+30min (after cutover stable), run `terraform apply -target=cloudflare_record.apex -var v01_gce_ip=<IP> -var prod_cloudrun_lb_ip=<IP>` swapping value back to v0.1, verify with dig + curl, then immediately re-cut to prod. Total rehearsal window ~10min.
- **D-10:** Rehearsal DURING cutover window is intentional — it proves the kill switch works while infrastructure is still warm. Public users who hit `nextlevelmock.com` during the 10-min rehearsal window land on v0.1, which is still serving correctly. No data loss.
- **D-11:** Alternative to terraform for rehearsal: a `scripts/kill-switch.sh` wrapper that calls Cloudflare API directly (faster, no TF state round-trip). Included in Phase 52 Plan 03.

### Sunset Window Tracking (SUNSET-01, SUNSET-02)
- **D-12:** Update `.planning/DEPLOY.md` post-cutover with an explicit "Sunset Window" section:
  - Day 0-14 = Phases 47-49 (staging live + load-tested + hardened)
  - Day 15-21 = Phase 52 cutover window (prod Cloud Run live)
  - Day 22-45 = 30-day rollback warm
  - Day 45 = Phase 53 decommission gate
- **D-13:** v0.1 GCE **stays warm** (services running, LB alive, SSL cert renewed). No throttling, no scaling-down. Cost accepted.
- **D-14:** Add uptime check on `legacy.nextlevelmock.com/api/health` (Phase 48 dashboard) to monitor v0.1 during the 30-day warm window.

### Smoke Tests Post-Cutover
- **D-15:** Run the abuse test from Phase 49 against `https://nextlevelmock.com/` (prod) with CODING_CHALLENGES_ENABLED=false verification; ensure still passing.
- **D-16:** Run a k6 mini-scenario (10 VU for 2 min) against prod immediately post-cutover to confirm no latency regressions vs staging baseline. This is a **light-touch** probe, not full baseline.
- **D-17:** Trainer login flow smoke: log in as trainer account, navigate to `/trainer`, verify roster loads (empty — prod Supabase is wiped clean per Phase 46). Associate-side: no associates exist, so skip. Public interview: start + complete one full automated interview end-to-end on prod.

### Claude's Discretion
- Exact minute-by-minute cutover timeline (T-0, T+1min, T+5min, T+30min, T+60min checkpoints — planner writes).
- Whether kill switch rehearsal uses terraform or `scripts/kill-switch.sh` — planner picks script (faster).
- Format of `cutover-log-v1.5.md` (table vs narrative — recommend narrative with timestamped log lines).
- Whether to send an email notification to ADMIN_EMAILS at T-0 and T+stable — recommend yes.

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` §DNS (DNS-04), §SUNSET (01, 02, 04)
- `.planning/ROADMAP.md` §Phase 52
- `.planning/phases/51-*/51-CONTEXT.md` (D-14 DEPLOY.md runbook — Phase 52 executes sections 3-4; D-01 record matrix)
- `.planning/DEPLOY.md` (rewritten by Phase 51; Phase 52 executes + amends)
- `.planning/phases/49-*/49-CONTEXT.md` (D-09 abuse test + D-01 k6 baseline — reused for post-cutover smoke)
- `.planning/phases/48-*/48-CONTEXT.md` (D-13 uptime check pattern — extend to legacy)

### External
- Cloudflare API: `PUT /zones/{id}/dns_records/{rid}` to modify A record
- Google Cloud Run: traffic splitting already handled in Phase 48 rollback-prod.yml
- `dig` command: `dig @1.1.1.1 +short nextlevelmock.com A` (against public resolver)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/abuse-test-all.ts` (Phase 49) — reruse for post-cutover prod smoke
- `loadtest/baseline.js` (Phase 49) — scale down to 10 VU / 2 min for light probe
- `rollback-prod.yml` (Phase 48) — Cloud Run traffic rollback (separate from DNS rollback)

### Established Patterns
- DNS via Cloudflare terraform provider; kill switch = either `terraform apply -target=...` OR a fast script

### Integration Points
- Phase 53 consumes `cutover-log-v1.5.md` for retro.
- Phase 53 decommissions v0.1 at day-45 gate.

</code_context>

<specifics>
## Specific Ideas

- User explicit: "zero-downtime" does NOT mean every in-flight session continues seamlessly — it means no hard 502/5xx, with documented proof at least one pre-cutover session completes cleanly.
- **Rehearsal during live window is intentional** — proves kill switch under realistic conditions.
- Sends email to ADMIN_EMAILS at T-0 + T+stable for audit trail.

</specifics>

<deferred>
## Deferred Ideas

- **Traffic shadowing / tee'ing** v0.1 → prod for stateful session replay — deferred; cost > value for v1.5.
- **Automated rollback trigger** based on metrics — deferred; human kills the switch.
- **Cross-region DR** — deferred; single region.
- **Session export from v0.1 → prod** — not applicable (ephemeral sessions only; no data).

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 52-dns-cutover-zero-downtime-validation-kill-switch*
*Context gathered: 2026-04-18 (auto mode)*
