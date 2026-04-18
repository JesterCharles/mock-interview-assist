# Environment Hygiene — v1.5+

**Rule:** `.env.local` on every developer machine points at **STAGING** Supabase only.

**Prod keys never leave Google Secret Manager.**

---

## Why this matters

Prod is irreversible. A misfired `prisma migrate reset` or mutating script run against prod is a data-loss event. Phase 46 wiped prod clean (see `docs/runbooks/phase-46-supabase-wipe.md`). Keeping it clean requires that prod keys never land on a developer workstation.

---

## The 3 rules

1. `.env.local` contains ONLY staging Supabase values (ref: `lzuqbpqmqlvzwebliptj`).
2. Prod Supabase values live ONLY in Google Secret Manager at `--project=nlm-prod`.
3. Before every commit (and in CI per Phase 48), `scripts/verify-env-hygiene.ts` runs and fails if any `.env*` file contains the prod Supabase project ref.

---

## Dev loader — pull staging into `.env.local`

```bash
PROJECT_ID="nlm-staging-493715"

cat > .env.local <<EOF
# Auto-generated from Secret Manager (staging only) — DO NOT commit.
DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL --project="${PROJECT_ID}")
DIRECT_URL=$(gcloud secrets versions access latest --secret=DIRECT_URL --project="${PROJECT_ID}")
NEXT_PUBLIC_SUPABASE_URL=$(gcloud secrets versions access latest --secret=NEXT_PUBLIC_SUPABASE_URL --project="${PROJECT_ID}")
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --project="${PROJECT_ID}")
SUPABASE_SECRET_KEY=$(gcloud secrets versions access latest --secret=SUPABASE_SECRET_KEY --project="${PROJECT_ID}")
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

`.env.local` is gitignored; pasting the above into your terminal is the canonical "set up my machine" step.

---

## Verify hygiene

```bash
PROD_SUPABASE_REF=<prod-supabase-ref> npx tsx scripts/verify-env-hygiene.ts
# expected: [env-hygiene] OK — no prod refs in .env files.
```

Or via npm script:

```bash
PROD_SUPABASE_REF=<prod-supabase-ref> npm run verify-env-hygiene
```

Exit codes:
- **0** — clean; no `.env*` file contains the prod ref
- **1** — violation; at least one `.env*` file contains the prod ref (stderr names the files)
- **2** — `PROD_SUPABASE_REF` env var not set

---

## If you need to run a script against prod (rare — ops-only)

Do NOT overwrite `.env.local`. Export `DIRECT_URL` / `DATABASE_URL` per-command only:

```bash
DATABASE_URL="$(gcloud secrets versions access latest --secret=DIRECT_URL --project=nlm-prod)" \
  npx prisma migrate status
```

Never `source` a prod-scoped env file. Never `cp` prod values into `.env.local`.

After the command completes:

```bash
unset DATABASE_URL DIRECT_URL  # purge from shell
```

---

## Related

- `docs/runbooks/phase-46-supabase-wipe.md` — end-to-end key rotation + wipe runbook (Phases A-J)
- `scripts/verify-env-hygiene.ts` — CI-enforceable scanner
- `scripts/lib/assert-staging-env.ts` — runtime guard used by `seed-staging` and `wipe-prod`
- `scripts/verify-phase-46.sh` — phase-gate aggregator (runs env-hygiene + migrate-status + auth allowlist checks)

---

## Enforcement

**Phase 46 (current):** Manual. Run `npm run verify-env-hygiene` before any commit touching `.env*`.

**Phase 48 (planned):** Pre-commit hook + CI job:

```yaml
# .github/workflows/env-hygiene.yml (Phase 48)
- name: Verify env hygiene
  env:
    PROD_SUPABASE_REF: ${{ secrets.PROD_SUPABASE_REF }}
  run: npx tsx scripts/verify-env-hygiene.ts
```

Until Phase 48 lands, the discipline is on the operator.
