// @vitest-environment jsdom
/**
 * ChallengePrompt.test.tsx — Phase 40 review WR-01
 *
 * Verifies DOMPurify sanitization of marked-rendered markdown. DB-sourced
 * markdown is untrusted; any <script>/<iframe>/on* attribute must be stripped.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ChallengePrompt } from './ChallengePrompt';

describe('ChallengePrompt sanitization (WR-01)', () => {
  it('strips <script> tags from rendered output', () => {
    const md = '# Safe heading\n\n<script>window.__xss = true;</script>';
    render(<ChallengePrompt markdown={md} />);
    expect(screen.getByText('Safe heading')).toBeInTheDocument();
    const container = document.querySelector('.coding-prompt');
    expect(container?.innerHTML ?? '').not.toMatch(/<script/i);
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
  });

  it('strips inline on* event handlers', () => {
    const md = '<img src="x" onerror="window.__xss2 = true" />';
    render(<ChallengePrompt markdown={md} />);
    const container = document.querySelector('.coding-prompt');
    expect(container?.innerHTML ?? '').not.toMatch(/onerror/i);
  });

  it('strips javascript: URLs from links', () => {
    const md = '[click me](javascript:window.__xss3=true)';
    render(<ChallengePrompt markdown={md} />);
    const anchor = document.querySelector('.coding-prompt a');
    const href = anchor?.getAttribute('href') ?? '';
    expect(href.toLowerCase()).not.toContain('javascript:');
  });

  it('preserves safe markdown (headings, code fences, links)', () => {
    const md = '# Title\n\n```js\nconst x = 1;\n```\n\n[ok](https://example.com)';
    render(<ChallengePrompt markdown={md} />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    const code = document.querySelector('.coding-prompt pre code');
    expect(code?.textContent).toContain('const x = 1');
    const anchor = document.querySelector('.coding-prompt a');
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
  });
});
