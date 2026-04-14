# Phase 3: Associate Profiles - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-13
**Phase:** 03-associate-profiles
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Identity model, Slug input location, Profile schema, Profile page, Slug validation

---

## Identity Model

| Option | Description | Selected |
|--------|-------------|----------|
| Trainer-assigned slugs | Simple text IDs, no login needed | ✓ |
| Auto-generated IDs | Less memorable, harder for trainers to use | |
| Email-based identity | Requires auth system, out of scope | |

**User's choice:** [auto] Trainer-assigned slugs (recommended, per PROJECT.md decision)

---

## Slug Input Location

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard setup wizard (Phase 3) | Natural place alongside candidateName | ✓ |
| Separate associate management page | Over-engineered for MVP | |
| Pre-interview modal | Disrupts existing flow | |

**User's choice:** [auto] Dashboard setup wizard (recommended default)

---

## Claude's Discretion

- Zustand store vs server-side slug handling
- Profile page layout
- Error handling for invalid slugs

## Deferred Ideas

None.
