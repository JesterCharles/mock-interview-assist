# Phase 30: Associate Curriculum View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-16
**Phase:** 30-associate-curriculum-view
**Areas discussed:** Schedule layout, Time state styling, Empty state

---

## Schedule Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical timeline | Week cards stacked, topics listed per day | |
| Calendar grid | Grid with days as columns, weeks as rows | ✓ (adapted) |
| Accordion weeks | Collapsible week sections | |

**User's choice:** Calendar grid (week per row, topics as columns). Adapted to weekly granularity since daily model deferred.

**Data model:** User chose "Needs daily model (defer)" — weekly granularity for now using topicTags[].

**Mock CTA:** User wanted banner at top (not bottom). Noted adaptive encouragement logic for next milestone (exponential curve based on topic density + days elapsed).

**Scalability:** User noted next milestone focuses on full curriculum ingestion (PDF import, nested skill→topic). Phase 30 grid must accommodate expansion without rewrite.

---

## Time State Styling

**Collapsible weeks:** User requested collapsible week rows. Current + prior week expanded by default. Others collapsed.

**Progression philosophy:** Prior week topics should all be green by end of Friday, then next week opens.

**Highlight style:** User chose "You decide" — Claude's discretion.

---

## Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Text + icon, no CTA | BookOpen icon + "not assigned to cohort" message | ✓ |
| Text + contact trainer CTA | Same + mailto link | |
| You decide | | |

**User's choice:** Text + icon, no CTA

---

## Claude's Discretion

- Current week highlight style
- Grid column sizing and responsive layout
- Collapse animation
- Collapsed week header content
- Friday review handling

## Deferred Ideas

- Daily topic mapping model (next milestone)
- Adaptive mock encouragement with exponential urgency (next milestone)
- Full PDF curriculum ingestion + nested skill→topic (next milestone, user will provide PDF example)
- Friday review/assessment enforcement logic (next milestone)
