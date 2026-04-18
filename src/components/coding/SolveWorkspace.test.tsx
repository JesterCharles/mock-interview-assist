// @vitest-environment jsdom
/**
 * SolveWorkspace.test.tsx — Phase 40 Plan 03
 *
 * Covers:
 *   - ChallengePrompt renders markdown (headings, code fences)
 *   - LanguageToggle filters to challenge.languages and emits selection
 *   - useColorMode reads <html class="dark"> reactively
 *   - EditorPane resets code on language switch (D-08 literal)
 *   - SubmitBar POSTs to /api/coding/submit and disables while pending
 *   - SubmitBar handles 429 + FORBIDDEN error envelopes
 *   - SubmitBar Run button is present but disabled with tooltip
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

// Mock the heavy Monaco wrapper so jsdom doesn't need to resolve monaco-editor.
vi.mock('./MonacoEditor', () => ({
  CodingEditor: ({
    value,
    onChange,
    language,
  }: {
    value: string;
    onChange: (v: string) => void;
    language: string;
  }) => (
    <textarea
      data-testid="coding-editor"
      data-language={language}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

import { ChallengePrompt } from './ChallengePrompt';
import { LanguageToggle } from './LanguageToggle';
import { EditorPane } from './EditorPane';
import { SubmitBar } from './SubmitBar';
import { useColorMode } from '@/hooks/useColorMode';

describe('ChallengePrompt', () => {
  it('renders a markdown heading + code fence', () => {
    const md = '# Hello\n\n```js\nconst x = 1;\n```';
    render(<ChallengePrompt markdown={md} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    // code fence → <pre><code>
    const pre = document.querySelector('.coding-prompt pre code');
    expect(pre).toBeTruthy();
    expect(pre?.textContent).toContain('const x = 1');
  });
});

describe('LanguageToggle', () => {
  it('renders only languages in the prop list', () => {
    const onChange = vi.fn();
    render(
      <LanguageToggle
        languages={['python', 'javascript']}
        value="python"
        onChange={onChange}
      />,
    );
    const select = screen.getByLabelText('Editor language') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['python', 'javascript']);
  });

  it('emits onChange with the new language', () => {
    const onChange = vi.fn();
    render(
      <LanguageToggle
        languages={['python', 'java']}
        value="python"
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Editor language'), {
      target: { value: 'java' },
    });
    expect(onChange).toHaveBeenCalledWith('java');
  });
});

describe('useColorMode', () => {
  function Probe() {
    const m = useColorMode();
    return <div data-testid="mode">{m}</div>;
  }

  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('returns light when <html> lacks .dark', () => {
    render(<Probe />);
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });

  it('reacts when <html> gains .dark', async () => {
    render(<Probe />);
    await act(async () => {
      document.documentElement.classList.add('dark');
    });
    await waitFor(() =>
      expect(screen.getByTestId('mode').textContent).toBe('dark'),
    );
  });
});

describe('EditorPane', () => {
  const starters = {
    python: '# python starter',
    javascript: '// js starter',
  };

  it('renders the initial language starter', () => {
    render(
      <EditorPane
        languages={['python', 'javascript']}
        starters={starters}
        onCodeChange={() => {}}
      />,
    );
    const editor = screen.getByTestId('coding-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('# python starter');
  });

  it('D-08: switching language resets code to the new starter', () => {
    render(
      <EditorPane
        languages={['python', 'javascript']}
        starters={starters}
        onCodeChange={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('Editor language'), {
      target: { value: 'javascript' },
    });
    const editor = screen.getByTestId('coding-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('// js starter');
  });
});

describe('SubmitBar', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  afterEach(() => {
    delete (globalThis as unknown as { fetch?: unknown }).fetch;
  });

  it('renders a disabled Run button with Coming soon tooltip', () => {
    render(
      <SubmitBar
        challengeId="c1"
        language="python"
        code="x=1"
        onAttemptStarted={() => {}}
      />,
    );
    const run = screen.getByRole('button', { name: /run/i });
    expect(run).toBeDisabled();
    expect(run.getAttribute('title')).toMatch(/coming soon/i);
  });

  it('Submit POSTs and calls onAttemptStarted with 201 attemptId', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ attemptId: 'a-123' }),
    });
    const onStarted = vi.fn();
    render(
      <SubmitBar
        challengeId="c1"
        language="python"
        code="x=1"
        onAttemptStarted={onStarted}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    });
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith('a-123'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/coding/submit',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('Submit disables while pending (aria-busy)', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    );
    render(
      <SubmitBar
        challengeId="c1"
        language="python"
        code="x=1"
        onAttemptStarted={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: /submit/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('aria-busy')).toBe('true');
    resolveFetch({
      ok: true,
      status: 201,
      json: async () => ({ attemptId: 'a' }),
    });
  });

  it('surfaces 429 with retryAfterSeconds via onError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: {
        get: (k: string) => (k.toLowerCase() === 'retry-after' ? '17' : null),
      },
      json: async () => ({
        error: { code: 'RATE_LIMITED', message: 'slow down' },
      }),
    });
    const onError = vi.fn();
    render(
      <SubmitBar
        challengeId="c1"
        language="python"
        code="x=1"
        onAttemptStarted={() => {}}
        onError={onError}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    const call = onError.mock.calls[0][0];
    expect(call.code).toBe('RATE_LIMITED');
    expect(call.retryAfterSeconds).toBe(17);
  });

  it('WR-02: 401 surfaces AUTH_REQUIRED via onError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({ error: { code: 'AUTH_REQUIRED', message: 'nope' } }),
    });
    const onError = vi.fn();
    render(
      <SubmitBar
        challengeId="c1"
        language="python"
        code="x=1"
        onAttemptStarted={() => {}}
        onError={onError}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0].code).toBe('AUTH_REQUIRED');
  });

  it('WR-03: 503 surfaces SANDBOX_UNAVAILABLE with friendly message', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: { get: () => null },
      json: async () => ({}),
    });
    const onError = vi.fn();
    render(
      <SubmitBar
        challengeId="c1"
        language="python"
        code="x=1"
        onAttemptStarted={() => {}}
        onError={onError}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    const err = onError.mock.calls[0][0];
    expect(err.code).toBe('SANDBOX_UNAVAILABLE');
    expect(err.message).toMatch(/Judge0 sandbox temporarily unavailable/i);
  });

  it('does not submit when code is empty/whitespace', async () => {
    render(
      <SubmitBar
        challengeId="c1"
        language="python"
        code="   "
        onAttemptStarted={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
