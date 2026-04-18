/**
 * SolveWorkspace — Phase 40 Plan 03 (scaffold) + Plan 04 (verdict + history wired)
 *
 * Client composition: prompt (left) + editor/submit/verdict/history (right) on md+;
 * stacked on mobile.
 *
 * Plan 04 adds:
 *   - usePollAttempt(latestAttemptId) → VerdictCard state driver
 *   - AttemptHistorySidebar with onSelectAttempt swap-in
 *   - Error surfaces via react-hot-toast (Toaster mounted at shell root — see DesignToaster)
 */
'use client';

import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ChallengePrompt } from './ChallengePrompt';
import { EditorPane } from './EditorPane';
import { SubmitBar } from './SubmitBar';
import type { SubmitBarError } from './SubmitBar';
import { VerdictCard } from './VerdictCard';
import { AttemptHistorySidebar } from './AttemptHistorySidebar';
import { usePollAttempt } from '@/hooks/usePollAttempt';

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
  const [historyRefresh, setHistoryRefresh] = useState<number>(0);

  const poll = usePollAttempt(latestAttemptId);

  const diff = difficultyPill(challenge.difficulty);

  const handleSubmitError = (err: SubmitBarError) => {
    if (err.code === 'RATE_LIMITED' && err.retryAfterSeconds) {
      toast.error(`Too many submissions — try again in ${err.retryAfterSeconds}s.`);
    } else if (err.code === 'FORBIDDEN') {
      toast.error(`Language not available for your cohort: ${err.message}`);
    } else if (err.code === 'NETWORK_ERROR') {
      toast.error('Connection trouble — try again.');
    } else {
      toast.error(err.message || 'Submit failed.');
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--border)',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '13px',
          },
        }}
      />
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

        {/* Editor + verdict + history column */}
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
              setHistoryRefresh((n) => n + 1);
            }}
            onError={handleSubmitError}
          />

          {latestAttemptId && (
            <VerdictCard
              response={poll.response}
              phase={poll.phase}
              error={poll.error}
            />
          )}

          <AttemptHistorySidebar
            challengeId={challenge.id}
            onSelectAttempt={(id) => setLatestAttemptId(id)}
            refreshToken={historyRefresh}
            currentAttemptId={latestAttemptId}
          />
        </section>
      </div>
    </>
  );
}

export default SolveWorkspace;
