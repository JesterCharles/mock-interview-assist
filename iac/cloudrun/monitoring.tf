# Phase 48 OBS-02 + OBS-04
# - NLM Production dashboard in BOTH projects (D-12)
# - Uptime checks for staging + prod /api/health (D-13)
# - Email alert policy wired to ADMIN_EMAILS secret value (D-14)
#
# Applied PER-PROJECT using the per-env tfvars. Module is driven by var.env.

locals {
  is_staging      = var.env == "staging"
  uptime_host     = local.is_staging ? var.uptime_host_staging : var.uptime_host_prod
  uptime_check_id = local.is_staging ? "nlm-staging-uptime" : "nlm-prod-uptime"
}

# ---------- Dashboard (D-12: same schema, both projects) ----------
resource "google_monitoring_dashboard" "nlm_production" {
  project = var.project_id

  dashboard_json = templatefile(
    "${path.module}/monitoring/dashboard-nlm-production.json",
    {
      env        = var.env
      project_id = var.project_id
    }
  )
}

# ---------- Notification channel (D-14) ----------
# Pull ADMIN_EMAILS secret value at apply time; split on "," -> first entry.
data "google_secret_manager_secret_version" "admin_emails" {
  project = var.project_id
  secret  = var.alert_notification_email_secret
  version = "latest"
}

locals {
  admin_email_first = trimspace(split(",", data.google_secret_manager_secret_version.admin_emails.secret_data)[0])
}

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "NLM ${var.env} — admin email"
  type         = "email"
  labels = {
    email_address = local.admin_email_first
  }
}

# ---------- Uptime check (D-13) ----------
resource "google_monitoring_uptime_check_config" "health" {
  project      = var.project_id
  display_name = local.uptime_check_id
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/api/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
    # D-13 + D-24: accept 503 too — staging Prisma transient failures must not page.
    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
    accepted_response_status_codes {
      status_value = 503
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = local.uptime_host
    }
  }
}

# ---------- Alert policy (2 consecutive failures -> email) ----------
# D-13 threshold: duration=120s over 60s windows with ALIGN_FRACTION_TRUE < 1
# means two consecutive 60s windows must be "not all passing" before firing.
resource "google_monitoring_alert_policy" "uptime" {
  project      = var.project_id
  display_name = "NLM Uptime — ${var.env}"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failed 2 consecutive 60s windows"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" resource.type=\"uptime_url\" metric.label.check_id=\"${google_monitoring_uptime_check_config.health.uptime_check_id}\""
      duration        = "120s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }
      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content   = "NLM ${var.env} /api/health uptime check failed 2 consecutive 60s windows. Check https://console.cloud.google.com/run?project=${var.project_id}"
    mime_type = "text/markdown"
  }
}
