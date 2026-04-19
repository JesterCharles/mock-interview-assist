# Phase 47 — iac/cloudrun/loadbalancer-staging.tf
# Source: 47-RESEARCH.md §Patterns 2-7; D-08..D-11; T-47-04 mitigation (cert stuck → runbook poll).
# Chain: global IP → serverless NEG → backend service → URL map → managed SSL → target HTTPS proxy → global forwarding rule.
#
# NOTE: No port-80 HTTP→HTTPS redirect rule in Phase 47. Port 80 traffic simply isn't served.
# Phase 49 hardening may add an HTTP redirect if curl-friendly 301s are desired.

# ─── Pattern 2: Global static IP (D-11) ───
resource "google_compute_global_address" "nlm_staging_lb_ip" {
  count = var.env == "staging" ? 1 : 0

  project      = var.project_id
  name         = "nlm-staging-lb-ip"
  ip_version   = "IPV4"
  address_type = "EXTERNAL"
  description  = "Anycast IPv4 for staging HTTPS LB → nlm-staging Cloud Run (Phase 47)"
}

# ─── Pattern 3: Serverless NEG → Cloud Run service (regional resource) ───
resource "google_compute_region_network_endpoint_group" "nlm_staging_neg" {
  count = var.env == "staging" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-staging-neg"
  region                = var.region # us-central1
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.nlm_staging[0].name
  }
}

# ─── Pattern 4: Backend service (global, EXTERNAL_MANAGED) ───
# NOTE: balancing_mode is intentionally omitted — SERVERLESS NEG backends reject UTILIZATION/RATE.
resource "google_compute_backend_service" "nlm_staging_backend" {
  count = var.env == "staging" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-staging-backend"
  protocol              = "HTTPS"
  port_name             = "http"
  # timeout_sec not supported for Serverless NEG backends (Cloud Run timeout enforced at service level)
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.nlm_staging_neg[0].id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# ─── Pattern 5: URL map (single catch-all default) ───
resource "google_compute_url_map" "nlm_staging_urlmap" {
  count = var.env == "staging" ? 1 : 0

  project         = var.project_id
  name            = "nlm-staging-urlmap"
  default_service = google_compute_backend_service.nlm_staging_backend[0].id

  # D-10: no host_rule / path_matcher — single catch-all.
}

# ─── Pattern 6: Managed SSL cert (classic, not Certificate Manager) ───
# Pitfall 1 — cert goes PROVISIONING on create; transitions to ACTIVE in 10-60 min after:
#   (a) forwarding rule exists and answers :443
#   (b) DNS A record resolves var.domain_name to the LB IP
#   (c) Google's validation completes
# Runbook (README.md) documents the polling loop (T-47-04).
resource "google_compute_managed_ssl_certificate" "nlm_staging_cert" {
  count = var.env == "staging" ? 1 : 0

  project = var.project_id
  name    = "nlm-staging-ssl-cert"

  managed {
    domains = [var.domain_name] # "staging.nextlevelmock.com"
  }

  # Classic Managed SSL certs are immutable on domain change; create_before_destroy
  # is safer for future domain swaps.
  lifecycle {
    create_before_destroy = true
  }
}

# ─── Pattern 7a: Target HTTPS proxy ───
resource "google_compute_target_https_proxy" "nlm_staging_https_proxy" {
  count = var.env == "staging" ? 1 : 0

  project          = var.project_id
  name             = "nlm-staging-https-proxy"
  url_map          = google_compute_url_map.nlm_staging_urlmap[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.nlm_staging_cert[0].id]
}

# ─── Pattern 7b: Global forwarding rule on :443 ───
resource "google_compute_global_forwarding_rule" "nlm_staging_https_fwd" {
  count = var.env == "staging" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-staging-https-fwd"
  target                = google_compute_target_https_proxy.nlm_staging_https_proxy[0].id
  ip_address            = google_compute_global_address.nlm_staging_lb_ip[0].address
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
