---
phase: 46
slug: supabase-staging-env-hygiene-prisma-migrate-baseline
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-18
---

# Phase 46 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (existing) for idempotency unit tests; live DB via tsx scripts; Supabase Management API via curl + jq |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npm run test -- scripts/__tests__/seed-staging.test.ts` (~3s) |
| **Full suite command** | `bash scripts/verify-phase-46.sh` (runs seed twice + migrate status + management API verify) |
| **Estimated runtime** | quick ~5s; full ~90s (network-bound) |

## Sampling Rate

- **Per task commit:** `npm run test -- <changed test file>` + `npx tsc --noEmit`
- **Per wave merge:** `npm run test` (full unit suite) + `bash scripts/verify-phase-46.sh` dry run
- **Phase gate:** `bash scripts/verify-phase-46.sh` runs end-to-end against **staging** Supabase only (prod wipe is one-time, not re-runnable)

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat | Test Type | Automated Command |
|---------|------|------|-------------|--------|-----------|-------------------|
| 46-01-01 | 01 | 1 | DATA-03 | T-46-01 | unit+integration | `npm run test -- scripts/__tests__/seed-staging.test.ts` exits 0 |
| 46-01-02 | 01 | 1 | DATA-03 | T-46-02 | integration | `npx tsx scripts/seed-staging.ts && SELECT COUNT FROM all tables; npx tsx scripts/seed-staging.ts; counts identical` |
| 46-01-03 | 01 | 1 | DATA-05 | T-46-03 | unit | `npx tsx scripts/lib/assert-staging-env.ts` test — pass on staging URL, fail on prod URL |
| 46-02-01 | 02 | 2 | DATA-02 | T-46-04 | smoke | `gsutil ls gs://nlm-tfstate/backups/prod-pre-wipe-*.sql.gz` shows a file with size > 0 |
| 46-02-02 | 02 | 2 | DATA-02 | T-46-05 | integration | `psql "$PROD_DIRECT_URL" -c 'SELECT COUNT(*) FROM "Associate"'` returns 0; same for Session, CodingAttempt, GapScore, AuthEvent |
| 46-03-01 | 03 | 2 | DATA-01 | T-46-06 | smoke | `gcloud secrets versions access latest --secret=DATABASE_URL --project=nlm-staging-493715 \| grep -q 'lzuqbpqmqlvzwebliptj'` exits 0 |
| 46-03-02 | 03 | 2 | DATA-04 | — | integration | `DATABASE_URL="$STAGING_DIRECT_URL" npx prisma migrate status \| grep -q 'Database schema is up to date'`; same for prod |
| 46-04-01 | 04 | 3 | DATA-06 | T-46-07 | smoke | `curl -sH "Authorization: Bearer $PAT" https://api.supabase.com/v1/projects/lzuqbpqmqlvzwebliptj/config/auth \| jq -r '.uri_allow_list' \| grep -q 'staging.nextlevelmock.com'` |
| 46-04-02 | 04 | 3 | DATA-05 | T-46-08 | unit | `npx tsx scripts/verify-env-hygiene.ts` exits 0 on clean checkout; non-zero if prod ref found in any .env file |

## Wave 0 Requirements

- [ ] `scripts/lib/assert-staging-env.ts`
- [ ] `scripts/seed-staging.ts`
- [ ] `scripts/__tests__/seed-staging.test.ts`
- [ ] `scripts/wipe-prod.ts`
- [ ] `docs/runbooks/phase-46-supabase-wipe.md`
- [ ] `docs/ENV-HYGIENE.md`
- [ ] `scripts/verify-env-hygiene.ts`
- [ ] `scripts/verify-phase-46.sh`
- [ ] `package.json` += `@faker-js/faker` as devDep
- [ ] `brew install postgresql@16` preflight (for `pg_dump` 16)

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| `pg_dump` backup uploaded to GCS | DATA-02 | Backup is authority-of-last-resort; human confirms file exists + downloads to verify contents parseable | `gsutil cp gs://nlm-tfstate/backups/prod-pre-wipe-*.sql.gz /tmp/ && zcat /tmp/*.sql.gz \| head` shows valid SQL |
| Key rotation in Supabase dashboard (staging + prod) | DATA-01 | Supabase API rotation is 2026-Q2+ — today requires dashboard | Runbook lists exact UI clicks |
| Supabase PAT generation | DATA-06 | One-time human action | Runbook documents access-tokens page |

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity maintained
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` after Wave 0 lands

**Approval:** pending
