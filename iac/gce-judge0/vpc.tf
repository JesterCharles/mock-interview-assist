// -----------------------------------------------------------------------------
// Networking — reference existing VPC + subnet via data sources (D-03).
//
// Both VMs share one VPC + subnet. We do NOT create a new VPC here because
// the app VM already exists on the project's default (or custom) network and
// importing a shared VPC into Terraform state is unnecessary risk for v1.4.
// Override var.vpc_network_name / var.vpc_subnet_name in tfvars if your
// project uses custom networking.
// -----------------------------------------------------------------------------

data "google_compute_network" "primary" {
  name = var.vpc_network_name
}

data "google_compute_subnetwork" "primary" {
  name   = var.vpc_subnet_name
  region = var.region
}
