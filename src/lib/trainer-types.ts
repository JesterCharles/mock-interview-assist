// Trainer dashboard TypeScript interfaces

// Roster associate row — shown on /trainer
export interface RosterAssociate {
  slug: string
  displayName: string
  readinessStatus: 'ready' | 'improving' | 'not_ready'
  readinessScore: number | null        // weighted avg score, null if < 3 sessions
  recommendedArea: string | null
  sessionCount: number
  lastSessionDate: string | null       // ISO string
}

// For the detail page (Plan 02)
export interface AssociateDetail extends RosterAssociate {
  /** Numeric DB id — required for trainer-only actions like PIN generation (Plan 09-03) */
  id: number
  /** Current cohort id, null when unassigned (Plan 11-03 / D-05) */
  cohortId: number | null
  /** Current cohort name for display, null when unassigned (Plan 11-03 / D-05) */
  cohortName: string | null
  sessions: SessionSummary[]
  gapScores: GapScoreEntry[]
}

export interface SessionSummary {
  id: string
  date: string                         // ISO string
  overallTechnicalScore: number | null
  overallSoftSkillScore: number | null
  status: string
  assessments: Record<string, { questionId: string; llmScore?: number; finalScore?: number }>
}

export interface GapScoreEntry {
  skill: string
  topic: string | null
  weightedScore: number
  /** Phase 34: real snapshot of the prior weightedScore (null = no history yet). */
  prevWeightedScore?: number | null
  sessionCount: number
}

export interface GapDataPoint {
  session: string
  score: number
}

// Aggregate readiness counts returned alongside a cohort-scoped roster.
// Opt-in: returned only when callers pass `?includeSummary=true` on /api/trainer.
export interface CohortSummary {
  ready: number
  improving: number
  notReady: number
}

// Wrapped response shape used ONLY by callers that explicitly set
// `includeSummary=true`. Default /api/trainer callers continue to receive
// a raw `RosterAssociate[]` array (v1.0 contract).
export interface RosterResponse {
  associates: RosterAssociate[]
  summary: CohortSummary
}

// Phase 22 — Analytics response types

export interface KpiData {
  avgReadiness: number | null       // % of associates classified as "ready"
  mocksThisWeek: number             // count of sessions in last 7 days
  atRiskCount: number               // count of not_ready associates
  topGapSkill: string | null        // skill name with lowest avg gap score
  avgVariance: number | null        // average aiTrainerVariance across sessions
}

export interface SparklinePoint {
  score: number
}

export interface RosterSparklineData {
  associateId: number
  slug: string
  sparkline: SparklinePoint[]       // last 6 sessions, oldest first
  trendWord: 'improving' | 'declining' | 'steady' | 'new'
  topGap: string | null             // lowest gap score skill name
  lastMockDate: string | null       // ISO timestamp
}

export interface GapAnalysisRow {
  skill: string
  topic: string
  associatesAffected: number
  avgGapScore: number
}

export interface GapDrillThroughRow {
  slug: string
  displayName: string
  gapScore: number
  lastSessionDate: string | null
}

export interface CalibrationData {
  overrideRate: number | null       // percentage 0-100
  overrideCount: number
  totalScoredQuestions: number
  deltaBuckets: Record<string, number>  // keys: "-3","-2","-1","0","1","2","3"
}

export interface CohortTrendPoint {
  weekLabel: string                 // "W1", "W2", etc.
  weekStart: string                 // ISO date
  avgScore: number
  sessionCount: number
}

// Plan 17-02 — Trainer backfill surface.
// Row shape for /api/trainer/associates list used by the BACKFILL-02 admin UI.
// Includes id (numeric PK) for trainer-only PATCH/DELETE actions.
export interface AssociateBackfillRow {
  id: number
  slug: string
  displayName: string | null
  email: string | null
  sessionCount: number
  cohortId: number | null
  cohortName: string | null
  createdAt: string // ISO
  lastInvitedAt: string | null // ISO — for bulk invite preview throttle check
}

// Dry-run preview counts returned by /api/trainer/associates/preview.
// slugOnlyZeroSessions = count of rows safe to delete (email IS NULL AND sessionCount === 0).
// sessionsOrphanedIfAllDeleted is reserved for future rule changes; always 0
// while the server-side orphan guard refuses to delete any associate with sessions.
export interface BackfillPreview {
  total: number
  withEmail: number
  withoutEmail: number
  slugOnlyZeroSessions: number
  sessionsOrphanedIfAllDeleted: number
}

// Phase 41 — Trainer coding panel (CODING-SCORE-03)

/**
 * Trainer-facing coding attempt row. Explicitly excludes all hidden-test
 * fixture fields (stdin, expectedStdout, hiddenTestResults detail) — the
 * Phase 39 hidden-test shield extends through to this surface.
 */
export interface CodingAttemptSummary {
  id: string
  submittedAt: string // ISO
  challengeSlug: string
  challengeTitle: string
  language: string
  difficulty: 'easy' | 'medium' | 'hard'
  verdict: string
  score: number | null
}

/** Aggregated coding-only gap score per skillSlug (across languages). */
export interface CodingSkillScore {
  skillSlug: string
  score: number
  attemptCount: number
}

/** Response envelope for GET /api/trainer/[slug]/coding. */
export interface AssociateCodingPayload {
  attempts: CodingAttemptSummary[]
  codingSkillScores: CodingSkillScore[]
}
