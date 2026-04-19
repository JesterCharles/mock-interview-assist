# Phase 47 — iac/cloudrun/cloudrun-staging.tf
# Source: 47-RESEARCH.md §Pattern 1; D-01..D-07; T-47-05 / T-47-07 / T-47-10 mitigations.
#
# NOTE: No vpc_access block. Supabase pooler (6543) and direct URL (5432) are PUBLIC endpoints
# reachable from Cloud Run's default ALL_TRAFFIC egress. Adding a VPC connector would require
# a subnet + NAT + recurring cost and is unnecessary (Pitfall 6).
#
# NOTE: Staging uses count = var.env == "staging" ? 1 : 0 because this file is not yet applied
# against nlm-prod (Phase 51 adds cloudrun-prod.tf with a mirrored resource).

resource "google_cloud_run_v2_service" "nlm_staging" {
  count = var.env == "staging" ? 1 : 0

  project  = var.project_id
  name     = "nlm-staging" # D-01
  location = var.region    # us-central1 (D-01)

  ingress             = "INGRESS_TRAFFIC_ALL" # D-02; LB still fronts via 443 forwarding rule
  deletion_protection = false                 # staging; prod flips to true in Phase 51

  template {
    service_account = google_service_account.cloudrun.email # D-05 — nlm-cloudrun-sa

    scaling {
      min_instance_count = 0  # D-02 / INFRA-04
      max_instance_count = 10 # D-02 / INFRA-04
    }

    timeout = "300s" # D-02 / INFRA-04

    containers {
      # D-04: digest-only pull. Pitfall 2 / T-47-05 / T-47-07: image is ignored after initial create.
      # Phase 48 CI runs `gcloud run deploy --image=...@sha256:<new>` and TF must not revert it.
      image = "${var.region}-docker.pkg.dev/${var.project_id}/nlm-app/nlm-app@${var.initial_image_digest}"

      resources {
        limits = {
          cpu    = "1"     # D-02 / INFRA-04
          memory = "512Mi" # D-02 / INFRA-04
        }
        cpu_idle          = true # scale-to-zero CPU throttling (default, explicit for clarity)
        startup_cpu_boost = true # extra CPU during cold start — helps Next.js + Prisma first-request (Pitfall 7)
      }

      ports {
        container_port = 8080 # Cloud Run sets PORT=8080 at runtime; Next.js standalone binds $PORT (D-03).
        # NOTE: The Dockerfile's ENV PORT=3000 is overridden by Cloud Run's injected PORT=8080.
      }

      # D-06: all 13 Phase 45 secrets mounted as env vars via Secret Manager binding.
      # T-47-10 mitigation: version = "latest" means `gcloud secrets versions add ...` rotations
      # take effect on the NEXT revision (runbook must `gcloud run services update --update-secrets=...:latest`
      # to force a new revision after rotation).
      dynamic "env" {
        for_each = toset(var.secret_names)
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = env.value # Phase 45 created each secret with secret_id == env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  # T-47-07 / Pitfall 2 — CRITICAL.
  # Without this, `terraform apply` after a Phase 48 CI deploy reverts the service image
  # to var.initial_image_digest and wipes the CI-deployed revision.
  # Source: https://github.com/hashicorp/terraform-provider-google/issues/13435
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.cloudrun_accessor, # nlm-cloudrun-sa must be able to read secrets before first boot
  ]
}

# D-02 public invoker — v2 API requires EXPLICIT allUsers IAM (Pitfall 4).
# Without this resource, the LB reaches the service but every request returns 403.
resource "google_cloud_run_v2_service_iam_member" "public_invoke" {
  count = var.env == "staging" ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.nlm_staging[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
