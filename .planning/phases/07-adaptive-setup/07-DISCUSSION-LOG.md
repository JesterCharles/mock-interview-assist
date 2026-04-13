# Phase 7: Adaptive Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-13
**Phase:** 07-adaptive-setup
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Pre-population logic, Weight mapping, Trainer override, Cold start fallback, Slug lookup trigger

---

## Weight Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Inverse linear (low gap → high weight) | Weak areas get more questions | ✓ |
| Direct mapping (high gap → high weight) | Reversed — tests strengths more | |
| Binary (gap exists → include) | No weight differentiation | |

**User's choice:** [auto] Inverse linear (recommended default)

---

## Slug Lookup Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| onBlur + "Load history" button | Non-intrusive, explicit action available | ✓ |
| Auto-fetch on every keystroke | Too many API calls, distracting | |
| Only on form submit | Too late, no preview of suggestions | |

**User's choice:** [auto] onBlur + button (recommended default)

---

## Claude's Discretion

- Pre-populated vs manual visual indicator
- Animation on pre-population
- Gap score summary alongside selections

## Deferred Ideas

- Difficulty-level adaptation
- Suggested question count from gap severity
