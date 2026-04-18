/**
 * ChallengePrompt — Phase 40 Plan 03 Task 1
 *
 * Renders trainer-authored challenge markdown via `marked`. Source is trusted
 * (server-loaded from the private coding bank + cached). React's auto-escape
 * would destroy the rendered markup, so we use `dangerouslySetInnerHTML`.
 *
 * SECURITY NOTE: if v1.5 ever adds user-authored challenges, WRAP THIS WITH
 * DOMPurify. Today: trusted source only — leave as-is.
 */
'use client';

import { useMemo } from 'react';
import { marked } from 'marked';

export interface ChallengePromptProps {
  markdown: string;
}

export function ChallengePrompt({ markdown }: ChallengePromptProps) {
  const html = useMemo(() => {
    return marked.parse(markdown, { gfm: true, breaks: false }) as string;
  }, [markdown]);

  return (
    <div
      className="coding-prompt"
      data-testid="challenge-prompt"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        fontSize: '16px',
        color: 'var(--ink)',
        lineHeight: 1.55,
      }}
    />
  );
}

export default ChallengePrompt;
