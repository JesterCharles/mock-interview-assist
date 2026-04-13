# Phase 4: Gap Service - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-13
**Phase:** 04-gap-service
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Gap algorithm, Topic source, Score extraction, Computation timing, 3-session gate, Gap score storage

---

## Computation Timing

| Option | Description | Selected |
|--------|-------------|----------|
| On session save (denormalized) | Fast dashboard reads, computed once | ✓ |
| On dashboard load (computed) | Always fresh but slow, O(n) sessions | |
| Background job | Adds infrastructure complexity | |

**User's choice:** [auto] On session save (recommended default)

---

## Topic Source

| Option | Description | Selected |
|--------|-------------|----------|
| Question bank file paths + keywords | Uses existing metadata, no new tagging needed | ✓ |
| Manual topic taxonomy | Requires building/maintaining a taxonomy | |
| LLM-based topic extraction | Expensive and unpredictable | |

**User's choice:** [auto] Question bank metadata (recommended, per GAP-04)

---

## Claude's Discretion

- Service function vs API route for gap computation
- Score normalization across difficulties
- Raw history vs weighted aggregate storage

## Deferred Ideas

- Autoresearch optimization of 0.8 decay factor
- Cross-associate gap comparison
