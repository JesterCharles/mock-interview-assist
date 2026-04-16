# Phase 20: Middleware Cutover + RLS - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 20-middleware-cutover-rls
**Mode:** --auto (all decisions auto-selected with recommended defaults)
**Areas discussed:** PIN Grace Reconciliation, RLS Policy Design, Identity Filter Audit, Documentation

---

## PIN Grace Window Reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| Honor P18 decision — no grace window | PIN never shipped to prod; SC 2 is moot | YES |
| Add grace window anyway | 2-week PIN fallback in middleware | |

**User's choice:** [auto] Honor P18 decision (recommended — PIN never shipped)
**Notes:** SC 2 superseded by P18 decision to remove PIN grace entirely.

---

## RLS Policy Design

| Option | Description | Selected |
|--------|-------------|----------|
| Defense-in-depth only | Prisma BYPASSRLS, RLS catches supabase-js access | YES |
| Primary access control | RLS as main guard, Prisma respects it | |

**User's choice:** [auto] Defense-in-depth only (recommended — matches AUTH-10)
**Notes:** is_trainer() SECURITY DEFINER function. Policies per table as specified.

---

## Identity Filter Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Audit all DB-reading routes | Verify explicit WHERE by identity | YES |
| Skip audit — trust existing gates | Assume P18 migration was complete | |

**User's choice:** [auto] Full audit (recommended — defense-in-depth requires verification)

---

## Documentation

| Option | Description | Selected |
|--------|-------------|----------|
| PROJECT.md "Database Access Architecture" section | Document BYPASSRLS + explicit-filter requirement | YES |

**User's choice:** [auto] Add section (recommended — SC 5 requires it)

---

## Claude's Discretion

- SQL syntax for RLS policies
- Single vs split migration files
- Audit output format

## Deferred Ideas

- Row-level audit logging
- Column-level security
- Client-side Supabase queries
