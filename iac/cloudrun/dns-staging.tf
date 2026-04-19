# Phase 47 — iac/cloudrun/dns-staging.tf
# Source: 47-RESEARCH.md §Pattern 11; D-12 (orange cloud OFF for staging); D-21 (provider v4 — cloudflare_record, NOT cloudflare_dns_record).
# T-47-06 mitigation: proxied = false ensures Google's managed cert HTTP-01 validator reaches the LB IP directly, not a Cloudflare edge.
# T-47-09 mitigation: CLOUDFLARE_API_TOKEN stays in developer shell only (D-21); Zone.DNS.Edit scope on nextlevelmock.com zone; no Account-level perms.

# v4 schema: resource "cloudflare_record" with argument `value` (not v5's `content`).
# Future v5 migration will rename to cloudflare_dns_record + value→content (deferred).
resource "cloudflare_record" "staging" {
  count = var.env == "staging" ? 1 : 0

  zone_id = var.cf_zone_id # Cloudflare zone ID for nextlevelmock.com (staging.tfvars)
  name    = "staging"      # → staging.nextlevelmock.com (domain_name)
  type    = "A"
  value   = google_compute_global_address.nlm_staging_lb_ip[0].address
  ttl     = 300   # 5 minutes — consistent with DNS-03 cutover TTL pattern
  proxied = false # D-12 / T-47-06 — CRITICAL. Orange cloud OFF for staging.
  comment = "v1.5 Phase 47 — staging Cloud Run LB anycast IP (proxied=false is load-bearing; see T-47-06)"
}
