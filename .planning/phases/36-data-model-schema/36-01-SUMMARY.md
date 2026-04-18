---
phase: 36-data-model-schema
plan: 01
subsystem: prisma-schema
tags: [prisma, schema, data-model, coding-challenges]
requires: []
provides: [CodingChallenge, CodingAttempt, CodingTestCase, CodingSkillSignal]
affects: [prisma/schema.prisma, src/generated/prisma/]
tech-stack:
  added: []
  patterns: [String+comment enum convention, cuid IDs, @@index on every FK]
key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/generated/prisma/
decisions:
  - "4 new models colocated in single schema.prisma (D-01)"
  - "String+comment enums (D-03), no Prisma native enums"
  - "cuid IDs for all 4 models (D-20) — matches GapScore, eases Judge0 echo"
  - "@unique on CodingSkillSignal.attemptId (D-11) prevents GapScore inflation"
metrics:
  duration: "~2min"
  completed: "2026-04-18"
---

# Phase 36 Plan 01: Add 4 Coding Challenge Prisma Models Summary

Added 4 new Prisma models (CodingChallenge, CodingAttempt, CodingTestCase, CodingSkillSignal) with back-relations on Associate + Cohort, establishing the schema contract for all downstream v1.4 phases.

## What Was Built

- **CodingChallenge** — challenge catalog (slug, language, difficulty, skillSlug, nullable cohortId)
- **CodingAttempt** — user attempt with Judge0 token, Json result columns, server-computed score
- **CodingTestCase** — test case rows flagged by isHidden (API-filtered, not separate table per D-05)
- **CodingSkillSignal** — derived summary, one per attempt (@unique on attemptId)
- Back-relations: `Associate.codingAttempts`, `Cohort.codingChallenges`

## Cascade Rules Implemented (D-08..D-12)

| FK | Rule |
|----|------|
| CodingChallenge.cohortId → Cohort | SetNull (challenges outlive cohorts) |
| CodingAttempt.associateId → Associate | Cascade (scrub on user delete) |
| CodingAttempt.challengeId → CodingChallenge | Restrict (archive, don't delete) |
| CodingTestCase.challengeId → CodingChallenge | Cascade |
| CodingSkillSignal.attemptId → CodingAttempt | Cascade + @unique |

## Verification

- `npx prisma validate` → valid
- `grep -c "^model Coding" prisma/schema.prisma` → 4
- `npx prisma generate` → regenerated client, all 4 model types exported
- `npx tsc --noEmit` → clean

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: prisma/schema.prisma (4 Coding models)
- FOUND: src/generated/prisma/index.d.ts (CodingChallenge, CodingAttempt, CodingTestCase, CodingSkillSignal types)
- FOUND: commit e7642ea

## Handoff

Plan 02: migration folder to create is `prisma/migrations/0006_coding_challenges/`.
