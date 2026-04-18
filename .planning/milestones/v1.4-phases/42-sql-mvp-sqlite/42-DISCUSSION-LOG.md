# Phase 42: SQL MVP — Discussion Log

> Audit trail only. Decisions captured in CONTEXT.md.

**Date:** 2026-04-18
**Mode:** `--auto`
**Areas:** Bank schema, injection, normalization, label, doc

---

## Challenge Bank SQL Shape

| Option | Selected |
|--------|----------|
| Add `setup.sql` alongside existing files + extend test-case shape | ✓ (recommended) |
| Inline schema in meta.json | Harder to edit |

## Server-Side Injection

| Option | Selected |
|--------|----------|
| Server concatenates setup + user query at submit | ✓ (security boundary) |
| Client loads setup and submits combined | Rejected — exposes schema |

## Normalization

| Option | Selected |
|--------|----------|
| `sqlResultNormalizer.ts` with trim/numeric-coerce/order flags | ✓ (recommended — SQL-02) |
| Exact string match | Brittle |

## Dialect Label

| Option | Selected |
|--------|----------|
| Shared `SQL_DIALECT_LABEL` constant imported everywhere | ✓ (recommended — SQL-03) |

## Postgres Deferral Doc

| Option | Selected |
|--------|----------|
| PROJECT.md Out of Scope addition with rationale | ✓ (required) |
