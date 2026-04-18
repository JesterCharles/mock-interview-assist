/**
 * ChallengePrompt — Phase 40 Plan 03 Task 1
 *
 * Renders trainer-authored challenge markdown via `marked`. Source is the DB
 * (`loadChallenge`), which is writable by any trainer — so we sanitize the
 * rendered HTML with DOMPurify before injecting via `dangerouslySetInnerHTML`.
 *
 * Phase 40 review WR-01: removed "trusted source" assumption; `marked` does
 * not strip <script>/<iframe>/javascript: URLs on its own.
 */
'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export interface ChallengePromptProps {
  markdown: string;
}

export function ChallengePrompt({ markdown }: ChallengePromptProps) {
  const html = useMemo(() => {
    const raw = marked.parse(markdown, { gfm: true, breaks: false }) as string;
    return DOMPurify.sanitize(raw);
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
