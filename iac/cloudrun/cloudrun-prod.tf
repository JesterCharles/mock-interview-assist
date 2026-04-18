# Phase 51 — iac/cloudrun/cloudrun-prod.tf
# Plan 51-01 / D-04, D-05, D-06, D-07; mirrors Phase 47 cloudrun-staging.tf.
#
# Applied ONLY when -var-file=prod.tfvars (env="prod"). count-gated so staging apply is unaffected.
#
# T-51-03 mitigation: initial_image_digest is the staging-validated digest promoted via
#   scripts/fetch-latest-staging-digest.sh + scripts/promote-staging-digest-to-prod.sh
# before first apply. Subsequent deploys via .github/workflows/deploy-prod.yml (Plan 03)
# overwrite this digest — `lifecycle.ignore_changes` on the image field prevents TF drift.

resource "google_cloud_run_v2_service" "nlm_prod" {
  count = var.env == "prod" ? 1 : 0

  project  = var.project_id
  name     = "nlm-prod" # D-04
  location = var.region # us-central1 (D-04)

  ingress             = "INGRESS_TRAFFIC_ALL" # D-04
  deletion_protection = true                  # prod — accidental `terraform destroy` guard

  template {
    service_account = google_service_account.cloudrun.email # D-06 — nlm-cloudrun-sa@nlm-prod

    scaling {
      min_instance_count = 0  # D-04 / INFRA-04 (scale-to-zero baseline)
      max_instance_count = 10 # D-04 / INFRA-04
    }

    timeout = "300s" # D-04 / INFRA-04

    containers {
      # D-05: digest-only pull. Initial digest = latest staging-approved digest (validated rollback baseline from day 1).
      # `ignore_changes` below prevents TF from reverting CI-deployed digests (mirrors staging Pitfall 2).
      image = "${var.region}-docker.pkg.dev/${var.project_id}/nlm-app/nlm-app@${var.initial_image_digest}"

      resources {
        limits = {
          cpu    = "1"     # D-04 / INFRA-04
          memory = "512Mi" # D-04 / INFRA-04
        }
        cpu_idle          = true
        startup_cpu_boost = true # helps Next.js + Prisma cold start (same as staging)
      }

      ports {
        container_port = 8080 # Cloud Run injects PORT=8080; Next.js standalone binds $PORT.
      }

      # D-07: all 13 Phase 45 secrets mounted from nlm-prod Secret Manager.
      # CODING_CHALLENGES_ENABLED resolves to `false` in prod (Phase 50 D-01) — Judge0 flag off.
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

  # CRITICAL — CI deploys via digest; TF must not thrash.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.cloudrun_accessor,
  ]
}

# D-04: public invoker — v2 API requires EXPLICIT allUsers IAM binding.
# Without this, requests reach Cloud Run but get 403.
resource "google_cloud_run_v2_service_iam_member" "public_invoke_prod" {
  count = var.env == "prod" ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.nlm_prod[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
