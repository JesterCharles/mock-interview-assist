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
  sessionCount: number
}

export interface GapDataPoint {
  session: string
  score: number
}
