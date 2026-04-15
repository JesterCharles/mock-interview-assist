// Local type contracts mirroring Plan 17-02 API shapes.
// Kept local to this folder so Plan 17-03 UI can type-check independently
// while Plan 17-02 lands its exports on `src/lib/trainer-types.ts`.
// Once 17-02 merges and exports these, this file can be deleted and
// components can import from `@/lib/trainer-types`.

export interface AssociateBackfillRow {
  id: number
  slug: string
  displayName: string | null
  email: string | null
  sessionCount: number
  cohortId: number | null
  cohortName: string | null
  createdAt: string
}

export interface BackfillPreview {
  total: number
  withEmail: number
  withoutEmail: number
  slugOnlyZeroSessions: number
  sessionsOrphanedIfAllDeleted: number
}
