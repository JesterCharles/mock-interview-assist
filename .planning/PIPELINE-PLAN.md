# Planning Pipeline — 2026-04-13

## Phases Planned

| Phase | Plans | Waves | Dependencies | Requirements |
|-------|-------|-------|-------------|-------------|
| 1. DB Foundation | 2 | 2 | None | PERSIST-03, -06, -07 |
| 2. Session Persistence | 2 | 2 | Phase 1 | PERSIST-01, -04, -05 |
| 3. Associate Profiles | 2 | 2 | Phase 2 | PERSIST-02 |
| 4. Gap Service | 3 | 3 | Phase 3 | GAP-01, -02, -03, -04 |
| 5. Readiness Signals | 2 | 2 | Phase 4 | READY-01, -02, -03 |
| 6. Trainer Dashboard | 2 | 2 | Phase 5 | DASH-01 through -07 |
| 7. Adaptive Setup | 2 | 2 | Phase 6 | GAP-05 |

**Total:** 15 plans, 15 waves, 22 requirements covered

## Dependency Graph

```
Phase 1 (DB Foundation)
  └─> Phase 2 (Session Persistence)
        └─> Phase 3 (Associate Profiles)
              └─> Phase 4 (Gap Service)
                    └─> Phase 5 (Readiness Signals)
                          └─> Phase 6 (Trainer Dashboard)
                                └─> Phase 7 (Adaptive Setup)
```

Strictly sequential — each phase extends the Prisma schema and builds on data from the previous phase. No parallelization opportunities.

## Reviews

### Plan Verification (Phase 1)
- Checker: PASSED (11/11 dimensions)
- Requirements coverage: 3/3
- All tasks have read_first + acceptance_criteria

### Phases 2-7
- Plans created by parallel planner agents
- All requirement IDs mapped to plans
- Schema push [BLOCKING] tasks included where needed
- Security threat models included per ASVS L1

## Research Findings

Key findings from 7 parallel researchers:

| Phase | Critical Finding |
|-------|-----------------|
| 1 | Prisma 7 breaking changes: prisma.config.ts replaces schema datasource; Turbopack conflict requires --webpack |
| 2 | Public interview auth gap: /api/history is auth-protected, public sessions need separate endpoint |
| 2 | readHistory must be extracted to shared service before sync-check can be built |
| 3 | Slug travels via Zustand (same as candidateName pattern), upsert-on-save at /api/history POST |
| 4 | PostgreSQL NULL uniqueness pitfall: GapScore.topic must use empty string sentinel, not NULL |
| 4 | Skill identity gap: techMap field needed on Session to map weekNumber to skill name |
| 5 | Session.overallScore field unconfirmed — trend computation may need in-app aggregation |
| 6 | Auth client/server split: useAuth() + useEffect pattern, not RSC isAuthenticatedSession() |
| 6 | DESIGN.md tokens must be scoped to .trainer-shell to avoid breaking existing dark-navy pages |
| 7 | Cross-phase contract: GapScore.skill must match techWeights key format from Zustand store |

## Security Verification

All plans include <threat_model> blocks per ASVS L1 enforcement.

## Autoresearch Opportunities

Identified during planning:
- **LLM scoring accuracy** — 0.8 decay factor in gap algorithm (Phase 4) is a starting point; autoresearch can optimize
- **Page load time** — Trainer dashboard (Phase 6) with recharts may need bundle optimization

## Next Step

-> /pipeline-execute (begin wave execution starting with Phase 1)

**User setup required before execution:** Supabase project with DATABASE_URL and DIRECT_URL credentials.
