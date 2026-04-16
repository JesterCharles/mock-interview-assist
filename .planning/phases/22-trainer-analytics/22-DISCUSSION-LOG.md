# Phase 22: Trainer Analytics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-16
**Phase:** 22-trainer-analytics
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** KPI Strip, Sparklines, Gap Analysis, Topic Parsing, Calibration, Cohort Trends

---

## KPI Strip
| Option | Description | Selected |
|--------|-------------|----------|
| 4 fixed cards, single $queryRaw | Responsive grid, cohort-scoped | YES |

**User's choice:** [auto] 4 fixed cards (recommended per ANALYTICS-01)

## Sparklines
| Option | Description | Selected |
|--------|-------------|----------|
| Recharts mini LineChart, windowed query | 56x20px inline, no N+1 | YES |

**User's choice:** [auto] Recharts inline (recommended per ANALYTICS-02)

## Gap Analysis Drill-Through
| Option | Description | Selected |
|--------|-------------|----------|
| URL navigation to /trainer/gap-analysis/[skill] | Maintains cohort context | YES |
| Modal overlay | Keeps context but loses URL | |

**User's choice:** [auto] URL navigation (recommended)

## Topic Parsing
| Option | Description | Selected |
|--------|-------------|----------|
| Read topic: frontmatter, fallback keywords[0] | Store in Session.questions JSON | YES |

**User's choice:** [auto] Frontmatter + fallback (recommended per ANALYTICS-04)

## Calibration
| Option | Description | Selected |
|--------|-------------|----------|
| Bar chart histogram + frequency card | Bucketed deltas centered on 0 | YES |

**User's choice:** [auto] Bar chart histogram (recommended per ANALYTICS-05)

## Claude's Discretion
- SQL query details, component styling, sparkline color, loading states
