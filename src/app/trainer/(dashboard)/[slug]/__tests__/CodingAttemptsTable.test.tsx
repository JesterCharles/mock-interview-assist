// @vitest-environment jsdom
/**
 * Tests for CodingAttemptsTable (Phase 41 Plan 02 Task 2).
 *
 * Validates CODING-SCORE-03 render behavior (per-associate coding attempt
 * table): empty state copy, verdict badge mapping, difficulty pill, score
 * formatting, and date formatting. Pure render — no network, no recharts.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CodingAttemptsTable } from '@/app/trainer/(dashboard)/[slug]/CodingAttemptsTable';
import type { CodingAttemptSummary } from '@/lib/trainer-types';

function attempt(overrides: Partial<CodingAttemptSummary> = {}): CodingAttemptSummary {
  return {
    id: 'a-default',
    submittedAt: '2026-04-17T12:00:00Z',
    challengeSlug: 'two-sum',
    challengeTitle: 'Two Sum',
    language: 'python',
    difficulty: 'medium',
    verdict: 'pass',
    score: 100,
    ...overrides,
  };
}

describe('CodingAttemptsTable', () => {
  it('renders empty-state copy when attempts is empty', () => {
    render(<CodingAttemptsTable attempts={[]} />);
    expect(screen.getByText('No coding attempts yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a row per attempt with title, language, difficulty, verdict, score', () => {
    render(
      <CodingAttemptsTable
        attempts={[
          attempt({ id: 'a1', challengeTitle: 'Two Sum', language: 'python', verdict: 'pass', score: 100 }),
          attempt({ id: 'a2', challengeTitle: 'Reverse String', language: 'typescript', difficulty: 'easy', verdict: 'fail', score: 40 }),
        ]}
      />,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('Reverse String')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('pass')).toBeInTheDocument();
    expect(screen.getByText('fail')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('easy')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders em-dash for null score', () => {
    render(<CodingAttemptsTable attempts={[attempt({ score: null })]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('verdict badge applies success color for pass', () => {
    render(<CodingAttemptsTable attempts={[attempt({ verdict: 'pass' })]} />);
    const badge = screen.getByText('pass');
    expect(badge).toHaveStyle({ color: 'var(--success)' });
  });

  it('verdict badge applies danger color for fail/timeout/compile_error', () => {
    render(
      <CodingAttemptsTable
        attempts={[
          attempt({ id: 'f1', verdict: 'fail' }),
          attempt({ id: 'f2', verdict: 'timeout' }),
          attempt({ id: 'f3', verdict: 'compile_error' }),
        ]}
      />,
    );
    for (const label of ['fail', 'timeout', 'compile_error']) {
      expect(screen.getByText(label)).toHaveStyle({ color: 'var(--danger)' });
    }
  });

  it('verdict badge applies muted color for pending', () => {
    render(<CodingAttemptsTable attempts={[attempt({ verdict: 'pending', score: null })]} />);
    expect(screen.getByText('pending')).toHaveStyle({ color: 'var(--muted)' });
  });

  it('formats submittedAt ISO as "MMM d, yyyy"', () => {
    render(
      <CodingAttemptsTable
        attempts={[attempt({ submittedAt: '2026-04-17T12:00:00Z' })]}
      />,
    );
    // Intl en-US: "Apr 17, 2026"
    expect(screen.getByText('Apr 17, 2026')).toBeInTheDocument();
  });

  it('renders expected column headers', () => {
    render(<CodingAttemptsTable attempts={[attempt()]} />);
    for (const h of ['Date', 'Challenge', 'Language', 'Difficulty', 'Verdict', 'Score']) {
      expect(screen.getByRole('columnheader', { name: h })).toBeInTheDocument();
    }
  });
});
