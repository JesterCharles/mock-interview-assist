/**
 * Shared types for Cohort entities, consumed by /api/cohorts routes
 * and by Phase 11 UI plans (02, 03).
 */

export interface CohortDTO {
  id: number;
  name: string;
  startDate: string; // ISO-8601 string
  endDate: string | null; // ISO-8601 string or null (schema allows nullable endDate)
  description: string | null;
  associateCount: number;
}

export interface CohortCreateInput {
  name: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

export type CohortUpdateInput = Partial<CohortCreateInput>;
