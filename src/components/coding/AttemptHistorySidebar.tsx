/**
 * AttemptHistorySidebar — Phase 40 Plan 04 Task 3
 *
 * Lists last 10 attempts for (caller, challenge). Fetches on mount + whenever
 * `refreshToken` prop changes. Clicking View fires `onSelectAttempt(id)`.
 */
'use client';

import { useEffect, useRef, useState } from 'react';

export interface AttemptHistoryItem {
  attemptId: string;
  verdict: string;
  language: string;
  submittedAt: string;
  score: number | null;
}

export interface AttemptHistorySidebarProps {
  challengeId: string;
  onSelectAttempt: (attemptId: string) => void;
  refreshToken: number;
  currentAttemptId: string | null;
}

function verdictColor(v: string): { bg: string; fg: string; label: string } {
  if (v === 'pass') return { bg: 'var(--success-bg)', fg: 'var(--success)', label: 'pass' };
  if (v === 'pending')
    return { bg: 'var(--surface-muted)', fg: 'var(--muted)', label: 'pending' };
  if (v === 'timeout' || v === 'mle')
    return { bg: 'var(--warning-bg)', fg: 'var(--warning)', label: v };
  return { bg: 'var(--danger-bg)', fg: 'var(--danger)', label: v };
}

export function AttemptHistorySidebar({
  challengeId,
  onSelectAttempt,
  refreshToken,
  currentAttemptId,
}: AttemptHistorySidebarProps) {
  const [items, setItems] = useState<AttemptHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/coding/attempts?challengeId=${encodeURIComponent(challengeId)}&limit=10`,
          { credentials: 'include', signal: controller.signal },
        );
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          setItems([]);
          return;
        }
        const body = (await res.json()) as { items: AttemptHistoryItem[] };
        setItems(body.items ?? []);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Fetch failed');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [challengeId, refreshToken]);

  return (
    <aside
      data-testid="attempt-history"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontWeight: 500,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          margin: 0,
        }}
      >
        Recent Attempts
      </h3>
      {loading && (
        <p
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '13px',
            color: 'var(--muted)',
            margin: 0,
          }}
        >
          Loading…
        </p>
      )}
      {!loading && error && (
        <p
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '13px',
            color: 'var(--danger)',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
            color: 'var(--muted)',
            margin: 0,
          }}
        >
          No attempts yet.
        </p>
      )}
      {items.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {items.map((a) => {
            const vc = verdictColor(a.verdict);
            const isCurrent = a.attemptId === currentAttemptId;
            return (
              <li
                key={a.attemptId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '6px',
                  background: isCurrent ? 'var(--surface-muted)' : 'transparent',
                  border: isCurrent ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily:
                        "var(--font-dm-sans), 'DM Sans', sans-serif",
                      fontSize: '13px',
                      color: 'var(--muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {new Date(a.submittedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
                    {a.language}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: vc.bg,
                      color: vc.fg,
                      fontFamily:
                        "var(--font-dm-sans), 'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                  >
                    {vc.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectAttempt(a.attemptId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent)',
                      fontFamily:
                        "var(--font-dm-sans), 'DM Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    View
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

export default AttemptHistorySidebar;
