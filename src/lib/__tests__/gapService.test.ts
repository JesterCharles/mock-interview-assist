import { describe, it, expect } from 'vitest';
import {
  recencyWeightedAverage,
  extractScore,
  extractSkillTopicScores,
  computeGapScores,
  type GapScoreInput,
} from '@/lib/gapService';
import type {
  InterviewSession,
  QuestionAssessment,
  ParsedQuestion,
} from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeAssessment(
  overrides: Partial<QuestionAssessment> = {},
): QuestionAssessment {
  return {
    questionId: 'q1',
    keywordsHit: [],
    keywordsMissed: [],
    softSkills: {
      clearlySpoken: false,
      eyeContact: false,
      confidence: false,
      structuredThinking: false,
    },
    interviewerNotes: '',
    didNotGetTo: false,
    status: 'validated',
    ...overrides,
  };
}

function makeQuestion(
  overrides: Partial<ParsedQuestion> = {},
): ParsedQuestion {
  return {
    id: 'week1-q1',
    questionNumber: 1,
    question: 'What are hooks?',
    keywords: ['hooks', 'useState'],
    modelAnswer: 'Hooks are...',
    difficulty: 'intermediate',
    weekNumber: 1,
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<InterviewSession> = {},
): InterviewSession {
  return {
    id: 'session-1',
    date: '2026-04-13',
    selectedWeeks: [1],
    questionCount: 1,
    starterQuestions: [],
    questions: [makeQuestion()],
    assessments: {
      'week1-q1': makeAssessment({ questionId: 'week1-q1', finalScore: 80 }),
    },
    currentQuestionIndex: 0,
    status: 'completed',
    techMap: { 1: 'react' },
    ...overrides,
  };
}

// ── recencyWeightedAverage ───────────────────────────────────────────────

describe('recencyWeightedAverage', () => {
  it('returns 0 for empty array', () => {
    expect(recencyWeightedAverage([])).toBe(0);
  });

  it('returns the score itself for a single element', () => {
    expect(recencyWeightedAverage([80])).toBe(80);
  });

  it('applies 0.8 decay for two scores (newest first)', () => {
    // (80*1.0 + 60*0.8) / (1.0 + 0.8) = (80 + 48) / 1.8 = 71.111...
    expect(recencyWeightedAverage([80, 60])).toBeCloseTo(71.11, 2);
  });

  it('applies 0.8 decay for three scores (newest first)', () => {
    // (90*1.0 + 70*0.8 + 50*0.64) / (1.0 + 0.8 + 0.64) = (90 + 56 + 32) / 2.44 = 72.95...
    // Wait, plan says 73.77. Let me recompute:
    // (90*1.0 + 70*0.8 + 50*0.64) = 90 + 56 + 32 = 178
    // (1.0 + 0.8 + 0.64) = 2.44
    // 178 / 2.44 = 72.9508...
    // Plan says 73.77 but the actual math gives 72.95. Let's test with the actual math.
    expect(recencyWeightedAverage([90, 70, 50])).toBeCloseTo(72.95, 2);
  });

  it('ignores scores outside 0-100 range (T-04-03 threat mitigation)', () => {
    // Scores outside 0-100 should be filtered out
    expect(recencyWeightedAverage([80, 150, 60])).toBeCloseTo(
      (80 * 1.0 + 60 * 0.8) / (1.0 + 0.8),
      2,
    );
  });

  it('returns 0 when all scores are out of range', () => {
    expect(recencyWeightedAverage([-10, 200])).toBe(0);
  });
});

// ── extractScore ─────────────────────────────────────────────────────────

describe('extractScore', () => {
  it('returns finalScore when both finalScore and llmScore exist', () => {
    expect(
      extractScore(
        makeAssessment({ finalScore: 85, llmScore: 70, didNotGetTo: false }),
      ),
    ).toBe(85);
  });

  it('returns llmScore when finalScore is undefined', () => {
    expect(
      extractScore(makeAssessment({ llmScore: 70, didNotGetTo: false })),
    ).toBe(70);
  });

  it('returns null when didNotGetTo is true even if scores exist', () => {
    expect(
      extractScore(
        makeAssessment({ finalScore: 85, llmScore: 70, didNotGetTo: true }),
      ),
    ).toBeNull();
  });

  it('returns null when no score is available', () => {
    expect(extractScore(makeAssessment({ didNotGetTo: false }))).toBeNull();
  });

  it('returns null for scores outside 0-100 range', () => {
    expect(
      extractScore(makeAssessment({ finalScore: 150, didNotGetTo: false })),
    ).toBeNull();
    expect(
      extractScore(makeAssessment({ llmScore: -5, didNotGetTo: false })),
    ).toBeNull();
  });
});

// ── extractSkillTopicScores ──────────────────────────────────────────────

describe('extractSkillTopicScores', () => {
  it('maps question scores to skill and topic levels', () => {
    const session = makeSession({
      questions: [
        makeQuestion({
          id: 'week1-q1',
          weekNumber: 1,
          keywords: ['hooks', 'state'],
        }),
      ],
      assessments: {
        'week1-q1': makeAssessment({
          questionId: 'week1-q1',
          finalScore: 80,
        }),
      },
      techMap: { 1: 'react' },
    });

    const result = extractSkillTopicScores(session);

    // Skill-level: react -> "" -> [80]
    expect(result.get('react')?.get('')).toEqual([80]);
    // Topic-level: react -> "hooks" -> [80], react -> "state" -> [80]
    expect(result.get('react')?.get('hooks')).toEqual([80]);
    expect(result.get('react')?.get('state')).toEqual([80]);
  });

  it('excludes starter questions (id prefix "starter-")', () => {
    const session = makeSession({
      questions: [
        makeQuestion({ id: 'starter-1', weekNumber: 1, keywords: ['intro'] }),
        makeQuestion({
          id: 'week1-q1',
          weekNumber: 1,
          keywords: ['hooks'],
        }),
      ],
      assessments: {
        'starter-1': makeAssessment({
          questionId: 'starter-1',
          finalScore: 90,
        }),
        'week1-q1': makeAssessment({
          questionId: 'week1-q1',
          finalScore: 70,
        }),
      },
      techMap: { 1: 'react' },
    });

    const result = extractSkillTopicScores(session);
    // Only week1-q1 counted
    expect(result.get('react')?.get('')).toEqual([70]);
  });

  it('excludes questions with didNotGetTo=true', () => {
    const session = makeSession({
      questions: [
        makeQuestion({
          id: 'week1-q1',
          weekNumber: 1,
          keywords: ['hooks'],
        }),
        makeQuestion({
          id: 'week1-q2',
          questionNumber: 2,
          weekNumber: 1,
          keywords: ['effects'],
        }),
      ],
      assessments: {
        'week1-q1': makeAssessment({
          questionId: 'week1-q1',
          finalScore: 80,
        }),
        'week1-q2': makeAssessment({
          questionId: 'week1-q2',
          finalScore: 60,
          didNotGetTo: true,
        }),
      },
      techMap: { 1: 'react' },
    });

    const result = extractSkillTopicScores(session);
    // Only week1-q1 counted
    expect(result.get('react')?.get('')).toEqual([80]);
    expect(result.get('react')?.has('effects')).toBe(false);
  });

  it('normalizes keywords to lowercase and trimmed', () => {
    const session = makeSession({
      questions: [
        makeQuestion({
          id: 'week1-q1',
          weekNumber: 1,
          keywords: ['React Hooks', ' useState '],
        }),
      ],
      assessments: {
        'week1-q1': makeAssessment({
          questionId: 'week1-q1',
          finalScore: 85,
        }),
      },
      techMap: { 1: 'react' },
    });

    const result = extractSkillTopicScores(session);
    expect(result.get('react')?.get('react hooks')).toEqual([85]);
    expect(result.get('react')?.get('usestate')).toEqual([85]);
  });

  it('skips questions with no techMap entry for weekNumber', () => {
    const session = makeSession({
      questions: [
        makeQuestion({ id: 'week5-q1', weekNumber: 5, keywords: ['x'] }),
      ],
      assessments: {
        'week5-q1': makeAssessment({
          questionId: 'week5-q1',
          finalScore: 75,
        }),
      },
      techMap: { 1: 'react' }, // no mapping for week 5
    });

    const result = extractSkillTopicScores(session);
    expect(result.size).toBe(0);
  });

  it('skips session with no techMap', () => {
    const session = makeSession({ techMap: undefined });
    const result = extractSkillTopicScores(session);
    expect(result.size).toBe(0);
  });

  it('aggregates multiple questions for same skill', () => {
    const session = makeSession({
      questions: [
        makeQuestion({
          id: 'week1-q1',
          weekNumber: 1,
          keywords: ['hooks'],
        }),
        makeQuestion({
          id: 'week1-q2',
          questionNumber: 2,
          weekNumber: 1,
          keywords: ['hooks', 'context'],
        }),
      ],
      assessments: {
        'week1-q1': makeAssessment({
          questionId: 'week1-q1',
          finalScore: 80,
        }),
        'week1-q2': makeAssessment({
          questionId: 'week1-q2',
          finalScore: 60,
        }),
      },
      techMap: { 1: 'react' },
    });

    const result = extractSkillTopicScores(session);
    // Skill-level: both scores
    expect(result.get('react')?.get('')).toEqual([80, 60]);
    // Topic "hooks": both questions
    expect(result.get('react')?.get('hooks')).toEqual([80, 60]);
    // Topic "context": only q2
    expect(result.get('react')?.get('context')).toEqual([60]);
  });
});

// ── computeGapScores ─────────────────────────────────────────────────────

describe('computeGapScores', () => {
  it('returns empty array for empty sessions', () => {
    expect(computeGapScores([])).toEqual([]);
  });

  it('computes single-session gap scores', () => {
    const sessions = [
      makeSession({
        questions: [
          makeQuestion({
            id: 'week1-q1',
            weekNumber: 1,
            keywords: ['hooks'],
          }),
        ],
        assessments: {
          'week1-q1': makeAssessment({
            questionId: 'week1-q1',
            finalScore: 80,
          }),
        },
        techMap: { 1: 'react' },
      }),
    ];

    const result = computeGapScores(sessions);

    // Should have skill-level "react"/"" and topic-level "react"/"hooks"
    const skillLevel = result.find(
      (g) => g.skill === 'react' && g.topic === '',
    );
    expect(skillLevel).toBeDefined();
    expect(skillLevel!.weightedScore).toBeCloseTo(80, 2);
    expect(skillLevel!.sessionCount).toBe(1);

    const topicLevel = result.find(
      (g) => g.skill === 'react' && g.topic === 'hooks',
    );
    expect(topicLevel).toBeDefined();
    expect(topicLevel!.weightedScore).toBeCloseTo(80, 2);
    expect(topicLevel!.sessionCount).toBe(1);
  });

  it('applies recency-weighted average across multiple sessions', () => {
    const sessions = [
      // Newest session: react score = 90
      makeSession({
        id: 'session-2',
        date: '2026-04-14',
        questions: [
          makeQuestion({
            id: 'week1-q1',
            weekNumber: 1,
            keywords: ['hooks'],
          }),
        ],
        assessments: {
          'week1-q1': makeAssessment({
            questionId: 'week1-q1',
            finalScore: 90,
          }),
        },
        techMap: { 1: 'react' },
      }),
      // Older session: react score = 60
      makeSession({
        id: 'session-1',
        date: '2026-04-10',
        questions: [
          makeQuestion({
            id: 'week1-q1',
            weekNumber: 1,
            keywords: ['hooks'],
          }),
        ],
        assessments: {
          'week1-q1': makeAssessment({
            questionId: 'week1-q1',
            finalScore: 60,
          }),
        },
        techMap: { 1: 'react' },
      }),
    ];

    const result = computeGapScores(sessions);
    const skillLevel = result.find(
      (g) => g.skill === 'react' && g.topic === '',
    );
    // (90*1.0 + 60*0.8) / (1.0+0.8) = 138/1.8 = 76.67
    expect(skillLevel!.weightedScore).toBeCloseTo(76.67, 2);
    expect(skillLevel!.sessionCount).toBe(2);
  });

  it('handles multi-skill sessions', () => {
    const sessions = [
      makeSession({
        questions: [
          makeQuestion({
            id: 'week1-q1',
            weekNumber: 1,
            keywords: ['hooks'],
          }),
          makeQuestion({
            id: 'week2-q1',
            questionNumber: 2,
            weekNumber: 2,
            keywords: ['types'],
          }),
        ],
        assessments: {
          'week1-q1': makeAssessment({
            questionId: 'week1-q1',
            finalScore: 80,
          }),
          'week2-q1': makeAssessment({
            questionId: 'week2-q1',
            finalScore: 70,
          }),
        },
        techMap: { 1: 'react', 2: 'typescript' },
      }),
    ];

    const result = computeGapScores(sessions);
    expect(result.find((g) => g.skill === 'react' && g.topic === '')).toBeDefined();
    expect(result.find((g) => g.skill === 'typescript' && g.topic === '')).toBeDefined();
  });

  it('averages multiple questions per skill within a session before weighting', () => {
    // Two sessions, first has 2 react questions (80, 60 -> avg 70), second has 1 (90)
    const sessions = [
      // Newest: single question, score 90
      makeSession({
        id: 'session-2',
        questions: [
          makeQuestion({
            id: 'week1-q1',
            weekNumber: 1,
            keywords: ['hooks'],
          }),
        ],
        assessments: {
          'week1-q1': makeAssessment({
            questionId: 'week1-q1',
            finalScore: 90,
          }),
        },
        techMap: { 1: 'react' },
      }),
      // Older: two questions, scores 80 and 60 -> session avg = 70
      makeSession({
        id: 'session-1',
        questions: [
          makeQuestion({
            id: 'week1-q1',
            weekNumber: 1,
            keywords: ['hooks'],
          }),
          makeQuestion({
            id: 'week1-q2',
            questionNumber: 2,
            weekNumber: 1,
            keywords: ['state'],
          }),
        ],
        assessments: {
          'week1-q1': makeAssessment({
            questionId: 'week1-q1',
            finalScore: 80,
          }),
          'week1-q2': makeAssessment({
            questionId: 'week1-q2',
            finalScore: 60,
          }),
        },
        techMap: { 1: 'react' },
      }),
    ];

    const result = computeGapScores(sessions);
    const skillLevel = result.find(
      (g) => g.skill === 'react' && g.topic === '',
    );
    // Session averages: [90, 70] (newest first)
    // Weighted: (90*1.0 + 70*0.8) / (1.0+0.8) = (90+56)/1.8 = 81.11
    expect(skillLevel!.weightedScore).toBeCloseTo(81.11, 2);
    expect(skillLevel!.sessionCount).toBe(2);
  });

  it('handles three sessions with decay', () => {
    const sessions = [
      makeSession({
        id: 's3',
        questions: [
          makeQuestion({ id: 'w1q1', weekNumber: 1, keywords: ['a'] }),
        ],
        assessments: {
          w1q1: makeAssessment({ questionId: 'w1q1', finalScore: 90 }),
        },
        techMap: { 1: 'react' },
      }),
      makeSession({
        id: 's2',
        questions: [
          makeQuestion({ id: 'w1q1', weekNumber: 1, keywords: ['a'] }),
        ],
        assessments: {
          w1q1: makeAssessment({ questionId: 'w1q1', finalScore: 70 }),
        },
        techMap: { 1: 'react' },
      }),
      makeSession({
        id: 's1',
        questions: [
          makeQuestion({ id: 'w1q1', weekNumber: 1, keywords: ['a'] }),
        ],
        assessments: {
          w1q1: makeAssessment({ questionId: 'w1q1', finalScore: 50 }),
        },
        techMap: { 1: 'react' },
      }),
    ];

    const result = computeGapScores(sessions);
    const skillLevel = result.find(
      (g) => g.skill === 'react' && g.topic === '',
    );
    // (90*1.0 + 70*0.8 + 50*0.64) / (1.0+0.8+0.64) = 178/2.44 = 72.95
    expect(skillLevel!.weightedScore).toBeCloseTo(72.95, 2);
    expect(skillLevel!.sessionCount).toBe(3);
  });
});
