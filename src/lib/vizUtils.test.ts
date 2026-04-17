import { describe, it, expect } from 'vitest';
import {
  getScoreColor,
  getTrendDirection,
  getTrajectoryWord,
  getTrajectoryNarrative,
  computeSkillTrend,
  type TrendDirection,
} from './vizUtils';

describe('getScoreColor', () => {
  it('returns var(--danger) for 0-40 band', () => {
    expect(getScoreColor(0)).toBe('var(--danger)');
    expect(getScoreColor(30)).toBe('var(--danger)');
    expect(getScoreColor(40)).toBe('var(--danger)');
  });

  it('returns var(--warning) for 41-60 band', () => {
    expect(getScoreColor(41)).toBe('var(--warning)');
    expect(getScoreColor(50)).toBe('var(--warning)');
    expect(getScoreColor(60)).toBe('var(--warning)');
  });

  it('returns var(--accent) for 61-79 band', () => {
    expect(getScoreColor(61)).toBe('var(--accent)');
    expect(getScoreColor(70)).toBe('var(--accent)');
    expect(getScoreColor(79)).toBe('var(--accent)');
  });

  it('returns var(--success) for 80-89 band', () => {
    expect(getScoreColor(80)).toBe('var(--success)');
    expect(getScoreColor(82)).toBe('var(--success)');
    expect(getScoreColor(89)).toBe('var(--success)');
  });

  it('returns var(--mastery) for 90-100 band', () => {
    expect(getScoreColor(90)).toBe('var(--mastery)');
    expect(getScoreColor(95)).toBe('var(--mastery)');
    expect(getScoreColor(100)).toBe('var(--mastery)');
  });

  it('clamps negative values to danger', () => {
    expect(getScoreColor(-5)).toBe('var(--danger)');
  });

  it('clamps values above 100 to mastery', () => {
    expect(getScoreColor(110)).toBe('var(--mastery)');
  });

  it('handles NaN gracefully', () => {
    expect(getScoreColor(NaN)).toBe('var(--danger)');
  });
});

describe('getTrendDirection', () => {
  it('returns up for slope > 1', () => {
    expect(getTrendDirection(5)).toBe('up');
    expect(getTrendDirection(1.1)).toBe('up');
  });

  it('returns down for slope < -1', () => {
    expect(getTrendDirection(-2)).toBe('down');
    expect(getTrendDirection(-1.1)).toBe('down');
  });

  it('returns flat for slope -1 to 1 (inclusive)', () => {
    expect(getTrendDirection(0)).toBe('flat');
    expect(getTrendDirection(0.5)).toBe('flat');
    expect(getTrendDirection(1)).toBe('flat');
    expect(getTrendDirection(-1)).toBe('flat');
  });
});

describe('getTrajectoryWord', () => {
  it('returns ascending for slope > 3', () => {
    expect(getTrajectoryWord(5)).toBe('ascending');
    expect(getTrajectoryWord(3.1)).toBe('ascending');
  });

  it('returns climbing for slope 1 to 3', () => {
    expect(getTrajectoryWord(2)).toBe('climbing');
    expect(getTrajectoryWord(1)).toBe('climbing');
    expect(getTrajectoryWord(3)).toBe('climbing');
  });

  it('returns holding for slope -1 to 1', () => {
    expect(getTrajectoryWord(0)).toBe('holding');
    expect(getTrajectoryWord(0.5)).toBe('holding');
    expect(getTrajectoryWord(-0.5)).toBe('holding');
  });

  it('returns dipping for slope -3 to -1', () => {
    expect(getTrajectoryWord(-2)).toBe('dipping');
    expect(getTrajectoryWord(-1)).toBe('dipping');
    expect(getTrajectoryWord(-3)).toBe('dipping');
  });

  it('returns stalling for slope < -3', () => {
    expect(getTrajectoryWord(-5)).toBe('stalling');
    expect(getTrajectoryWord(-3.1)).toBe('stalling');
  });
});

describe('getTrajectoryNarrative', () => {
  it('returns Improving narrative for ascending/climbing slope', () => {
    expect(getTrajectoryNarrative(5, 8, 3)).toBe('Improving +8pts over 3 sessions');
  });

  it('returns Slipping narrative for dipping/stalling slope', () => {
    expect(getTrajectoryNarrative(-2, -4, 5)).toBe('Slipping -4pts over 5 sessions');
  });

  it('returns Holding steady narrative for flat slope', () => {
    expect(getTrajectoryNarrative(0, 0, 4)).toBe('Holding steady over 4 sessions');
  });

  it('handles positive delta with + prefix', () => {
    const result = getTrajectoryNarrative(2, 5, 3);
    expect(result).toContain('+5pts');
  });

  it('handles negative delta without extra minus', () => {
    const result = getTrajectoryNarrative(-5, -10, 4);
    expect(result).toContain('-10pts');
    expect(result).not.toContain('+-');
  });
});

describe('computeSkillTrend', () => {
  const makeSessions = (scores: number[]) =>
    scores.map((score, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      assessments: {},
      overallTechnicalScore: score,
    }));

  it('returns slope=-1 when sessionCount < 3', () => {
    const gapScores = [{ skill: 'React', topic: null, weightedScore: 0.7, sessionCount: 2 }];
    const result = computeSkillTrend(makeSessions([70, 75]), 'React', gapScores);
    expect(result.slope).toBe(-1);
    expect(result.sessionCount).toBe(2);
  });

  it('returns numeric slope when sessionCount >= 3', () => {
    const gapScores = [{ skill: 'React', topic: null, weightedScore: 0.8, sessionCount: 3 }];
    const sessions = makeSessions([60, 70, 80]);
    const result = computeSkillTrend(sessions, 'React', gapScores);
    expect(result.slope).toBeGreaterThan(0);
    expect(result.sessionCount).toBe(3);
  });

  it('returns negative slope for declining sessions', () => {
    const gapScores = [{ skill: 'Node', topic: null, weightedScore: 0.5, sessionCount: 4 }];
    const sessions = makeSessions([80, 70, 60, 50]);
    const result = computeSkillTrend(sessions, 'Node', gapScores);
    expect(result.slope).toBeLessThan(0);
  });

  it('returns pointsDelta as difference between most recent and oldest', () => {
    const gapScores = [{ skill: 'React', topic: null, weightedScore: 0.8, sessionCount: 3 }];
    const sessions = makeSessions([60, 70, 80]);
    const result = computeSkillTrend(sessions, 'React', gapScores);
    expect(result.pointsDelta).toBe(20); // 80 - 60
  });
});
