// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AssociateDashboardClient } from '@/app/associate/[slug]/dashboard/AssociateDashboardClient';
import type { GapScoreEntry, SessionSummary } from '@/lib/trainer-types';

// Stub recharts — JSDOM doesn't compute SVG layout. We care about two things:
//   1. That SkillRadar's title changes when selectedSkill propagates (skill → topic mode).
//   2. That the SkillCardList selected card flips its inline border (2px accent).
// Both are observable without needing the radar to paint.
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    RadarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="radar-chart">{children}</div>
    ),
    PolarGrid: () => <div />,
    PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
    Radar: ({ name }: { name: string }) => (
      <div data-testid={`radar-${name}`} data-name={name} />
    ),
    Tooltip: () => <div />,
    Legend: () => <div />,
  };
});

const gapScores: GapScoreEntry[] = [
  { skill: 'React', topic: '', weightedScore: 0.72, prevWeightedScore: 0.6, sessionCount: 3 },
  { skill: 'SQL', topic: '', weightedScore: 0.55, prevWeightedScore: 0.5, sessionCount: 3 },
  { skill: 'Node', topic: '', weightedScore: 0.66, prevWeightedScore: 0.6, sessionCount: 3 },
];

const sessions: SessionSummary[] = [
  {
    id: 's1',
    date: new Date('2026-04-15').toISOString(),
    overallTechnicalScore: 75,
    overallSoftSkillScore: 80,
    status: 'completed',
    assessments: {},
  },
];

function renderDashboard() {
  return render(
    <AssociateDashboardClient
      displayName="Sample Associate"
      gapScores={gapScores}
      sessions={sessions}
      readinessPercent={68}
      threshold={75}
      recommendedArea="SQL"
      lowestScore={0.55}
      lowestSkillSessionCount={3}
    />,
  );
}

function findSkillCard(skill: string): HTMLElement {
  // SkillCardList renders each skill card as a <div role="button"> containing
  // a <span> with the skill name. Find the card by walking up from the label.
  const labels = screen.getAllByText(skill, { selector: 'span' });
  for (const label of labels) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const card = (label as any).closest('[role="button"]') as HTMLElement | null;
    if (card) return card;
  }
  throw new Error(`SkillCardList card for "${skill}" not found`);
}

describe('VIZ-06 — dashboard-wide skill filter syncs SkillCardList + SkillRadar', () => {
  it('selecting a skill card switches the radar title to topic mode and marks the card selected', () => {
    const { container } = renderDashboard();

    // Baseline: radar is in overall "Skill Overview" mode, no clear-chip.
    expect(within(container).getByText('Skill Overview')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /All skills/i })).toBeNull();

    // SkillCardList selected state: SQL card has 1px border, not the 2px accent.
    const sqlCardBefore = findSkillCard('SQL');
    expect(sqlCardBefore.getAttribute('style') || '').toContain('1px solid var(--border-subtle)');

    // Click SQL — propagates selectedSkill through to SkillRadar.
    fireEvent.click(sqlCardBefore);

    // After click: All-skills clear-chip appears.
    expect(screen.getByRole('button', { name: /All skills/i })).toBeInTheDocument();

    // SkillRadar title reflects the propagated selectedSkill ("SQL · Topics").
    expect(within(container).getByText(/SQL\s*·\s*Topics/i)).toBeInTheDocument();
    expect(within(container).queryByText('Skill Overview')).toBeNull();

    // SkillCardList marks the selected card with a 2px accent border.
    const sqlCardAfter = findSkillCard('SQL');
    expect(sqlCardAfter.getAttribute('style') || '').toContain('2px solid var(--accent)');
  });

  it('clicking the All-skills chip clears selectedSkill — radar + card style revert', () => {
    const { container } = renderDashboard();

    fireEvent.click(findSkillCard('SQL'));
    const clearChip = screen.getByRole('button', { name: /All skills/i });
    fireEvent.click(clearChip);

    // Chip unmounts.
    expect(screen.queryByRole('button', { name: /All skills/i })).toBeNull();
    // Radar title reverts to "Skill Overview".
    expect(within(container).getByText('Skill Overview')).toBeInTheDocument();
    // SQL card returns to the unselected border.
    const sqlCard = findSkillCard('SQL');
    expect(sqlCard.getAttribute('style') || '').toContain('1px solid var(--border-subtle)');
  });
});
