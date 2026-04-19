# SECURITY-v1.5 — Deferred Findings

Medium / low severity findings from the Phase 49 hardening pass. Owned by
`@JesterCharles`; tracked against future phases. See `.planning/SECURITY-v1.5.md`
for the full STRIDE register; this file is the explicit defer-and-schedule log.

## Deferred

| Severity | Threat ID | Finding | Owner | Target Phase | Notes |
|----------|-----------|---------|-------|--------------|-------|
| info | PHASE-49-FOLLOWUP-01 | v1.6 observability polish: correlate Prisma queries to `X-Session-ID` header so `fetch-supabase-query-count.sh` p50/p95 stops emitting TBD. | @JesterCharles | v1.6 observability phase | Non-blocking per D-08; load-test passes without it. |
| info | PHASE-49-FOLLOWUP-02 | Cloudflare Pro tier upgrade if sustained DoS observed post-cutover (T-49-DNS-04 accepted). | @JesterCharles | v1.6+ (as-needed) | Accepted risk at v1.5 per D-15. |
| info | PHASE-49-FOLLOWUP-03 | Cloud Armor / WAF evaluation once baseline traffic patterns are known. | @JesterCharles | v1.6 | Out of scope v1.5 per CONTEXT deferred list. |
| info | PHASE-49-FOLLOWUP-04 | Live abuse-test run once staging is deployed; may reclassify T-49-APP-02 / T-49-APP-03 / T-49-APP-06 from PENDING to mitigate or BLOCK. | @JesterCharles | Phase 49 resume (post-deploy) | Gate on Phase 48 deploy-staging.yml shipping first image. |
| info | PHASE-49-FOLLOWUP-05 | Live load-test run to populate `.planning/loadtest-baseline-v1.5.md` with real metrics (currently PENDING shell). | @JesterCharles | Phase 49 resume (post-deploy) | Same dependency as #04. |
| info | PHASE-49-FOLLOWUP-06 | `/cso` audit + `codex review` + `codex adversarial-review` on `.planning/SECURITY-v1.5.md`. | @JesterCharles | Phase 49 resume (fresh session) | UNATTENDED mode cannot invoke gstack or codex CLI. |

## Notes

- No medium or low severity findings have been promoted to this file from the initial STRIDE authoring — all register entries are either `mitigate`, `accept`, or `PENDING` (pending == awaiting live-artifact data).
- Once the PENDING entries resolve, any newly-discovered medium/low findings from /cso or codex reviews will be appended here with their severity and target phase.
