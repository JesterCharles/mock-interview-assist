# Phase 51 — iac/cloudrun/dns-prod.tf
# Plan 51-02 / D-01, D-02; clones the Phase 47 dns-staging.tf shape.
#
# =============================================================================
# CRITICAL NEGATIVE ASSERTION (T-51-01):
#   The apex record `nextlevelmock.com` points at the v0.1 GCE LB IP in THIS phase.
#   Phase 52 is the ONLY phase that changes `cloudflare_record.apex.value` to
#   google_compute_global_address.nlm_prod_lb_ip[0].address.
#   Do NOT modify `cloudflare_record.apex.value` in this plan.
# =============================================================================
#
# Records (D-01 matrix):
#   - apex    → var.v01_gce_ip               (existing; imported under TF mgmt)  proxied=true (orange-cloud ON)
#   - www     → nlm_prod_lb_ip[0].address    (NEW — triggers SSL provisioning)    proxied=false (required for HTTP-01)
#   - legacy  → var.v01_gce_ip               (NEW — 30-day rollback per SUNSET)   proxied=false
#   - staging → nlm_staging_lb_ip[0].address (Phase 47 — stays in dns-staging.tf) proxied=false
#
# All count-gated on env="prod" so staging apply is unaffected.

resource "cloudflare_record" "apex" {
  count = var.env == "prod" ? 1 : 0

  zone_id = var.cf_zone_id
  name    = "@" # root — nextlevelmock.com
  type    = "A"
  value   = var.v01_gce_ip # UNCHANGED from pre-Phase-51 state (T-51-01 negative assertion)
  ttl     = 1              # Cloudflare "Auto" (forced when proxied=true)
  proxied = true           # D-01 — orange-cloud ON (public users hit CF edge first)
  comment = "Phase 51 DNS-02 — apex still on v0.1 GCE; Phase 52 flips to google_compute_global_address.nlm_prod_lb_ip.address"
}

resource "cloudflare_record" "www" {
  count = var.env == "prod" ? 1 : 0

  zone_id = var.cf_zone_id
  name    = "www" # www.nextlevelmock.com
  type    = "A"
  value   = google_compute_global_address.nlm_prod_lb_ip[0].address
  ttl     = 300
  proxied = false # D-01 — orange-cloud OFF (required for Google managed-cert HTTP-01 challenge on www half)
  comment = "Phase 51 DNS-02 — www → prod Cloud Run LB; triggers SSL provisioning for Plan 01 cert (www half)"
}

resource "cloudflare_record" "legacy" {
  count = var.env == "prod" ? 1 : 0

  zone_id = var.cf_zone_id
  name    = "legacy" # legacy.nextlevelmock.com — 30-day rollback record (SUNSET-02/04)
  type    = "A"
  value   = var.v01_gce_ip
  ttl     = 300
  proxied = false # direct to v0.1 GCE LB (no CF proxying during rollback window)
  comment = "Phase 51 DNS-02 — legacy → v0.1 GCE for 30-day rollback window (SUNSET-03 tears down in Phase 53)"
}
