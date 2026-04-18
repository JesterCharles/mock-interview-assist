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

---

## Phase G — Key rotation + Secret Manager population (staging + prod)

Out-of-band secret population per Phase 45 D-10 (no plaintext in Terraform, no commits). 7 secrets × 2 projects = 14 `gcloud secrets versions add` invocations total. Do NOT script this loop — each value is pasted into a transient shell variable and piped via stdin.

### Sub-phase G1 — Staging key rotation

1. Open https://supabase.com/dashboard/project/lzuqbpqmqlvzwebliptj/settings/api
2. Rotate the **publishable (anon) key** AND the **service_role key** (RESEARCH Assumptions A4/A6 — rotate both for a clean post-migration state).
3. From Dashboard → Settings → Database, retrieve:
   - Transaction Pooler connection string (port 6543) — becomes `DATABASE_URL`.
   - Direct Connection string (port 5432) — becomes `DIRECT_URL`.

> **Security callout** — Copy values to transient shell variables only. DO NOT paste into `.env.local` or any file. Use `HISTCONTROL=ignorespace` and prefix each `echo -n "<value>" | gcloud ...` with a leading space.

### Sub-phase G2 — Populate staging Secret Manager

```bash
PROJECT_ID="nlm-staging-493715"

# Pooler URL (port 6543) — used by app runtime via adapter-pg
 echo -n "postgresql://postgres.lzuqbpqmqlvzwebliptj:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?connection_limit=5&pool_timeout=10" \
   | gcloud secrets versions add DATABASE_URL --data-file=- --project="${PROJECT_ID}"

# Direct URL (port 5432) — used by prisma migrate deploy (Pitfall 1)
 echo -n "postgresql://postgres.lzuqbpqmqlvzwebliptj:<pw>@db.lzuqbpqmqlvzwebliptj.supabase.co:5432/postgres" \
   | gcloud secrets versions add DIRECT_URL --data-file=- --project="${PROJECT_ID}"

# Supabase API surface
 echo -n "https://lzuqbpqmqlvzwebliptj.supabase.co" \
   | gcloud secrets versions add NEXT_PUBLIC_SUPABASE_URL --data-file=- --project="${PROJECT_ID}"

 echo -n "<new publishable key>" \
   | gcloud secrets versions add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --data-file=- --project="${PROJECT_ID}"

 echo -n "<new service_role key>" \
   | gcloud secrets versions add SUPABASE_SECRET_KEY --data-file=- --project="${PROJECT_ID}"

# Site URL — staging subdomain + admin emails
 echo -n "https://staging.nextlevelmock.com" \
   | gcloud secrets versions add NEXT_PUBLIC_SITE_URL --data-file=- --project="${PROJECT_ID}"

 echo -n "jestercharles@gmail.com" \
   | gcloud secrets versions add ADMIN_EMAILS --data-file=- --project="${PROJECT_ID}"
```

### Sub-phase G3 — Prod key rotation

Repeat G1 against the prod Supabase project (https://supabase.com/dashboard/project/${PROD_SUPABASE_REF}/settings/api). Rotate publishable + service_role keys; retrieve prod pooler + direct URLs.

### Sub-phase G4 — Populate prod Secret Manager

```bash
PROJECT_ID="nlm-prod"

 echo -n "postgresql://postgres.${PROD_SUPABASE_REF}:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?connection_limit=5&pool_timeout=10" \
   | gcloud secrets versions add DATABASE_URL --data-file=- --project="${PROJECT_ID}"

 echo -n "postgresql://postgres.${PROD_SUPABASE_REF}:<pw>@db.${PROD_SUPABASE_REF}.supabase.co:5432/postgres" \
   | gcloud secrets versions add DIRECT_URL --data-file=- --project="${PROJECT_ID}"

 echo -n "https://${PROD_SUPABASE_REF}.supabase.co" \
   | gcloud secrets versions add NEXT_PUBLIC_SUPABASE_URL --data-file=- --project="${PROJECT_ID}"

 echo -n "<new prod publishable key>" \
   | gcloud secrets versions add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --data-file=- --project="${PROJECT_ID}"

 echo -n "<new prod service_role key>" \
   | gcloud secrets versions add SUPABASE_SECRET_KEY --data-file=- --project="${PROJECT_ID}"

# Prod site URL — no staging, no localhost
 echo -n "https://nextlevelmock.com" \
   | gcloud secrets versions add NEXT_PUBLIC_SITE_URL --data-file=- --project="${PROJECT_ID}"

 echo -n "jestercharles@gmail.com" \
   | gcloud secrets versions add ADMIN_EMAILS --data-file=- --project="${PROJECT_ID}"
```

### Post-G cleanup

```bash
# Clear any secret-bearing variables set during G1-G4
unset PGPASSWORD
# Close terminal window — values in scrollback are a disclosure surface.
```

---

## Phase H — Migrate deploy (staging + prod)

Per D-12, Phase 46 does NOT wire migrate deploy into CI — Phase H proves the command works manually against both envs using `DIRECT_URL` (port 5432).

### H1 — Staging

```bash
export DIRECT_URL=$(gcloud secrets versions access latest \
  --secret=DIRECT_URL --project=nlm-staging-493715)

DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
# Expected: "11 migrations found" + "All migrations have been successfully
# applied." (or "No pending migrations to apply" if staging has been touched
# by prior migration runs — both are SUCCESS).

DIRECT_URL="$DIRECT_URL" bash scripts/verify-migrations.sh
# Expected: "[verify-migrations] OK"
```

> **CALLOUT (RESEARCH Pitfall 1):** Always override `DATABASE_URL="$DIRECT_URL"` for `prisma migrate deploy`. The Transaction Pooler on port 6543 drops pg_advisory_lock mid-migration.

### H2 — Prod

```bash
export DIRECT_URL=$(gcloud secrets versions access latest \
  --secret=DIRECT_URL --project=nlm-prod)

DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
# Expected: "No pending migrations to apply" (Plan 02 Phase E already
# re-applied migrations post-wipe — this is a no-op).

DIRECT_URL="$DIRECT_URL" bash scripts/verify-migrations.sh
# Expected: "[verify-migrations] OK"
```

> **ESCALATION (RESEARCH Assumption A8):** If `migrate deploy` errors with **P3005** against prod, STOP. Do NOT force-reset. Inspect schema drift via `prisma db pull` + `git diff`; escalate to planner. Recovery from the Phase B backup is available via `pg_restore` but hand-applied schema changes must not be papered over.

### H3 — Migration tail reference (D-13)

At Phase 46 start, `prisma/migrations/` contains (verify via `ls prisma/migrations`):
```
0000_baseline
0001_v11_cohorts
0002_v12_email_authuser_variance
0003_rls_policies
0004_drop_pin_columns
0005_fix_rls_app_metadata
0006_coding_challenges
0007_challenge_testcase_unique
20260415000000_add_auth_event
20260416000000_add_profile
20260418000000_add_gapscore_prev_score
```

Phase 46 introduces **no new migrations** (D-13). `migrate status` is a no-op on a successfully post-wipe-re-applied DB.

---

## Phase I — Secret Manager verification (post-population)

T-46-06 mitigation: prove the right keys landed in the right home.

```bash
STAGING_REF="lzuqbpqmqlvzwebliptj"

# [1] staging DATABASE_URL must contain staging ref
gcloud secrets versions access latest --secret=DATABASE_URL \
  --project=nlm-staging-493715 \
  | grep -q "$STAGING_REF" \
  && echo "[secret-verify] staging DATABASE_URL OK" \
  || { echo "[secret-verify] FAIL: staging DATABASE_URL missing staging ref"; exit 1; }

# [2] prod DATABASE_URL must NOT contain staging ref
if gcloud secrets versions access latest --secret=DATABASE_URL \
    --project=nlm-prod \
    | grep -q "$STAGING_REF"; then
  echo "[secret-verify] FAIL: prod DATABASE_URL contains staging ref — WRONG SECRET IN PROD"
  exit 1
else
  echo "[secret-verify] prod DATABASE_URL OK (no staging ref)"
fi

# [3] staging NEXT_PUBLIC_SUPABASE_URL points at staging host
gcloud secrets versions access latest --secret=NEXT_PUBLIC_SUPABASE_URL \
  --project=nlm-staging-493715 \
  | grep -q "${STAGING_REF}.supabase.co"

# [4] prod NEXT_PUBLIC_SUPABASE_URL does NOT contain staging ref
gcloud secrets versions access latest --secret=NEXT_PUBLIC_SUPABASE_URL \
  --project=nlm-prod \
  | grep -qv "$STAGING_REF"

# [5] staging NEXT_PUBLIC_SITE_URL = staging subdomain
gcloud secrets versions access latest --secret=NEXT_PUBLIC_SITE_URL \
  --project=nlm-staging-493715 \
  | grep -q 'staging.nextlevelmock.com'

# [6] prod NEXT_PUBLIC_SITE_URL = apex or www (no staging, no localhost)
gcloud secrets versions access latest --secret=NEXT_PUBLIC_SITE_URL \
  --project=nlm-prod \
  | grep -qE '^https://(www\.)?nextlevelmock\.com$'
```

`SUPABASE_SECRET_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are opaque tokens — shape-only verification here; functional verification deferred to Phase 47 `/api/health` check.

### Phase 46 Phases A-I post-conditions

- Both Supabase projects wiped (prod) / seeded-ready (staging).
- 7 secrets × 2 projects populated (14 Secret Manager versions).
- `prisma migrate status` → "Database schema is up to date" against both envs.
- Secret Manager verification: staging holds staging ref; prod does NOT.

Proceed to Phase J (Plan 46-04) for the Auth redirect allowlist update + phase-gate.

