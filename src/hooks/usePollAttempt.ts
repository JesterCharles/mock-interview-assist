/**
 * usePollAttempt — Phase 40 Plan 04 Task 1
 *
 * Client hook to poll /api/coding/attempts/[id] with exponential backoff.
 * Schedule: 500ms initial, factor 1.5, cap 5000ms, wall-timeout 60_000ms.
 *
 * Phase inference (CONTEXT D-11): the server returns verdict='pending' for
 * both queued AND running states. We infer client-side:
 *   - elapsed since submittedAt < 1500ms → 'queued'
 *   - else → 'running'
 *
 * Debt ticket (v1.5): extend poll response with an explicit `phase` field so
 * we don't need client-side elapsed-time inference.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AttemptVerdict =
  | 'pending'
  | 'pass'
  | 'fail'
  | 'timeout'
  | 'mle'
  | 'runtime_error'
  | 'compile_error';

export interface VisibleTestResult {
  caseId: string;
  passed: boolean;
  stdout: string | null;
  durationMs: number | null;
}

export interface HiddenTestAggregate {
  passed: number;
  total: number;
}

export interface AttemptPollResponse {
  attemptId: string;
  verdict: AttemptVerdict;
  score: number | null;
  visibleTestResults: VisibleTestResult[];
  hiddenTestResults: HiddenTestAggregate;
  submittedAt: string;
  completedAt: string | null;
}

export type PollPhase = 'queued' | 'running' | 'terminal' | null;

export type PollStatus =
  | 'idle'
  | 'polling'
  | 'resolved'
  | 'timeout-waiting'
  | 'error';

export interface PollError {
  code: string;
  message: string;
}

export interface UsePollAttemptReturn {
  status: PollStatus;
  response: AttemptPollResponse | null;
  phase: PollPhase;
  error: PollError | null;
}

export const POLL_CONSTANTS = {
  INITIAL_DELAY_MS: 500,
  MAX_DELAY_MS: 5000,
  BACKOFF_FACTOR: 1.5,
  WALL_TIMEOUT_MS: 60_000,
  QUEUED_WINDOW_MS: 1_500,
} as const;

const TERMINAL_VERDICTS: AttemptVerdict[] = [
  'pass',
  'fail',
  'timeout',
  'mle',
  'runtime_error',
  'compile_error',
];

function inferPhase(
  response: AttemptPollResponse | null,
): PollPhase {
  if (!response) return null;
  if (TERMINAL_VERDICTS.includes(response.verdict)) return 'terminal';
  try {
    const submittedAt = Date.parse(response.submittedAt);
    if (Number.isFinite(submittedAt)) {
      const elapsed = Date.now() - submittedAt;
      return elapsed < POLL_CONSTANTS.QUEUED_WINDOW_MS ? 'queued' : 'running';
    }
  } catch {
    /* fall through */
  }
  return 'running';
}

export function usePollAttempt(attemptId: string | null): UsePollAttemptReturn {
  const [status, setStatus] = useState<PollStatus>('idle');
  const [response, setResponse] = useState<AttemptPollResponse | null>(null);
  const [error, setError] = useState<PollError | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);
  const delayRef = useRef<number>(POLL_CONSTANTS.INITIAL_DELAY_MS);
  const mountedRef = useRef(true);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const poll = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/coding/attempts/${id}`, {
        credentials: 'include',
        signal: controller.signal,
      });

      if (!mountedRef.current) return;

      if (!res.ok) {
        if (res.status === 404) {
          setStatus('error');
          setError({ code: 'NOT_FOUND', message: 'Attempt not found' });
          clearTimer();
          return;
        }
        if (res.status === 403) {
          setStatus('error');
          setError({ code: 'FORBIDDEN', message: 'Not authorized' });
          clearTimer();
          return;
        }
        if (res.status === 429) {
          // Respect Retry-After but clamp to remaining wall budget.
          const hdr = res.headers.get('Retry-After');
          const retrySecs = hdr ? Number.parseInt(hdr, 10) : NaN;
          const remaining =
            POLL_CONSTANTS.WALL_TIMEOUT_MS - (Date.now() - startedAtRef.current);
          if (remaining <= 0) {
            setStatus('timeout-waiting');
            clearTimer();
            return;
          }
          const nextDelay = Math.min(
            Number.isFinite(retrySecs) ? retrySecs * 1000 : delayRef.current,
            remaining,
          );
          delayRef.current = Math.min(
            delayRef.current * POLL_CONSTANTS.BACKOFF_FACTOR,
            POLL_CONSTANTS.MAX_DELAY_MS,
          );
          schedulePoll(id, nextDelay);
          return;
        }

        // Other errors: still retry with backoff until wall clock.
        setError({ code: 'HTTP_ERROR', message: `HTTP ${res.status}` });
        scheduleOrTimeout(id);
        return;
      }

      const body = (await res.json()) as AttemptPollResponse;
      if (!mountedRef.current) return;

      setResponse(body);
      setError(null);

      if (TERMINAL_VERDICTS.includes(body.verdict)) {
        setStatus('resolved');
        clearTimer();
        return;
      }

      // Still pending → schedule next poll unless wall clock exceeded.
      scheduleOrTimeout(id);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError({
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      });
      scheduleOrTimeout(id);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: schedule next poll OR mark wall-clock timeout.
  function scheduleOrTimeout(id: string) {
    const remaining =
      POLL_CONSTANTS.WALL_TIMEOUT_MS - (Date.now() - startedAtRef.current);
    if (remaining <= 0) {
      setStatus('timeout-waiting');
      clearTimer();
      return;
    }
    const delay = Math.min(delayRef.current, remaining);
    delayRef.current = Math.min(
      delayRef.current * POLL_CONSTANTS.BACKOFF_FACTOR,
      POLL_CONSTANTS.MAX_DELAY_MS,
    );
    schedulePoll(id, delay);
  }

  function schedulePoll(id: string, delay: number) {
    clearTimer();
    timerRef.current = setTimeout(() => {
      void poll(id);
    }, delay);
  }

  useEffect(() => {
    mountedRef.current = true;
    if (!attemptId) {
      setStatus('idle');
      setResponse(null);
      setError(null);
      clearTimer();
      abortRef.current?.abort();
      return () => {
        mountedRef.current = false;
      };
    }
    // Reset for fresh attempt
    startedAtRef.current = Date.now();
    delayRef.current = POLL_CONSTANTS.INITIAL_DELAY_MS;
    setStatus('polling');
    setResponse(null);
    setError(null);
    void poll(attemptId);

    return () => {
      mountedRef.current = false;
      clearTimer();
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  return {
    status,
    response,
    phase: inferPhase(response),
    error,
  };
}
