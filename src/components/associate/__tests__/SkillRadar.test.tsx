// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SkillRadar } from '@/components/associate/SkillRadar';
import type { GapScoreEntry, SessionSummary } from '@/lib/trainer-types';

// Recharts computes layout via SVG measurement which JSDOM does not provide.
// Stub the chart primitives so we can assert structural props (what radar layers
// render, what data they carry) without relying on actual measurement.
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    RadarChart: ({ children, data }: { children: React.ReactNode; data: unknown }) => (
      <div data-testid="radar-chart" data-points={JSON.stringify(data)}>
        {children}
      </div>
    ),
    PolarGrid: () => <div data-testid="polar-grid" />,
    PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
    Radar: ({ name, dataKey }: { name: string; dataKey: string }) => (
      <div data-testid={`radar-${name}`} data-key={dataKey} data-name={name} />
    ),
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

const baseSessions: SessionSummary[] = [];

function makeSkill(
  skill: string,
  weightedScore: number,
  prev: number | null | undefined,
): GapScoreEntry {
  return {
    skill,
    topic: '',
    weightedScore,
    prevWeightedScore: prev,
    sessionCount: 3,
  };
}

describe('SkillRadar — Phase 34 real-snapshot Before polygon', () => {
  it('hides the Prior polygon when every axis has null prevWeightedScore', () => {
    const gapScores = [
      makeSkill('React', 0.72, null),
      makeSkill('SQL', 0.55, null),
      makeSkill('Node', 0.66, null),
    ];
    const { container, queryByTestId } = render(
      <SkillRadar gapScores={gapScores} sessions={baseSessions} selectedSkill={null} />,
    );
    // Prior Radar layer only renders when hasHistory is true — absent here.
    expect(queryByTestId('radar-Prior')).toBeNull();
    // Now layer is always rendered as long as we have enough vertices.
    expect(queryByTestId('radar-Now')).not.toBeNull();
    // Legend only renders when hasHistory — stub keeps it unmounted.
    expect(queryByTestId('legend')).toBeNull();
    // No stale "Est. prior" wording anywhere in DOM.
    expect(container.textContent).not.toMatch(/Est\. prior/);
  });

  it('renders the Prior polygon when at least one axis has a real prevWeightedScore', () => {
    const gapScores = [
      makeSkill('React', 0.72, 0.6), // has real prior
      makeSkill('SQL', 0.55, null),
      makeSkill('Node', 0.66, null),
    ];
    const { queryByTestId } = render(
      <SkillRadar gapScores={gapScores} sessions={baseSessions} selectedSkill={null} />,
    );
    // Prior layer renders when at least one axis carries a real prevWeightedScore.
    const priorLayer = queryByTestId('radar-Prior');
    expect(priorLayer).not.toBeNull();
    expect(priorLayer?.getAttribute('data-key')).toBe('before');
    expect(queryByTestId('radar-Now')).not.toBeNull();
    // Legend is mounted only when hasHistory is true.
    expect(queryByTestId('legend')).not.toBeNull();
  });

  it('passes hasPrev flags that match prevWeightedScore presence per axis', () => {
    const gapScores = [
      makeSkill('React', 0.72, 0.6),
      makeSkill('SQL', 0.55, null),
      makeSkill('Node', 0.66, 0.55),
    ];
    const { getByTestId } = render(
      <SkillRadar gapScores={gapScores} sessions={baseSessions} selectedSkill={null} />,
    );
    const chart = getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-points') || '[]') as Array<{
      axis: string;
      hasPrev: boolean;
      before: number;
      now: number;
    }>;
    const byAxis = Object.fromEntries(data.map((d) => [d.axis, d]));
    expect(byAxis.React.hasPrev).toBe(true);
    expect(byAxis.React.before).toBe(60);
    expect(byAxis.SQL.hasPrev).toBe(false);
    expect(byAxis.SQL.before).toBe(byAxis.SQL.now); // falls back to now when no prior
    expect(byAxis.Node.hasPrev).toBe(true);
    expect(byAxis.Node.before).toBe(55);
  });

  it('does NOT render the "Est. prior is approximated…" caption', () => {
    const gapScores = [
      makeSkill('React', 0.72, 0.6),
      makeSkill('SQL', 0.55, 0.5),
      makeSkill('Node', 0.66, 0.6),
    ];
    const { container } = render(
      <SkillRadar gapScores={gapScores} sessions={baseSessions} selectedSkill={null} />,
    );
    expect(container.textContent).not.toMatch(/Est\. prior is approximated/i);
    expect(container.textContent).not.toMatch(/approximated from overall session trend/i);
  });
});
