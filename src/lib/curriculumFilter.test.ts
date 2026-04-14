/**
 * curriculumFilter.test.ts
 *
 * Tests for filterTechsByCurriculum and filterGapScoresByCurriculum.
 * Key invariant: EXACT (case-insensitive) first-path-segment matching — no substring.
 * Codex finding #9: "react" must NOT match "react-native/..."
 */

import { describe, it, expect } from 'vitest';
import { filterTechsByCurriculum, filterGapScoresByCurriculum } from './curriculumFilter';
import type { GitHubFile } from './github-service';
import type { SkillGapScore } from './adaptiveSetup';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeFile = (path: string): GitHubFile => ({
  name: path.split('/').pop() ?? path,
  path,
  sha: 'abc',
  size: 100,
  url: '',
  html_url: '',
  git_url: '',
  download_url: '',
  type: 'file',
});

const reactFile = makeFile('react/question-bank-v1.md');
const reactNativeFile = makeFile('react-native/question-bank-v1.md');
const typescriptFile = makeFile('typescript/question-bank-v1.md');
const postgresqlFile = makeFile('postgresql/question-bank-v1.md');
const nodeFile = makeFile('node/question-bank-v1.md');
const nodeJsFile = makeFile('nodejs/question-bank-v1.md');
const rustFile = makeFile('rust/question-bank-v1.md');
const upperCaseFile = makeFile('React/question-bank-v1.md');

const ALL_TECHS = [
  reactFile,
  reactNativeFile,
  typescriptFile,
  postgresqlFile,
  nodeFile,
  nodeJsFile,
  rustFile,
];

// ---------------------------------------------------------------------------
// filterTechsByCurriculum
// ---------------------------------------------------------------------------

describe('filterTechsByCurriculum', () => {
  it('returns all techs when taughtSlugs is empty (fallback D-17)', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, []);
    expect(result).toHaveLength(ALL_TECHS.length);
    expect(result).toEqual(ALL_TECHS);
  });

  it('includes react when taughtSlugs=["react"]', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, ['react']);
    const paths = result.map(f => f.path);
    expect(paths).toContain('react/question-bank-v1.md');
  });

  it('EXCLUDES react-native when taughtSlugs=["react"] — no substring match (Codex #9)', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, ['react']);
    const paths = result.map(f => f.path);
    expect(paths).not.toContain('react-native/question-bank-v1.md');
  });

  it('EXCLUDES postgresql when taughtSlugs=["sql"]', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, ['sql']);
    const paths = result.map(f => f.path);
    expect(paths).not.toContain('postgresql/question-bank-v1.md');
    expect(result).toHaveLength(0);
  });

  it('includes node when taughtSlugs=["node"]', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, ['node']);
    const paths = result.map(f => f.path);
    expect(paths).toContain('node/question-bank-v1.md');
  });

  it('EXCLUDES nodejs when taughtSlugs=["node"] — exact match only', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, ['node']);
    const paths = result.map(f => f.path);
    expect(paths).not.toContain('nodejs/question-bank-v1.md');
  });

  it('EXCLUDES node when taughtSlugs=["nodejs"]', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, ['nodejs']);
    const paths = result.map(f => f.path);
    expect(paths).not.toContain('node/question-bank-v1.md');
    expect(paths).toContain('nodejs/question-bank-v1.md');
  });

  it('is case-insensitive — "React/" with taughtSlugs=["react"] is included', () => {
    const result = filterTechsByCurriculum([upperCaseFile], ['react']);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('React/question-bank-v1.md');
  });

  it('filters to multiple slugs', () => {
    const result = filterTechsByCurriculum(ALL_TECHS, ['react', 'typescript']);
    const paths = result.map(f => f.path);
    expect(paths).toContain('react/question-bank-v1.md');
    expect(paths).toContain('typescript/question-bank-v1.md');
    expect(paths).not.toContain('react-native/question-bank-v1.md');
    expect(paths).not.toContain('node/question-bank-v1.md');
  });

  it('returns empty array when no techs match any slug', () => {
    const result = filterTechsByCurriculum([reactFile], ['python']);
    expect(result).toHaveLength(0);
  });

  it('handles empty techs array', () => {
    const result = filterTechsByCurriculum([], ['react']);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterGapScoresByCurriculum
// ---------------------------------------------------------------------------

describe('filterGapScoresByCurriculum', () => {
  const scores: SkillGapScore[] = [
    { skill: 'react/question-bank-v1.md', weightedScore: 0.8 },
    { skill: 'react-native/question-bank-v1.md', weightedScore: 0.5 },
    { skill: 'typescript/question-bank-v1.md', weightedScore: 0.6 },
    { skill: 'postgresql/question-bank-v1.md', weightedScore: 0.3 },
  ];

  it('returns all scores when taughtSlugs is empty', () => {
    const result = filterGapScoresByCurriculum(scores, []);
    expect(result).toHaveLength(scores.length);
  });

  it('filters to react only — excludes react-native (Codex #9)', () => {
    const result = filterGapScoresByCurriculum(scores, ['react']);
    const skills = result.map(s => s.skill);
    expect(skills).toContain('react/question-bank-v1.md');
    expect(skills).not.toContain('react-native/question-bank-v1.md');
  });

  it('filters to multiple slugs', () => {
    const result = filterGapScoresByCurriculum(scores, ['react', 'typescript']);
    expect(result).toHaveLength(2);
    const skills = result.map(s => s.skill);
    expect(skills).toContain('react/question-bank-v1.md');
    expect(skills).toContain('typescript/question-bank-v1.md');
  });

  it('returns empty array when no match', () => {
    const result = filterGapScoresByCurriculum(scores, ['python']);
    expect(result).toHaveLength(0);
  });
});
