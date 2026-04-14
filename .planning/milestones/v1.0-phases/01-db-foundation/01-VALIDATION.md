---
phase: 1
slug: db-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js scripts + shell commands (no test framework needed for infra phase) |
| **Config file** | none — Wave 0 installs Prisma |
| **Quick run command** | `npx prisma validate` |
| **Full suite command** | `npx prisma validate && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx prisma validate`
- **After every plan wave:** Run `npx prisma validate && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | PERSIST-03 | — | Singleton prevents connection exhaustion | integration | `npx prisma validate` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | PERSIST-07 | — | Pooler URL used for runtime | config | `grep "port=6543" .env` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 2 | PERSIST-06 | — | Prisma binary in Docker image | build | `npm run build` | ✅ | ⬜ pending |
| 01-01-04 | 01 | 2 | — | — | Health endpoint returns 200 with DB status | integration | `curl localhost:3000/api/health` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `prisma/schema.prisma` — minimal schema with connectivity test model
- [ ] `src/lib/prisma.ts` — singleton client with adapter-pg
- [ ] `.env.example` — DATABASE_URL and DIRECT_URL templates

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase connection | PERSIST-07 | Requires live Supabase credentials | Run `npx prisma migrate deploy` with DIRECT_URL set |
| Docker image startup | PERSIST-06 | Requires Docker build + run | `docker compose up --build` then check health endpoint |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
