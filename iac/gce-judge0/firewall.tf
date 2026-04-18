// -----------------------------------------------------------------------------
// Firewall — internal-only per D-03.
//
// Judge0 port 2358 is reachable ONLY from the app VM's internal IP.
// No 0.0.0.0/0 ingress is permitted for Judge0 under any circumstance.
// GCP's default VPC firewall is deny-all for unspecified ingress; we rely on
// that to block anything not explicitly allowed below.
// -----------------------------------------------------------------------------

resource "google_compute_firewall" "judge0_from_app" {
  name        = "allow-judge0-from-app"
  network     = data.google_compute_network.primary.name
  description = "internal-only per D-03: allow port 2358 from app VM only"

  allow {
    protocol = "tcp"
    ports    = ["2358"]
  }

  // CRITICAL: internal-only per D-03. source_ranges is bound to the app VM's
  // internal IP as a /32. No public CIDRs. No 0.0.0.0/0. No external tags.
  source_ranges = ["${google_compute_instance.app.network_interface[0].network_ip}/32"]
  target_tags   = ["judge0"]

  direction = "INGRESS"
  priority  = 1000
}
