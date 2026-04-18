# Phase 37: Challenge Bank Contract & Loader - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 37-challenge-bank-contract-loader
**Mode:** `--auto` (Claude picked recommended defaults)
**Areas discussed:** Repo schema, Private fetch isolation, Loader pattern, Cache strategy, Refresh workflow, Validation pipeline

---

## Repo Schema

| Option | Description | Selected |
|--------|-------------|----------|
| `challenges/<slug>/README.md` + separate `starters/` + `visible-tests.json` + `meta.json` | Directory-per-challenge, explicit sub-files | ✓ (recommended) |
| Single `challenge.yaml` per challenge with embedded markdown | Tighter single-file shape | |
| Monorepo with language-specific folders | Separate repos per language | |

**User's choice:** Directory-per-challenge (auto-recommended)
**Notes:** Matches CODING-BANK-01 verbatim; trainers can edit markdown in place without reformatting frontmatter.

---

## Private Fetch Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated server-only helper, direct GitHub API | Bypasses `/api/github` proxy entirely | ✓ (recommended — security) |
| Extend `/api/github` proxy with auth gate | Single proxy path, adds role check | |
| Private repo cached to Supabase on deploy | No runtime GitHub calls | |

**User's choice:** Dedicated server-only helper
**Notes:** Codex discovery §5 flagged `/api/github` as a leak vector because it returns raw content by path; a dedicated helper eliminates the reachability. Accepts cost of a second token.

---

## Loader Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror `github-service.ts` signature shape | Consistent with existing codebase | ✓ (recommended) |
| Build abstract `ContentLoader` class with adapters | More extensible | |
| Inline fetch in API routes | Skip service layer | |

**User's choice:** Mirror `github-service.ts`
**Notes:** CODING-BANK-03 names this as the expected pattern.

---

## Cache Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory Map singleton + ETag short-circuit, 5-min TTL | Reuses v1.2 pattern | ✓ (recommended) |
| Redis-backed cache | Survives restarts, cross-instance | |
| No cache, always fetch | Simpler, wastes API quota | |

**User's choice:** In-memory + ETag + 5-min TTL
**Notes:** CODING-BANK-04 names "v1.2 cache pattern" explicitly. Process-per-host acceptable since there's one app VM today; cross-instance sync is Phase 43+ concern.

---

## Refresh Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Trainer-only POST `/api/coding/bank/refresh` | Manual trigger on demand | ✓ (recommended) |
| Auto-refresh via GitHub webhook | Push-driven | |
| Scheduled job every 5 min | Belt + suspenders | |

**User's choice:** Trainer-only POST
**Notes:** 5-min TTL already meets success criterion; webhook is v1.5 polish.

---

## Validation Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Zod chain: schema → language allowlist → test sanity → dedup → id-disjoint | Stepwise, early exit | ✓ (recommended) |
| Single giant Zod schema | Less readable error output | |
| Runtime asserts with custom error class | More work, no benefit | |

**User's choice:** Zod chain
**Notes:** Project Zod convention; structured errors feed refresh-route response payload.

## Claude's Discretion

- Manifest walk: recommended top-level `challenges/manifest.json` with `[{slug}]` entries to avoid N API calls
- Zod schema file split (single `schemas.ts` vs inline)
- Raw fetch vs octokit for private repo calls — recommended raw fetch (no new deps)
- Error verbosity in refresh response

## Deferred Ideas

- In-app challenge authoring editor — v1.5
- Multi-cohort challenge assignment — v1.5
- Challenge archival / soft delete — v1.5
- Webhook-driven cache invalidation — v1.5
- Function-level test harness — v1.5 seed
