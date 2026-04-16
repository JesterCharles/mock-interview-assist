# Phase 19: Bulk Invite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 19-bulk-invite
**Mode:** --auto (all decisions auto-selected with recommended defaults)
**Areas discussed:** Email Input, Cohort Assignment, Preview UX, Bulk API Strategy

---

## Email Input

| Option | Description | Selected |
|--------|-------------|----------|
| Textarea with live validation chips | Parse on input, show green/red/yellow chips per email | YES |
| Plain textarea + server-side validation | Submit raw text, server parses and returns errors | |

**User's choice:** [auto] Textarea with live validation chips (recommended — matches INVITE-01 "live validation chips")
**Notes:** 50-email cap enforced client-side. Chips removable via X button.

---

## Cohort Assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Single cohort dropdown, curriculum auto-follows | One cohort per batch, curriculum inherited | YES |
| Per-email cohort assignment | Each email gets its own cohort picker | |

**User's choice:** [auto] Single cohort dropdown (recommended — INVITE-02 "picks target cohort + auto-assigns curriculum from cohort")
**Notes:** Associates already in target cohort skipped. Different-cohort associates show as "Reassign".

---

## Preview UX

| Option | Description | Selected |
|--------|-------------|----------|
| Table with Email/Action/Notes columns | Row-level actions: New/Reassign/Skip variants | YES |
| Summary-only confirmation | "N new, N reassign, N skip" without per-email detail | |

**User's choice:** [auto] Per-email preview table (recommended — matches INVITE-02 "preview screen shows per-email action")
**Notes:** Trainer can uncheck rows to exclude. Confirm button shows actionable count.

---

## Bulk API Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential per-email, pre-flight quota check | Check daily limit before starting, process one-by-one | YES |
| Parallel batch with rollback | Promise.allSettled, full rollback on >50% failure | |

**User's choice:** [auto] Sequential per-email with pre-flight quota check (recommended — matches INVITE-03 "per-email transaction" + "partial failures don't roll back siblings")
**Notes:** Response is result array with per-email status. Client renders as result table.

---

## Claude's Discretion

- Chip component implementation details
- Toast/notification pattern after bulk complete
- Preview data source (client-side vs dry-run endpoint)
- Loading state during processing
- Zod schema specifics

## Deferred Ideas

- CSV/file upload (textarea sufficient for 50 cap)
- Per-email cohort override (adds UI complexity)
- Customizable invite email templates
- "Re-invite all" button
- Invite history page
