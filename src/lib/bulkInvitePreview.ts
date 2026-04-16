import type { ParsedEmail } from '@/lib/emailParser';

export type PreviewAction =
  | 'new'
  | 'reassign'
  | 'skip-same-cohort'
  | 'skip-recently-invited'
  | 'skip-invalid';

export interface PreviewRow {
  email: string;
  action: PreviewAction;
  actionLabel: string; // display text per D-09
  notes: string;
  checkable: boolean; // only 'new' and 'reassign' are checkable
  checked: boolean; // default true for checkable rows
}

export interface RosterAssociate {
  email: string | null;
  cohortId: number | null;
  lastInvitedAt: string | null; // ISO string
  slug: string;
}

export interface CohortOption {
  id: number;
  name: string;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function classifyEmails(
  chips: ParsedEmail[],
  roster: RosterAssociate[],
  targetCohortId: number,
  cohorts: CohortOption[],
): PreviewRow[] {
  const rows: PreviewRow[] = [];

  for (const chip of chips) {
    // Duplicates are excluded from preview entirely (per plan spec)
    if (chip.state === 'duplicate') {
      continue;
    }

    // Invalid chips → skip-invalid
    if (chip.state === 'invalid') {
      rows.push({
        email: chip.value,
        action: 'skip-invalid',
        actionLabel: 'Skip — invalid email',
        notes: '',
        checkable: false,
        checked: false,
      });
      continue;
    }

    // Valid chip — look up in roster by normalized email
    const match = roster.find(
      r => r.email != null && r.email.toLowerCase() === chip.normalized,
    );

    if (!match) {
      // Not in roster → new
      rows.push({
        email: chip.value,
        action: 'new',
        actionLabel: 'New',
        notes: '',
        checkable: true,
        checked: true,
      });
      continue;
    }

    // Found in roster — check same cohort first
    if (match.cohortId === targetCohortId) {
      rows.push({
        email: chip.value,
        action: 'skip-same-cohort',
        actionLabel: 'Skip — same cohort',
        notes: '',
        checkable: false,
        checked: false,
      });
      continue;
    }

    // Check recently invited (5-min throttle) — applies regardless of cohort
    if (match.lastInvitedAt != null) {
      const invitedAt = new Date(match.lastInvitedAt).getTime();
      const msSinceInvite = Date.now() - invitedAt;
      if (msSinceInvite < FIVE_MINUTES_MS) {
        const minutesAgo = Math.round(msSinceInvite / 60000);
        rows.push({
          email: chip.value,
          action: 'skip-recently-invited',
          actionLabel: 'Skip — recently invited',
          notes: `Invited ${minutesAgo} min ago`,
          checkable: false,
          checked: false,
        });
        continue;
      }
    }

    // Different cohort and not throttled → reassign
    const currentCohort = match.cohortId != null
      ? cohorts.find(c => c.id === match.cohortId)
      : null;
    const currentCohortName = currentCohort?.name ?? 'unknown cohort';

    rows.push({
      email: chip.value,
      action: 'reassign',
      actionLabel: 'Reassign cohort',
      notes: `Currently in ${currentCohortName}`,
      checkable: true,
      checked: true,
    });
  }

  return rows;
}
