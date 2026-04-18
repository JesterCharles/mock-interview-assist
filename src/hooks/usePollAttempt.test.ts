// @vitest-environment jsdom
/**
 * usePollAttempt.test.ts — Phase 40 Plan 04 Task 1
 *
 * Uses vi.useFakeTimers() to walk the exponential-backoff schedule.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';
import { usePollAttempt, POLL_CONSTANTS } from './usePollAttempt';

function Probe({ attemptId }: { attemptId: string | null }) {
  const s = usePollAttempt(attemptId);
  return createElement(
    'div',
    null,
    createElement('span', { 'data-testid': 'status' }, s.status),
    createElement('span', { 'data-testid': 'verdict' }, s.response?.verdict ?? ''),
    createElement('span', { 'data-testid': 'error-code' }, s.error?.code ?? ''),
  );
}

type FetchResponse = {
  ok: boolean;
  status: number;
  headers?: { get: (k: string) => string | null };
  json: () => Promise<unknown>;
};

function pendingResponse(overrides?: Partial<unknown>): FetchResponse {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      attemptId: 'a1',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: { passed: 0, total: 3 },
      submittedAt: new Date(Date.now() - 2000).toISOString(),
      completedAt: null,
      ...(overrides as object),
    }),
  };
}

function passResponse(): FetchResponse {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      attemptId: 'a1',
      verdict: 'pass',
      score: 100,
      visibleTestResults: [],
      hiddenTestResults: { passed: 3, total: 3 },
      submittedAt: new Date(Date.now() - 2000).toISOString(),
      completedAt: new Date().toISOString(),
    }),
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});

afterEach(() => {
  delete (globalThis as unknown as { fetch?: unknown }).fetch;
  vi.useRealTimers();
});

describe('usePollAttempt', () => {
  it('null attemptId → idle, no fetch', () => {
    render(createElement(Probe, { attemptId: null }));
    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('terminal verdict stops polling (only one fetch)', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(passResponse());
    render(createElement(Probe, { attemptId: 'a1' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByTestId('verdict').textContent).toBe('pass');
    expect(screen.getByTestId('status').textContent).toBe('resolved');
    // Allow any scheduled timer to settle (there shouldn't be one)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pending → continues polling with backoff', async () => {
    vi.useFakeTimers();
    // First three calls pending, then pass
    fetchMock.mockResolvedValueOnce(pendingResponse());
    fetchMock.mockResolvedValueOnce(pendingResponse());
    fetchMock.mockResolvedValueOnce(pendingResponse());
    fetchMock.mockResolvedValueOnce(passResponse());
    render(createElement(Probe, { attemptId: 'a1' }));

    // Initial fetch (fires immediately)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // First scheduled delay: 500ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_CONSTANTS.INITIAL_DELAY_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Next delay: 500 * 1.5 = 750ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Next delay: 750 * 1.5 = 1125ms → pass terminal
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId('status').textContent).toBe('resolved');
  });

  it('wall clock 60s → timeout-waiting and stops', async () => {
    vi.useFakeTimers();
    // Every poll returns pending
    fetchMock.mockImplementation(async () => pendingResponse());
    render(createElement(Probe, { attemptId: 'a1' }));

    // Advance past 60s in a couple of big chunks
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });

    expect(screen.getByTestId('status').textContent).toBe('timeout-waiting');
  });

  it('unmount clears pending timer (no stray fetches)', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(pendingResponse());
    const { unmount } = render(createElement(Probe, { attemptId: 'a1' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const callsAtUnmount = fetchMock.mock.calls.length;
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAtUnmount);
  });

  it('404 → error code NOT_FOUND, stops polling', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
    });
    render(createElement(Probe, { attemptId: 'a1' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByTestId('error-code').textContent).toBe('NOT_FOUND');
    expect(screen.getByTestId('status').textContent).toBe('error');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('attemptId change resets backoff + wall clock', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(pendingResponse());
    const { rerender } = render(createElement(Probe, { attemptId: 'a1' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const firstCount = fetchMock.mock.calls.length;
    rerender(createElement(Probe, { attemptId: 'a2' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    // Second id triggers an immediate fresh fetch
    expect(fetchMock.mock.calls.length).toBeGreaterThan(firstCount);
    const lastCallUrl = fetchMock.mock.calls.at(-1)?.[0] as string;
    expect(lastCallUrl).toContain('a2');
  });
});
