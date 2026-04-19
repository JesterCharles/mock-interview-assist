# Phase 51 — iac/cloudrun/loadbalancer-prod.tf
# Plan 51-01 / D-08, D-09, D-10; mirrors Phase 47 loadbalancer-staging.tf.
#
# Chain: global IP → serverless NEG → backend service → URL map → managed SSL → target HTTPS proxy → global forwarding rule.
#
# D-09 CRITICAL: managed SSL cert lists BOTH `nextlevelmock.com` AND `www.nextlevelmock.com` in a
# single cert resource. Google validates each domain independently via HTTP-01 challenge:
#   - www half provisions once Plan 02 creates `www` A record pointing at the LB IP (immediate).
#   - apex half remains PENDING until Phase 52 flips the apex from v0.1 GCE to the LB IP.
# Plan 04 DEPLOY.md preflight Section 1.1 polls `managed.domainStatus` for both domains before cutover.
#
# NOTE: No port-80 HTTP→HTTPS redirect rule (same as staging). Port 80 traffic simply isn't served.

# ─── Pattern 2: Global static IP ───
resource "google_compute_global_address" "nlm_prod_lb_ip" {
  count = var.env == "prod" ? 1 : 0

  project      = var.project_id
  name         = "nlm-prod-lb-ip"
  ip_version   = "IPV4"
  address_type = "EXTERNAL"
  description  = "Anycast IPv4 for prod HTTPS LB → nlm-prod Cloud Run (Phase 51). Consumed by dns-prod.tf www record; apex flips to this IP in Phase 52."
}

# ─── Pattern 3: Serverless NEG → Cloud Run service (regional resource) ───
resource "google_compute_region_network_endpoint_group" "nlm_prod_neg" {
  count = var.env == "prod" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-prod-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.nlm_prod[0].name
  }
}

# ─── Pattern 4: Backend service (global, EXTERNAL_MANAGED) ───
# NOTE: balancing_mode omitted — SERVERLESS NEG backends reject UTILIZATION/RATE.
resource "google_compute_backend_service" "nlm_prod_backend" {
  count = var.env == "prod" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-prod-backend"
  protocol              = "HTTPS"
  port_name             = "http"
  # timeout_sec not supported for Serverless NEG backends (Cloud Run timeout enforced at service level)
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.nlm_prod_neg[0].id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# ─── Pattern 5: URL map (single catch-all default) ───
resource "google_compute_url_map" "nlm_prod_urlmap" {
  count = var.env == "prod" ? 1 : 0

  project         = var.project_id
  name            = "nlm-prod-urlmap"
  default_service = google_compute_backend_service.nlm_prod_backend[0].id
}

# ─── Pattern 6: Managed SSL cert (D-09 — apex + www) ───
# Classic managed cert (NOT Certificate Manager). Provisioning transitions from PROVISIONING → ACTIVE
# after each domain in `managed.domains` passes Google's HTTP-01 validation.
# T-51-02 mitigation: cert resource created in Phase 51 (not Phase 52) so www half has ≥14 days to provision.
# T-51-06 (accepted): apex half will remain PENDING until Phase 52 DNS flip; cert as a whole stays usable
# — Google LB serves any ACTIVE domain even if siblings are still PROVISIONING.
resource "google_compute_managed_ssl_certificate" "nlm_prod_cert" {
  count = var.env == "prod" ? 1 : 0

  project = var.project_id
  name    = "nlm-prod-ssl-cert"

  managed {
    domains = [
      "nextlevelmock.com",
      "www.nextlevelmock.com",
    ]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ─── Pattern 7a: Target HTTPS proxy ───
resource "google_compute_target_https_proxy" "nlm_prod_https_proxy" {
  count = var.env == "prod" ? 1 : 0

  project          = var.project_id
  name             = "nlm-prod-https-proxy"
  url_map          = google_compute_url_map.nlm_prod_urlmap[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.nlm_prod_cert[0].id]
}

# ─── Pattern 7b: Global forwarding rule on :443 ───
resource "google_compute_global_forwarding_rule" "nlm_prod_https_fwd" {
  count = var.env == "prod" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-prod-https-fwd"
  target                = google_compute_target_https_proxy.nlm_prod_https_proxy[0].id
  ip_address            = google_compute_global_address.nlm_prod_lb_ip[0].address
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
