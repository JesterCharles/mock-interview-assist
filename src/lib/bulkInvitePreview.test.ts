import { describe, it, expect } from 'vitest';
import { classifyEmails } from './bulkInvitePreview';
import type { ParsedEmail } from './emailParser';
import type { RosterAssociate, CohortOption } from './bulkInvitePreview';

// Helpers
function validChip(email: string): ParsedEmail {
  return { value: email, normalized: email.toLowerCase(), state: 'valid' };
}
function invalidChip(email: string): ParsedEmail {
  return { value: email, normalized: email.toLowerCase(), state: 'invalid' };
}
function duplicateChip(email: string): ParsedEmail {
  return { value: email, normalized: email.toLowerCase(), state: 'duplicate' };
}

const cohorts: CohortOption[] = [
  { id: 1, name: 'Cohort Alpha' },
  { id: 2, name: 'Cohort Beta' },
];

describe('classifyEmails', () => {
  it('classifies a brand-new email as "new"', () => {
    const chips: ParsedEmail[] = [validChip('new@example.com')];
    const roster: RosterAssociate[] = [];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('new');
    expect(rows[0].checkable).toBe(true);
    expect(rows[0].checked).toBe(true);
    expect(rows[0].actionLabel).toBe('New');
  });

  it('classifies email in a different cohort as "reassign"', () => {
    const chips: ParsedEmail[] = [validChip('existing@example.com')];
    const roster: RosterAssociate[] = [
      { email: 'existing@example.com', cohortId: 2, lastInvitedAt: null, slug: 'existing' },
    ];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('reassign');
    expect(rows[0].checkable).toBe(true);
    expect(rows[0].checked).toBe(true);
    expect(rows[0].actionLabel).toBe('Reassign cohort');
    expect(rows[0].notes).toContain('Cohort Beta');
  });

  it('classifies email in the same cohort as "skip-same-cohort"', () => {
    const chips: ParsedEmail[] = [validChip('same@example.com')];
    const roster: RosterAssociate[] = [
      { email: 'same@example.com', cohortId: 1, lastInvitedAt: null, slug: 'same' },
    ];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('skip-same-cohort');
    expect(rows[0].checkable).toBe(false);
    expect(rows[0].checked).toBe(false);
  });

  it('classifies email invited within 5 minutes as "skip-recently-invited"', () => {
    const recentlyInvited = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 min ago
    const chips: ParsedEmail[] = [validChip('recent@example.com')];
    const roster: RosterAssociate[] = [
      { email: 'recent@example.com', cohortId: 2, lastInvitedAt: recentlyInvited, slug: 'recent' },
    ];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('skip-recently-invited');
    expect(rows[0].checkable).toBe(false);
    expect(rows[0].checked).toBe(false);
    expect(rows[0].notes).toMatch(/\d+ min ago/);
  });

  it('classifies an invalid chip as "skip-invalid"', () => {
    const chips: ParsedEmail[] = [invalidChip('not-an-email')];
    const roster: RosterAssociate[] = [];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('skip-invalid');
    expect(rows[0].actionLabel).toBe('Skip — invalid email');
    expect(rows[0].checkable).toBe(false);
    expect(rows[0].checked).toBe(false);
  });

  it('excludes duplicate chips from the preview entirely', () => {
    const chips: ParsedEmail[] = [
      validChip('first@example.com'),
      duplicateChip('first@example.com'),
    ];
    const roster: RosterAssociate[] = [];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    // Only 1 row — duplicate is excluded, not included as skip
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('first@example.com');
    expect(rows[0].action).toBe('new');
  });

  it('does NOT classify as recently-invited when lastInvitedAt is more than 5 min ago', () => {
    const oldInvite = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
    const chips: ParsedEmail[] = [validChip('old@example.com')];
    const roster: RosterAssociate[] = [
      { email: 'old@example.com', cohortId: 2, lastInvitedAt: oldInvite, slug: 'old' },
    ];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    // 10 min ago, different cohort -> should be reassign, not skip-recently-invited
    expect(rows[0].action).toBe('reassign');
  });

  it('uses normalized (lowercase) email for roster lookup', () => {
    const chips: ParsedEmail[] = [validChip('Upper@Example.COM')];
    const roster: RosterAssociate[] = [
      { email: 'upper@example.com', cohortId: 1, lastInvitedAt: null, slug: 'upper' },
    ];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    expect(rows[0].action).toBe('skip-same-cohort');
  });

  it('handles unknown current cohort gracefully in reassign notes', () => {
    const chips: ParsedEmail[] = [validChip('orphan@example.com')];
    const roster: RosterAssociate[] = [
      { email: 'orphan@example.com', cohortId: 99, lastInvitedAt: null, slug: 'orphan' },
    ];
    const rows = classifyEmails(chips, roster, 1, cohorts);

    expect(rows[0].action).toBe('reassign');
    // Should not throw; notes should still be a string
    expect(typeof rows[0].notes).toBe('string');
  });
});
