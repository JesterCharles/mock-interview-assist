// -----------------------------------------------------------------------------
// Least-privilege service account for the Judge0 VM (D-11 prerequisite).
//
// The Judge0 VM attaches this SA as its default identity. The metrics pusher
// (`scripts/push-judge0-metrics.mjs`, Plan 43-03) invokes `gcloud logging write`
// on the VM and auths via instance metadata — no key file required.
//
// Roles: ONLY roles/logging.logWriter. No compute, no storage, no iam admin.
// -----------------------------------------------------------------------------

resource "google_service_account" "judge0_metrics" {
  account_id   = var.judge0_service_account_id
  display_name = "NLM Judge0 metrics pusher"
  description  = "Attached to the Judge0 VM. Writes structured log entries to log name 'judge0-metrics' per Plan 43-03 / IAC-04."
}

resource "google_project_iam_member" "judge0_metrics_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.judge0_metrics.email}"
}
