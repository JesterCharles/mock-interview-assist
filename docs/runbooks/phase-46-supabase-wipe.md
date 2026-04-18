---
phase: 46
status: draft
type: runbook
owner: operator
last_reviewed: 2026-04-18
---

# Phase 46 Supabase Wipe Runbook — prod reset + key rotation + migrate-baseline

**Scope:** One-time destructive prod Supabase reset plus staging/prod key
rotation, Secret Manager population, `prisma migrate deploy` validation, env
hygiene, and Auth redirect allowlist updates. This is the complete Phase 46
operator checklist.

**Irreversible gates:** Phases B and D are one-way.

**Read time:** ~25 min end-to-end; execution wall clock ~45 min.

---

## Preflight

```bash
# 1. pg_dump version ≥ 15 (Supabase Postgres is 15+ — RESEARCH pitfall 8)
pg_dump --version
#   expected: pg_dump (PostgreSQL) 15.x or higher
#   if absent / too old:
#     brew install postgresql@16
#     export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
#     # macOS Apple Silicon; Intel: /usr/local/opt/postgresql@16/bin

# 2. gcloud authed to BOTH projects
gcloud auth list
gcloud projects describe nlm-staging-493715 >/dev/null
gcloud projects describe nlm-prod >/dev/null

# 3. GCS backup bucket exists (provisioned in Phase 45 D-05)
gsutil ls gs://nlm-tfstate/backups/ || gsutil ls gs://nlm-tfstate/

# 4. Supabase PAT with `all` scope (RESEARCH pitfall 4) — used Phases G + J only
#    Create at https://supabase.com/dashboard/account/tokens (scope: all)
#    DO NOT commit. DO NOT paste into .env.local.
export SUPABASE_ACCESS_TOKEN="<PAT>"

# 5. Prod Supabase project ref
export PROD_SUPABASE_REF="<prod-supabase-project-ref>"

# 6. Shell hygiene for this session
HISTCONTROL=ignorespace
# (Or: unset HISTFILE for the duration of the wipe session.)
```

Abort if any preflight step fails — do not proceed to Phase A.

---

## Phase A — Prod backup (MANDATORY GATE before wipe)

```bash
# Extract PGPASSWORD from the prod DIRECT_URL password segment.
# The direct URL lives in Secret Manager:
export PROD_DIRECT_URL=$(gcloud secrets versions access latest \
  --secret=DIRECT_URL --project=nlm-prod)
export PGPASSWORD=$(printf '%s' "$PROD_DIRECT_URL" \
  | sed -E 's|^postgresql://[^:]+:([^@]+)@.*|\1|')
# Security: never `echo "$PGPASSWORD"`. Never `env | grep PGPASSWORD`.

# pg_dump invocation — direct connection (port 5432).
# DO NOT use the Transaction Pooler URL (port 6543): pg_dump drops mid-dump
# on long sessions (RESEARCH Pitfall 2).
pg_dump \
  --host=db.${PROD_SUPABASE_REF}.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --schema=public \
  --schema=auth \
  --verbose \
  --file=prod-pre-wipe-$(date +%Y%m%d).dump

# Verify non-zero size
ls -lh prod-pre-wipe-*.dump
```

**Flag rationale (RESEARCH §flag rationale):**
- `--format=custom` + `--compress=9` — compact restorable format via `pg_restore`.
- `--no-owner --no-acl` — restore into a different Supabase project without role mismatch.
- `--schema=public --schema=auth` — captures app data + Supabase auth.users/identities.

> **WARNING** — if you see `connection closed unexpectedly`, you hit the pooler. Re-confirm `DIRECT_URL` (port 5432) and rerun.

```bash
# Clear PGPASSWORD immediately after pg_dump finishes
unset PGPASSWORD
```

---

## Phase B — Upload backup to GCS (HARD GATE)

```bash
gsutil cp prod-pre-wipe-$(date +%Y%m%d).dump gs://nlm-tfstate/backups/

# HARD GATE: size verification — MUST show Content-Length > 0
gsutil stat gs://nlm-tfstate/backups/prod-pre-wipe-$(date +%Y%m%d).dump \
  | grep -E 'Content-Length:\s+[1-9]'
```

> **BLOCKING CALLOUT** — if `gsutil stat` returns zero or errors, STOP. Do not proceed to Phase D. Re-run Phase A (after re-exporting `PGPASSWORD`).

```bash
# Post-upload housekeeping: delete local copy to minimize on-disk secrets.
rm -f prod-pre-wipe-*.dump
```

---

## Phase C — Wipe dry-run

```bash
export DIRECT_URL="$PROD_DIRECT_URL"
export DATABASE_URL="$PROD_DIRECT_URL"   # D-11 guard keys on DATABASE_URL
export PROD_SUPABASE_REF   # already exported in preflight

npx tsx scripts/wipe-prod.ts
# Expected output:
#   [wipe-prod] DRY RUN — no changes will be made.
#   [wipe-prod] Would TRUNCATE (order): "CodingSkillSignal" -> ... -> "Settings"
#     "CodingSkillSignal"    rows=N
#     ...
#     "Settings"             rows=N
#   [wipe-prod] To execute, re-run with --i-understand-this-wipes-prod
```

Confirm per-table row counts are > 0 (otherwise the script is pointed at a fresh DB — STOP).

---

## Phase D — Wipe live-run (ONE-TIME, IRREVERSIBLE)

```bash
# Additional env needed for auth.users cleanup
export NEXT_PUBLIC_SUPABASE_URL="https://${PROD_SUPABASE_REF}.supabase.co"
export SUPABASE_SECRET_KEY=$(gcloud secrets versions access latest \
  --secret=SUPABASE_SECRET_KEY --project=nlm-prod)
# (If SUPABASE_SECRET_KEY secret is empty pre-Phase G, export the current
#  service role key from the Supabase dashboard temporarily for this step;
#  rotate in Phase G1 afterwards.)

npx tsx scripts/wipe-prod.ts --i-understand-this-wipes-prod
# Expected output:
#   [wipe-prod] LIVE RUN — this wipes prod.
#     wiped "CodingSkillSignal"
#     wiped "CodingAttempt"
#     ... (13 total)
#   deleted auth user test-xxx@gmail.com
#   deleted auth user alice@example.com
#   PRESERVED auth user founder@... (does not match test heuristic)
#   [wipe-prod] Done.
```

Record any PRESERVED users for review.

---

## Phase E — Migrate deploy (re-affirm schema baseline)

```bash
# RESEARCH Pitfall 1: always override DATABASE_URL with the DIRECT_URL (port
# 5432). prisma migrate deploy against the pooler (port 6543) breaks the
# pg_advisory_lock mid-migration.
export DIRECT_URL="$PROD_DIRECT_URL"

DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
# Expected: "No pending migrations to apply." (Plan 02 Phase E runs against a
# prod DB that is already at the schema tail — all migrations have been
# applied; migrate deploy is a no-op after the wipe. This is SUCCESS per D-13.)

DATABASE_URL="$DIRECT_URL" npx prisma migrate status \
  | grep -q "Database schema is up to date"
# Expected: exit 0
```

> **ESCALATION (RESEARCH Assumption A8):** If `migrate deploy` errors with P3005, STOP. Do NOT force-reset. Inspect schema drift manually and escalate to planner. Recovery via `pg_restore` from the Phase B backup is available but hand-applied changes must not be papered over.

---

## Phase F — Post-wipe verification (psql COUNT)

```bash
for TABLE in "Associate" "Session" "CodingAttempt" "GapScore" "AuthEvent"; do
  echo -n "$TABLE: "
  psql "$PROD_DIRECT_URL" -tAc "SELECT COUNT(*) FROM \"$TABLE\""
done
# Expected: each line prints "0"

psql "$PROD_DIRECT_URL" -tAc 'SELECT COUNT(*) FROM _prisma_migrations'
# Expected: 11 (schema history intact — D-13 lists 11 migrations)
```

Also verify auth.users via admin API — via a short one-liner:

```bash
node -e "
  import('@supabase/supabase-js').then(async ({ createClient }) => {
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false }});
    const { data } = await s.auth.admin.listUsers({ page: 1, perPage: 1000 });
    console.log('auth.users total:', data.users.length);
    data.users.forEach(u => console.log(' -', u.email));
  });
"
```

Should show only real users (zero `@example.com`, zero `test-*`).

---

## Rollback (if Phase F reveals unexpected state)

```bash
# Restore from backup — run ONLY if rollback is necessary.
gsutil cp gs://nlm-tfstate/backups/prod-pre-wipe-$(date +%Y%m%d).dump .
export PGPASSWORD=$(printf '%s' "$PROD_DIRECT_URL" \
  | sed -E 's|^postgresql://[^:]+:([^@]+)@.*|\1|')
pg_restore \
  --host=db.${PROD_SUPABASE_REF}.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  prod-pre-wipe-$(date +%Y%m%d).dump
unset PGPASSWORD
```

---

## Post-conditions (after Phases A-F)

- `prod-pre-wipe-YYYYMMDD.dump` persists in `gs://nlm-tfstate/backups/`.
- All 13 app tables empty; `_prisma_migrations` intact (≥ 11 rows).
- Auth users count reduced to real users only.
- Ready to proceed to **Phase G** (key rotation — Plan 03).

---

## Security callouts (apply throughout)

- **SUPABASE_ACCESS_TOKEN** never written to `.env.local` or committed — session export only.
- **PGPASSWORD** cleared from the shell after each pg_dump / pg_restore invocation (`unset PGPASSWORD`).
- Local `.dump` files deleted after gsutil upload (Phase B).
- Use `HISTCONTROL=ignorespace` for the wipe session so commands containing secrets never land in shell history.

---

*Plan 46-02 scope ends at Phase F. Plan 46-03 appends Phase G (key rotation + Secret Manager population), Phase H (migrate deploy both envs), Phase I (Secret Manager verification). Plan 46-04 appends Phase J (Auth redirect allowlist update + phase-gate).*
