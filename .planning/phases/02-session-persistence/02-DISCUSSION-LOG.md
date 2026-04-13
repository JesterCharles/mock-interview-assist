# Phase 2: Session Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 02-session-persistence
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Dual-write location, Session schema, Assessments storage, Sync-check endpoint, Public interview persistence

---

## Dual-Write Location

| Option | Description | Selected |
|--------|-------------|----------|
| `/api/history` POST handler | Single save point, add DB write alongside file write | ✓ |
| Zustand store middleware | Client-side trigger, adds complexity | |
| Separate background job | Async, but adds infrastructure | |

**User's choice:** [auto] `/api/history` POST handler (recommended default)

---

## Assessments Storage

| Option | Description | Selected |
|--------|-------------|----------|
| JSON column | Simple, matches existing structure, no joins needed | ✓ |
| Normalized tables | Better querying but over-engineered for MVP | |
| Hybrid (key fields + JSON) | Compromises, adds migration complexity | |

**User's choice:** [auto] JSON column (recommended default)

---

## Sync-Check Endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Count + spot-check (5 recent) | Balances thoroughness with performance | ✓ |
| Count-only comparison | Too shallow, misses data mismatches | |
| Full hash comparison | Too expensive for routine checks | |

**User's choice:** [auto] Count + spot-check (recommended default)

---

## Claude's Discretion

- Error handling for dual-write failures
- Timestamp fields (created_at/updated_at)
- Transaction handling

## Deferred Ideas

None.
