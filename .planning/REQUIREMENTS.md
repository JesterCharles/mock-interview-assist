# Requirements: Next Level Mock — Readiness Loop MVP

**Defined:** 2026-04-13
**Core Value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories.

## v1 Requirements

### Persistence

- [ ] **PERSIST-01**: Every mock session is stored in Supabase with full scoring data (questions, scores by dimension, trainer overrides, timestamps)
- [ ] **PERSIST-02**: Associate profiles persist with trainer-assigned slug/ID (no login required)
- [ ] **PERSIST-03**: Prisma singleton pattern prevents connection exhaustion on Supabase free tier
- [ ] **PERSIST-04**: Dual-write to both file storage and Supabase during migration period
- [ ] **PERSIST-05**: Sync check endpoint compares session counts between file and DB to detect divergence
- [ ] **PERSIST-06**: Docker production build includes Prisma binary via outputFileTracingIncludes
- [ ] **PERSIST-07**: Supabase connection uses pooler URL (port 6543) for runtime, direct URL (port 5432) for migrations

### Gap Tracking

- [ ] **GAP-01**: Two-level gap tracking: skill level and topic level within each skill
- [ ] **GAP-02**: Recency-weighted scoring with 0.8 decay factor per session
- [ ] **GAP-03**: Minimum 3 sessions gate before gap scores display (prevents false signals on cold start)
- [ ] **GAP-04**: Topic tags derived from question bank Markdown metadata (validate tag consistency first)
- [ ] **GAP-05**: Adaptive mock setup pre-selects technologies/weights based on gap history; trainer can override

### Trainer Dashboard

- [ ] **DASH-01**: Roster view at /trainer showing all associates with readiness status badges (ready/improving/not ready)
- [ ] **DASH-02**: Per-associate detail with session history (last 5+ sessions with scores)
- [ ] **DASH-03**: Gap trend charts with skill/topic selector using recharts
- [ ] **DASH-04**: AI vs trainer score calibration view (side-by-side per dimension)
- [ ] **DASH-05**: Readiness badges pre-computed on session save (not recalculated on every dashboard load)
- [ ] **DASH-06**: Dashboard protected by existing single-password auth
- [ ] **DASH-07**: Graceful empty states for associates with < 3 sessions

### Readiness Signal

- [ ] **READY-01**: Computed readiness signal: 75% avg score across last 3 sessions with non-negative trend
- [ ] **READY-02**: Next recommended practice area per associate (lowest weighted gap score)
- [ ] **READY-03**: Readiness threshold configurable per trainer via settings

## v2 Requirements

### Multi-Format Assessment

- **FORMAT-01**: Feynman method mock (explain concepts to simulated stakeholder)
- **FORMAT-02**: Architecture diagram review (mind mapping, explaining blocks and flow)
- **FORMAT-03**: Code review mock (review project code with AI feedback)

### Independent Job Seekers

- **SEEKER-01**: Public registration for individual users
- **SEEKER-02**: Subscription billing for self-practice
- **SEEKER-03**: Personal progress dashboard

### Client Portal

- **CLIENT-01**: Client-facing view of associate readiness and skills
- **CLIENT-02**: Talent pipeline visibility for incremental demand
- **CLIENT-03**: Company revenue share on candidate placements

### Platform Scaling

- **SCALE-01**: Multi-tenancy with role-based access (admin, trainer, associate, client)
- **SCALE-02**: Supabase Auth replacing single-password auth
- **SCALE-03**: Rate limit migration from file-based to database-backed

## Out of Scope

| Feature | Reason |
|---------|--------|
| Associate login / auth | Trainer-assigned IDs for MVP — no auth complexity |
| Multi-tenancy | Single training org for MVP |
| Billing / payments | No revenue model in MVP |
| Real-time score push to dashboard | Supabase Realtime adds complexity; polling/refresh sufficient for MVP |
| Historical data migration (existing JSON → DB) | Dual-write captures new sessions; old sessions not needed |
| Tremor UI component library | React 19 peer dependency conflict — use recharts instead |
| SM-2 spaced repetition algorithm | Wrong domain — assessment gap tracking, not flashcard scheduling |
| Horizontal scaling / multiple Docker replicas | Single container for MVP; file-based rate limits break with replicas |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated during roadmap creation) | | |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 20

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after research synthesis*
