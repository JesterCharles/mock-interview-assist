// @vitest-environment jsdom
/**
 * AttemptHistorySidebar.test.tsx — Phase 40 Plan 04 Task 3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AttemptHistorySidebar } from './AttemptHistorySidebar';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});

afterEach(() => {
  delete (globalThis as unknown as { fetch?: unknown }).fetch;
});

function sample(overrides = {}) {
  return {
    attemptId: 'a1',
    verdict: 'pass',
    language: 'python',
    submittedAt: '2026-04-18T10:00:00Z',
    score: 100,
    ...overrides,
  };
}

describe('AttemptHistorySidebar', () => {
  it('fetches on mount and renders items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [sample(), sample({ attemptId: 'a2', verdict: 'fail' })],
      }),
    });
    render(
      <AttemptHistorySidebar
        challengeId="c1"
        onSelectAttempt={() => {}}
        refreshToken={0}
        currentAttemptId={null}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/recent attempts/i)).toBeInTheDocument(),
    );
    await waitFor(() => {
      expect(screen.getByText('pass')).toBeInTheDocument();
      expect(screen.getByText('fail')).toBeInTheDocument();
    });
  });

  it('renders empty state when no items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });
    render(
      <AttemptHistorySidebar
        challengeId="c1"
        onSelectAttempt={() => {}}
        refreshToken={0}
        currentAttemptId={null}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/no attempts yet/i)).toBeInTheDocument(),
    );
  });

  it('View button fires onSelectAttempt', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [sample({ attemptId: 'a42' })] }),
    });
    const onSelect = vi.fn();
    render(
      <AttemptHistorySidebar
        challengeId="c1"
        onSelectAttempt={onSelect}
        refreshToken={0}
        currentAttemptId={null}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /view/i }));
    expect(onSelect).toHaveBeenCalledWith('a42');
  });

  it('refreshToken change triggers refetch', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });
    const { rerender } = render(
      <AttemptHistorySidebar
        challengeId="c1"
        onSelectAttempt={() => {}}
        refreshToken={0}
        currentAttemptId={null}
      />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      rerender(
        <AttemptHistorySidebar
          challengeId="c1"
          onSelectAttempt={() => {}}
          refreshToken={1}
          currentAttemptId={null}
        />,
      );
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
