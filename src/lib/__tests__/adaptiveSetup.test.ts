import { describe, it, expect } from 'vitest';
import { mapGapScoresToWeights, type SkillGapScore } from '@/lib/adaptiveSetup';

describe('mapGapScoresToWeights', () => {
  it('returns weight 5 for lowest score and weight 1 for highest score (3 skills)', () => {
    const scores: SkillGapScore[] = [
      { skill: 'skill1', weightedScore: 0.2 },
      { skill: 'skill2', weightedScore: 0.5 },
      { skill: 'skill3', weightedScore: 0.8 },
    ];
    const result = mapGapScoresToWeights(scores);
    expect(result['skill1']).toBe(5); // lowest score → weight 5
    expect(result['skill2']).toBe(3); // middle
    expect(result['skill3']).toBe(1); // highest score → weight 1
  });

  it('returns inverted weights for two skills', () => {
    const scores: SkillGapScore[] = [
      { skill: 'skill1', weightedScore: 0.9 },
      { skill: 'skill2', weightedScore: 0.1 },
    ];
    const result = mapGapScoresToWeights(scores);
    expect(result['skill1']).toBe(1); // highest score → weight 1
    expect(result['skill2']).toBe(5); // lowest score → weight 5
  });

  it('returns weight 3 for single skill', () => {
    const scores: SkillGapScore[] = [
      { skill: 'skill1', weightedScore: 0.5 },
    ];
    const result = mapGapScoresToWeights(scores);
    expect(result['skill1']).toBe(3);
  });

  it('returns all weight 3 when all scores are equal', () => {
    const scores: SkillGapScore[] = [
      { skill: 'skill1', weightedScore: 0.5 },
      { skill: 'skill2', weightedScore: 0.5 },
      { skill: 'skill3', weightedScore: 0.5 },
    ];
    const result = mapGapScoresToWeights(scores);
    expect(result['skill1']).toBe(3);
    expect(result['skill2']).toBe(3);
    expect(result['skill3']).toBe(3);
  });

  it('returns all weight 3 when all scores are zero', () => {
    const scores: SkillGapScore[] = [
      { skill: 'skill1', weightedScore: 0.0 },
      { skill: 'skill2', weightedScore: 0.0 },
    ];
    const result = mapGapScoresToWeights(scores);
    expect(result['skill1']).toBe(3);
    expect(result['skill2']).toBe(3);
  });

  it('returns empty object for empty array', () => {
    const result = mapGapScoresToWeights([]);
    expect(result).toEqual({});
  });

  it('returns weight 5 for score 0.0 and weight 1 for score 1.0 (full range boundary)', () => {
    const scores: SkillGapScore[] = [
      { skill: 'skill1', weightedScore: 0.0 },
      { skill: 'skill2', weightedScore: 1.0 },
    ];
    const result = mapGapScoresToWeights(scores);
    expect(result['skill1']).toBe(5); // weakest → most practice needed
    expect(result['skill2']).toBe(1); // strongest → least practice needed
  });
});
