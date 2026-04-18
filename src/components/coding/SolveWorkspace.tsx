/**
 * SolveWorkspace — Phase 40 Plan 03 Task 3
 *
 * Client composition: prompt (left) + editor/submit (right) on md+; stacked on mobile.
 * Holds `latestAttemptId` + `latestLanguage` + code state.
 *
 * Verdict display + attempt history sidebar + polling hook are wired in Plan 40-04.
 * For now, a placeholder surface shows the attempt id after Submit so users see
 * confirmation, and 40-04 fills in the rich verdict UI.
 */
'use client';

import { useState } from 'react';
import { ChallengePrompt } from './ChallengePrompt';
import { EditorPane } from './EditorPane';
import { SubmitBar } from './SubmitBar';
import type { SubmitBarError } from './SubmitBar';

export interface ChallengeDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  skillSlug: string;
  language: string;
  languages: string[];
  starters: Record<string, string>;
}

export interface SolveWorkspaceProps {
  challenge: ChallengeDetail;
}

function difficultyPill(d: string): { bg: string; fg: string; label: string } {
  if (d === 'easy')
    return { bg: 'var(--success-bg)', fg: 'var(--success)', label: 'Easy' };
  if (d === 'medium')
    return { bg: 'var(--warning-bg)', fg: 'var(--warning)', label: 'Medium' };
  if (d === 'hard')
    return { bg: 'var(--danger-bg)', fg: 'var(--danger)', label: 'Hard' };
  return {
    bg: 'var(--surface-muted)',
    fg: 'var(--muted)',
    label: d.charAt(0).toUpperCase() + d.slice(1),
  };
}

export function SolveWorkspace({ challenge }: SolveWorkspaceProps) {
  const initialLang = challenge.languages[0] ?? challenge.language ?? 'python';
  const [language, setLanguage] = useState<string>(initialLang);
  const [code, setCode] = useState<string>(challenge.starters[initialLang] ?? '');
  const [latestAttemptId, setLatestAttemptId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<SubmitBarError | null>(null);

  const diff = difficultyPill(challenge.difficulty);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-12 gap-6"
      style={{ alignItems: 'start' }}
    >
      {/* Prompt column */}
      <section className="md:col-span-5" style={{ minWidth: 0 }}>
        <header style={{ marginBottom: '16px' }}>
          <h1
            style={{
              fontFamily: "var(--font-display), 'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: '28px',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {challenge.title}
          </h1>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              marginTop: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: diff.bg,
                color: diff.fg,
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              {diff.label}
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--surface-muted)',
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--muted)',
              }}
            >
              {challenge.skillSlug}
            </span>
          </div>
        </header>
        <ChallengePrompt markdown={challenge.description} />
      </section>

      {/* Editor column */}
      <section
        className="md:col-span-7"
        style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}
      >
        <EditorPane
          languages={challenge.languages}
          starters={challenge.starters}
          onCodeChange={(lang, c) => {
            setLanguage(lang);
            setCode(c);
          }}
          initialLanguage={initialLang}
        />
        <SubmitBar
          challengeId={challenge.id}
          language={language}
          code={code}
          onAttemptStarted={(id) => {
            setLatestAttemptId(id);
            setSubmitError(null);
          }}
          onError={(err) => setSubmitError(err)}
        />

        {submitError && (
          <div
            role="alert"
            style={{
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '14px',
            }}
          >
            {submitError.code === 'RATE_LIMITED' && submitError.retryAfterSeconds
              ? `Too many submissions — try again in ${submitError.retryAfterSeconds}s.`
              : submitError.code === 'FORBIDDEN'
                ? `Language not available: ${submitError.message}`
                : submitError.message}
          </div>
        )}

        {latestAttemptId && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '14px',
              color: 'var(--muted)',
            }}
            data-testid="attempt-placeholder"
          >
            Attempt submitted · id:{' '}
            <code
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                fontSize: '12px',
                background: 'var(--surface-muted)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {latestAttemptId}
            </code>
            . Verdict display wired in 40-04.
          </div>
        )}
      </section>
    </div>
  );
}

export default SolveWorkspace;
