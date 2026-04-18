// @vitest-environment jsdom
/**
 * VerdictCard.test.tsx — Phase 40 Plan 04 Task 2
 *
 * Includes the CRITICAL hidden-test leakage guards:
 *   - DOM leakage: if hidden test payload is tampered with extra fields, they
 *     must NEVER reach the DOM.
 *   - Source grep: the component file must not reference forbidden hidden-test
 *     property paths.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VerdictCard } from './VerdictCard';
import type { AttemptPollResponse } from '@/hooks/usePollAttempt';

function baseResponse(overrides: Partial<AttemptPollResponse> = {}): AttemptPollResponse {
  return {
    attemptId: 'a1',
    verdict: 'pass',
    score: 100,
    visibleTestResults: [],
    hiddenTestResults: { passed: 2, total: 2 },
    submittedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('VerdictCard — phase states', () => {
  it('queued phase renders queued message', () => {
    render(<VerdictCard response={null} phase="queued" error={null} />);
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
  });

  it('running phase renders running message', () => {
    render(
      <VerdictCard
        response={baseResponse({ verdict: 'pending' })}
        phase="running"
        error={null}
      />,
    );
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });

  it('error state renders danger card', () => {
    render(
      <VerdictCard
        response={null}
        phase={null}
        error={{ code: 'NOT_FOUND', message: 'oops' }}
      />,
    );
    expect(screen.getByText(/oops/i)).toBeInTheDocument();
  });
});

describe('VerdictCard — terminal verdicts', () => {
  it('pass renders Passed label + score', () => {
    render(
      <VerdictCard
        response={baseResponse({ verdict: 'pass', score: 100 })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('fail renders Failed label', () => {
    render(
      <VerdictCard
        response={baseResponse({ verdict: 'fail', score: 20 })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('timeout / mle / runtime_error / compile_error map to their labels', () => {
    const { rerender } = render(
      <VerdictCard
        response={baseResponse({ verdict: 'timeout', score: 0 })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText(/time limit exceeded/i)).toBeInTheDocument();

    rerender(
      <VerdictCard
        response={baseResponse({ verdict: 'mle', score: 0 })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText(/memory limit exceeded/i)).toBeInTheDocument();

    rerender(
      <VerdictCard
        response={baseResponse({ verdict: 'runtime_error', score: 0 })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText(/runtime error/i)).toBeInTheDocument();

    rerender(
      <VerdictCard
        response={baseResponse({ verdict: 'compile_error', score: 0 })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText(/compile error/i)).toBeInTheDocument();
  });

  it('renders null score as em-dash', () => {
    render(
      <VerdictCard
        response={baseResponse({ verdict: 'pass', score: null })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders visible test accordion with stdout + duration', () => {
    render(
      <VerdictCard
        response={baseResponse({
          visibleTestResults: [
            {
              caseId: 'c1',
              passed: true,
              stdout: 'hello\n',
              durationMs: 42,
            },
          ],
        })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText('Case 1')).toBeInTheDocument();
    expect(screen.getByText('pass')).toBeInTheDocument();
    expect(screen.getByText('42ms')).toBeInTheDocument();
  });

  it('hidden tests pill shows "X/Y hidden tests passed"', () => {
    render(
      <VerdictCard
        response={baseResponse({
          hiddenTestResults: { passed: 4, total: 7 },
        })}
        phase="terminal"
        error={null}
      />,
    );
    expect(screen.getByText(/4\/7 hidden tests passed/)).toBeInTheDocument();
  });
});

describe('VerdictCard — HIDDEN TEST LEAKAGE GUARDS', () => {
  it('DOM-leakage: extra props injected into hiddenTestResults do not appear in rendered HTML', () => {
    const evilHidden = {
      passed: 3,
      total: 3,
      stdin: 'SECRET_INPUT_12345',
      expectedStdout: 'SECRET_EXPECTED_XYZ',
    } as unknown as { passed: number; total: number };
    const evilResponse = baseResponse({ hiddenTestResults: evilHidden });
    const { container } = render(
      <VerdictCard response={evilResponse} phase="terminal" error={null} />,
    );
    expect(container.innerHTML).not.toContain('SECRET_INPUT_12345');
    expect(container.innerHTML).not.toContain('SECRET_EXPECTED_XYZ');
  });

  it('source-grep: VerdictCard.tsx does NOT reference forbidden hidden-test paths', () => {
    const src = readFileSync(
      resolve(__dirname, 'VerdictCard.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/hiddenTestResults\s*\.\s*stdin/);
    expect(src).not.toMatch(/hiddenTestResults\s*\.\s*expectedStdout/);
    expect(src).not.toMatch(/hiddenTestResults\s*\.\s*stdout/);
    // Also: no `hiddenTests` map/forEach iterations
    expect(src).not.toMatch(/hiddenTestResults\.map\(/);
    expect(src).not.toMatch(/hiddenTestResults\.forEach\(/);
  });
});
