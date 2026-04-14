# Phase 5: Readiness Signals - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-13
**Phase:** 05-readiness-signals
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Readiness formula, Badge states, Recommended practice area, Configurable threshold, Computation & storage

---

## Badge States

| Option | Description | Selected |
|--------|-------------|----------|
| Three states (ready/improving/not ready) | Clear signal with middle ground | ✓ |
| Binary (ready/not ready) | Too harsh, no progress signal | |
| Five levels | Over-granular for MVP | |

**User's choice:** [auto] Three states (recommended default)

---

## Configurable Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Settings table with UI | Trainer can adjust, badges recalculate | ✓ |
| Environment variable | Requires redeploy to change | |
| Hardcoded 75% | Inflexible, per READY-03 must be configurable | |

**User's choice:** [auto] Settings table with UI (recommended, per READY-03)

---

## Claude's Discretion

- Settings UI location
- "Improving" criteria specifics
- Trend direction icon

## Deferred Ideas

- Readiness notification
- Historical readiness timeline
