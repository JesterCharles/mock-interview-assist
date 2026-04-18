# Phase 46: Supabase Staging + Env Hygiene + Prisma Migrate Baseline - Discussion Log

> **Audit trail only.** Decisions captured in `46-CONTEXT.md`.

**Date:** 2026-04-18
**Phase:** 46-supabase-staging-env-hygiene-prisma-migrate-baseline
**Mode:** `--auto`
**Areas discussed:** Staging project activation, prod wipe procedure, seeder script, migrate deploy validation, auth redirect allowlists, env hygiene

---

## Staging Supabase Activation

| Option | Description | Selected |
|--------|-------------|----------|
| Use existing staging project ref `lzuqbpqmqlvzwebliptj`, generate new keys, store in Phase 45 Secret Manager | Leverages already-provisioned infra | ✓ |
| Create brand-new staging project | Wastes Phase 45 staging secret shells |  |

**Rationale (auto):** Staging project ref was confirmed at discover; no reason to re-provision.

---

## Prod Wipe Procedure

| Option | Description | Selected |
|--------|-------------|----------|
| `pg_dump` backup → upload to GCS → `TRUNCATE CASCADE` + re-run migrations → auth.users wipe | Reversible, schema-preserving, explicit | ✓ |
| `DROP DATABASE; CREATE DATABASE` + full re-migrate | Nuke-and-pave; harder to recover if wipe was mistake |  |
| Selective delete (keep schema rows "real-looking") | Ambiguous criteria; risks leaving residue |  |

**Rationale (auto):** Truncate + re-migrate preserves schema, keeps recovery path, and is testable against staging first.

---

## Seeder Library

| Option | Description | Selected |
|--------|-------------|----------|
| `@faker-js/faker` + `faker.seed(1337)` | De-facto TS standard; deterministic; type-safe | ✓ |
| `@ngneat/falso` | Smaller but less coverage |  |
| Hand-rolled fixture file | No dependency; zero flexibility |  |

**Rationale (auto):** Deterministic Faker gives both variety and reproducibility. Upsert + seed = idempotent.

---

## Seeder Idempotency Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| `prisma.upsert()` keyed on stable slugs/IDs; `faker.seed(1337)` | Re-running produces identical DB | ✓ |
| Truncate before seed | Loses hand-made test data |  |
| Append-only (check-then-insert) | More code, same result as upsert |  |

**Rationale (auto):** Upsert is the Prisma-native way. Idempotent by construction.

---

## Migrate Deploy Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 46 proves command works locally; Phase 48 wires into CI | Clean separation of concerns | ✓ |
| Phase 46 wires into CI immediately | Premature — no GH Actions yet |  |

**Rationale (auto):** Phase 48 is explicitly the CI/CD phase. Phase 46 scope says "migrate deploy wired" — proving it runs locally against both DIRECT_URLs is sufficient.

---

## Auth Redirect Allowlist Update Method

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Management API `PATCH /v1/projects/{ref}/config/auth` via PAT | Canonical; scriptable; version-controllable | ✓ |
| Manual update via Supabase dashboard | Not reproducible |  |
| Terraform supabase provider | Provider is still 0.x; auth config support partial |  |

**Rationale (auto):** Management API is the supported surface; PAT stored in Secret Manager; runbook documents the PATCH payload.

---

## Env Hygiene Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Doc rule (CONTRIBUTING.md or `docs/ENV-HYGIENE.md`) + CI check script | Soft enforcement via docs + hard via script | ✓ |
| Pre-commit hook only | Misses PRs from forks / skipped hooks |  |
| Pure convention, no check | Will silently rot |  |

**Rationale (auto):** Belt + suspenders — human-readable rule plus `scripts/verify-env-hygiene.ts` that CI (Phase 48) can run.

---

## Claude's Discretion

- SQL TRUNCATE order (FK-respecting).
- `pg_dump` flag set.
- auth.users wipe in same script or separate.
- `CONTRIBUTING.md` vs new `docs/ENV-HYGIENE.md`.

## Deferred Ideas

- Backup rotation.
- Realtime subs.
- v0.1 → new prod data migration (none needed).
- Schema drift alerting.
- Pool tuning beyond current `connection_limit=5`.
