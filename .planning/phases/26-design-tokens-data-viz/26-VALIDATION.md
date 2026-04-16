---
phase: 26
slug: design-tokens-data-viz
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | DESIGN-02 | — | N/A | manual | grep `--chart-1` src/app/globals.css | N/A | ⬜ pending |
| 26-01-02 | 01 | 1 | DESIGN-02 | — | N/A | manual | grep `--chart-highlight` src/app/globals.css | N/A | ⬜ pending |
| 26-01-03 | 01 | 1 | DESIGN-01 | — | N/A | manual | grep `Data Visualization` DESIGN.md | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test file stubs needed — this is a documentation + CSS token phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DESIGN.md Data Visualization section has chart palette, axis conventions, tooltip patterns, trajectory language | DESIGN-01 | Markdown content structure — no runtime behavior | Read DESIGN.md, verify all subsections present |
| globals.css has --chart-1 through --chart-5 in :root and [data-theme="dark"] | DESIGN-02 | CSS custom property definitions — no runtime test needed | grep for tokens in both blocks |
| Tailwind @theme inline block includes --color-chart-* entries | DESIGN-02 | Tailwind utility generation — verified by build | Run `npm run build`, check for errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
