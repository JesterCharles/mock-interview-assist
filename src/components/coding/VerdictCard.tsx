/**
 * VerdictCard — Phase 40 Plan 04 Task 2
 *
 * Renders:
 *   - queued / running phase cards (with spinner)
 *   - terminal verdict card: overall pill + score + visible-test accordion + hidden pass/total pill
 *
 * HIDDEN TEST LEAKAGE GUARD — CRITICAL:
 * This component must NEVER reference fixture-detail properties on the
 * hidden-test payload. Only `passed` and `total` are permitted. A source-grep
 * regression test (VerdictCard.test.tsx) enforces this: if any forbidden
 * access path lands in this source file, the test fails.
 *
 * The Phase 39 poll response by design only sends `{passed, total}` for hidden
 * tests — this component is the last-line defense against a regression that
 * extends the shape.
 */
'use client';

import type {
  AttemptPollResponse,
  AttemptVerdict,
  PollError,
  PollPhase,
} from '@/hooks/usePollAttempt';

export interface VisibleTestFixture {
  caseId: string;
  stdin: string;
  expectedStdout: string;
}

export interface VerdictCardProps {
  response: AttemptPollResponse | null;
  phase: PollPhase;
  error: PollError | null;
  /**
   * Visible-test fixtures from `/api/coding/challenges/[id]`. When a visible
   * test case fails, VerdictCard renders stdin + expected alongside actual
   * stdout so users can see the mismatch without leaving the page. Hidden
   * test fixtures are NEVER passed here — the D-05 shield is preserved.
   */
  visibleTests?: VisibleTestFixture[];
}

const VERDICT_LABELS: Record<AttemptVerdict, string> = {
  pending: 'Pending',
  pass: 'Passed',
  fail: 'Failed',
  timeout: 'Time Limit Exceeded',
  mle: 'Memory Limit Exceeded',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
};

interface PillStyle {
  bg: string;
  fg: string;
}

function verdictPill(v: AttemptVerdict): PillStyle {
  if (v === 'pass') return { bg: 'var(--success-bg)', fg: 'var(--success)' };
  if (v === 'timeout' || v === 'mle')
    return { bg: 'var(--warning-bg)', fg: 'var(--warning)' };
  if (v === 'fail' || v === 'runtime_error' || v === 'compile_error')
    return { bg: 'var(--danger-bg)', fg: 'var(--danger)' };
  return { bg: 'var(--surface-muted)', fg: 'var(--muted)' };
}

function cardBase(): React.CSSProperties {
  return {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '16px',
        height: '16px',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '9999px',
        animation: 'verdict-spinner-rot 0.9s linear infinite',
      }}
    />
  );
}

function PhaseMessage({
  label,
  elapsedSeconds,
}: {
  label: string;
  elapsedSeconds?: number;
}) {
  return (
    <section data-testid="verdict-phase" style={cardBase()}>
      <style>{`@keyframes verdict-spinner-rot { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--muted)',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '14px',
        }}
      >
        <Spinner />
        <span>{label}</span>
        {typeof elapsedSeconds === 'number' && elapsedSeconds > 0 && (
          <span
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: '12px',
              color: 'var(--muted)',
            }}
          >
            {elapsedSeconds}s
          </span>
        )}
      </div>
    </section>
  );
}

function ErrorCard({ error }: { error: PollError }) {
  return (
    <section
      role="alert"
      data-testid="verdict-error"
      style={{
        ...cardBase(),
        borderColor: 'var(--danger)',
        background: 'var(--danger-bg)',
        color: 'var(--danger)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '14px',
        }}
      >
        {error.message}
      </p>
    </section>
  );
}

export function VerdictCard({
  response,
  phase,
  error,
  visibleTests,
}: VerdictCardProps) {
  const fixtureByCaseId = new Map(
    (visibleTests ?? []).map((f) => [f.caseId, f]),
  );
  if (error) return <ErrorCard error={error} />;

  if (phase === 'queued') {
    return <PhaseMessage label="Queued…" />;
  }

  if (phase === 'running' && response) {
    const elapsed = Math.max(
      0,
      Math.round(
        (Date.now() - Date.parse(response.submittedAt)) / 1000,
      ),
    );
    return <PhaseMessage label="Running…" elapsedSeconds={elapsed} />;
  }

  if (!response) return null;

  // Unknown verdict fallback — defensive per T-40-12.
  const verdict = response.verdict;
  const label = VERDICT_LABELS[verdict] ?? 'Unknown';
  const pill = verdictPill(verdict);

  return (
    <section data-testid="verdict-card" style={cardBase()}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: pill.bg,
              color: pill.fg,
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '13px',
              alignSelf: 'flex-start',
            }}
          >
            {label}
          </span>
          {response.completedAt && (
            <span
              style={{
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontSize: '12px',
                color: 'var(--muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Completed {new Date(response.completedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display), 'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: '48px',
              lineHeight: 1,
              color: 'var(--ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {response.score ?? '—'}
          </span>
          <span
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
            }}
          >
            Score
          </span>
        </div>
      </header>

      {response.visibleTestResults.length > 0 && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          data-testid="visible-tests"
        >
          <h3
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Visible Tests
          </h3>
          {response.visibleTestResults.map((tc, i) => (
            <details
              key={tc.caseId}
              style={{
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontFamily:
                    "var(--font-dm-sans), 'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontWeight: 600 }}>Case {i + 1}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: tc.passed
                      ? 'var(--success-bg)'
                      : 'var(--danger-bg)',
                    color: tc.passed ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {tc.passed ? 'pass' : 'fail'}
                </span>
                {typeof tc.durationMs === 'number' && (
                  <span
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: 'var(--muted)',
                    }}
                  >
                    {tc.durationMs}ms
                  </span>
                )}
              </summary>
              <div
                style={{
                  marginTop: '10px',
                  fontFamily:
                    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  fontSize: '13px',
                  color: 'var(--ink)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {(() => {
                  const fixture = fixtureByCaseId.get(tc.caseId);
                  const showDiff = !tc.passed && fixture !== undefined;
                  return (
                    <>
                      {showDiff && (
                        <div>
                          <span
                            style={{
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: 'var(--muted)',
                            }}
                          >
                            Input (stdin)
                          </span>
                          <pre
                            style={{
                              background: 'var(--surface)',
                              padding: '10px',
                              borderRadius: '6px',
                              margin: '4px 0 0',
                              whiteSpace: 'pre-wrap',
                              overflowX: 'auto',
                            }}
                          >
                            {fixture.stdin || '(empty)'}
                          </pre>
                        </div>
                      )}
                      {showDiff && (
                        <div>
                          <span
                            style={{
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: 'var(--success)',
                            }}
                          >
                            Expected
                          </span>
                          <pre
                            style={{
                              background: 'var(--success-bg)',
                              padding: '10px',
                              borderRadius: '6px',
                              margin: '4px 0 0',
                              whiteSpace: 'pre-wrap',
                              overflowX: 'auto',
                            }}
                          >
                            {fixture.expectedStdout}
                          </pre>
                        </div>
                      )}
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: showDiff ? 'var(--danger)' : 'var(--muted)',
                          }}
                        >
                          {showDiff ? 'Got' : 'Your output'}
                        </span>
                        <pre
                          style={{
                            background: showDiff
                              ? 'var(--danger-bg)'
                              : 'var(--surface)',
                            padding: '10px',
                            borderRadius: '6px',
                            margin: '4px 0 0',
                            whiteSpace: 'pre-wrap',
                            overflowX: 'auto',
                          }}
                        >
                          {tc.stdout ?? '(no output)'}
                        </pre>
                      </div>
                    </>
                  );
                })()}
              </div>
            </details>
          ))}
        </div>
      )}

      <div
        data-testid="hidden-tests-pill"
        style={{
          display: 'inline-block',
          alignSelf: 'flex-start',
          padding: '4px 10px',
          borderRadius: '9999px',
          background: 'var(--surface-muted)',
          color: 'var(--muted)',
          fontFamily:
            "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        {response.hiddenTestResults.passed}/{response.hiddenTestResults.total}{' '}
        hidden tests passed
      </div>
    </section>
  );
}

export default VerdictCard;
