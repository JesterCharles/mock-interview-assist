// @vitest-environment jsdom
/**
 * ChallengeList.test.tsx — Phase 40 Plan 02
 *
 * Covers: ChallengeFilters (URL sync), ChallengeCard (renders), ChallengeEmptyState,
 * useChallengeList (filters init, setFilters, loadMore append, rate-limit surface,
 * abort on filter change).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const pushSpy = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (url: string) => {
      pushSpy(url);
      // Mirror URL change into mocked searchParams
      const q = url.split('?')[1] ?? '';
      currentSearch = q;
    },
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { ChallengeFilters } from './ChallengeFilters';
import { ChallengeCard } from './ChallengeCard';
import { ChallengeEmptyState } from './ChallengeEmptyState';
import { useChallengeList } from '@/hooks/useChallengeList';

// Minimal component that exposes hook state for assertions.
function HookProbe(props: {
  initialItems?: Parameters<typeof useChallengeList>[0] extends infer O
    ? O extends { initialItems?: infer I }
      ? I
      : never
    : never;
  initialCursor?: string | null;
}) {
  const h = useChallengeList({
    initialItems: props.initialItems,
    initialCursor: props.initialCursor ?? null,
  });
  return (
    <div>
      <div data-testid="filters">{JSON.stringify(h.filters)}</div>
      <div data-testid="items-count">{h.items.length}</div>
      <div data-testid="has-more">{String(h.hasMore)}</div>
      <div data-testid="error-code">{h.error?.code ?? ''}</div>
      <div data-testid="retry-after">{h.error?.retryAfterSeconds ?? ''}</div>
      <button onClick={() => h.setFilters({ language: 'java' })}>setLangJava</button>
      <button onClick={() => h.setFilters({ language: undefined })}>clearLang</button>
      <button onClick={() => h.loadMore()}>loadMore</button>
    </div>
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  pushSpy.mockReset();
  currentSearch = '';
  fetchMock.mockReset();
  // @ts-expect-error override global fetch
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  // @ts-expect-error cleanup
  delete globalThis.fetch;
});

describe('useChallengeList — URL sync', () => {
  it('initializes filters from URL searchParams', () => {
    currentSearch = 'language=python&difficulty=easy';
    render(<HookProbe />);
    const json = screen.getByTestId('filters').textContent ?? '';
    expect(json).toContain('"language":"python"');
    expect(json).toContain('"difficulty":"easy"');
  });

  it('setFilters({language:"java"}) pushes URL preserving other params', () => {
    currentSearch = 'difficulty=easy';
    render(<HookProbe />);
    fireEvent.click(screen.getByText('setLangJava'));
    expect(pushSpy).toHaveBeenCalled();
    const pushed = pushSpy.mock.calls.at(-1)?.[0] as string;
    expect(pushed).toContain('language=java');
    expect(pushed).toContain('difficulty=easy');
  });

  it('setFilters({language:undefined}) removes the language param', () => {
    currentSearch = 'language=python';
    render(<HookProbe />);
    fireEvent.click(screen.getByText('clearLang'));
    const pushed = pushSpy.mock.calls.at(-1)?.[0] as string;
    expect(pushed).not.toContain('language=');
  });
});

describe('useChallengeList — pagination + errors', () => {
  it('loadMore appends items when a nextCursor is set by the initial state', async () => {
    // Seed with initial items + cursor so the first effect is skipped.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: 'c2',
            slug: 'c2',
            title: 'C2',
            language: 'python',
            difficulty: 'easy',
            skillSlug: 's',
            cohortId: null,
            latestAttempt: null,
          },
        ],
        nextCursor: null,
      }),
    });
    render(
      <HookProbe
        initialItems={[
          {
            id: 'c1',
            slug: 'c1',
            title: 'C1',
            language: 'python',
            difficulty: 'easy',
            skillSlug: 's',
            cohortId: null,
            latestAttempt: null,
          },
        ]}
        initialCursor="cursor-1"
      />,
    );
    expect(screen.getByTestId('items-count').textContent).toBe('1');
    expect(screen.getByTestId('has-more').textContent).toBe('true');

    await act(async () => {
      fireEvent.click(screen.getByText('loadMore'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('items-count').textContent).toBe('2'),
    );
    expect(screen.getByTestId('has-more').textContent).toBe('false');
  });

  it('loadMore is a no-op when hasMore is false', async () => {
    render(<HookProbe />);
    fireEvent.click(screen.getByText('loadMore'));
    // No fetch should happen for loadMore when cursor is null
    // (the initial-effect fetch may have fired, but clicking loadMore adds no more)
    const initialCalls = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByText('loadMore'));
    expect(fetchMock.mock.calls.length).toBe(initialCalls);
  });

  it('surfaces 429 with retryAfterSeconds from header', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: {
        get: (k: string) => (k.toLowerCase() === 'retry-after' ? '42' : null),
      },
      json: async () => ({ error: { code: 'RATE_LIMITED', message: 'slow down' } }),
    });
    // Force a fetch by initializing with no seeded items (triggers the effect path)
    render(<HookProbe />);
    await waitFor(() =>
      expect(screen.getByTestId('error-code').textContent).toBe('RATE_LIMITED'),
    );
    expect(screen.getByTestId('retry-after').textContent).toBe('42');
  });
});

describe('ChallengeFilters component', () => {
  it('renders 4 dropdowns and emits onChange for language', () => {
    const onChange = vi.fn();
    render(<ChallengeFilters filters={{}} onChange={onChange} />);
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Week')).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: 'python' },
    });
    expect(onChange).toHaveBeenCalledWith({ language: 'python' });
  });

  it('emits undefined when "All" selected', () => {
    const onChange = vi.fn();
    render(
      <ChallengeFilters filters={{ language: 'java' }} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenCalledWith({ language: undefined });
  });
});

describe('ChallengeCard', () => {
  const item = {
    id: 'id1',
    slug: 'two-sum',
    title: 'Two Sum',
    language: 'python',
    difficulty: 'easy' as const,
    skillSlug: 'arrays',
    cohortId: null,
    latestAttempt: null,
  };

  it('renders title, language, difficulty, and skillSlug', () => {
    render(<ChallengeCard challenge={item} />);
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText(/PYTHON/i)).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText(/arrays/i)).toBeInTheDocument();
  });

  it('status badge reads "Unstarted" when latestAttempt is null', () => {
    render(<ChallengeCard challenge={item} />);
    expect(screen.getByText('Unstarted')).toBeInTheDocument();
  });

  it('status badge reads "Passed" when latestAttempt verdict is pass', () => {
    render(
      <ChallengeCard
        challenge={{
          ...item,
          latestAttempt: {
            verdict: 'pass',
            submittedAt: '2026-04-18T00:00:00Z',
          },
        }}
      />,
    );
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('status badge reads "Attempted" when latestAttempt verdict is fail', () => {
    render(
      <ChallengeCard
        challenge={{
          ...item,
          latestAttempt: {
            verdict: 'fail',
            submittedAt: '2026-04-18T00:00:00Z',
          },
        }}
      />,
    );
    expect(screen.getByText('Attempted')).toBeInTheDocument();
  });

  it('wraps card in a Link to /coding/[slug]', () => {
    const { container } = render(<ChallengeCard challenge={item} />);
    const anchor = container.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('/coding/two-sum');
  });
});

describe('ChallengeEmptyState', () => {
  it('variant=no-cohort renders the "Contact your trainer" messaging', () => {
    render(<ChallengeEmptyState variant="no-cohort" />);
    expect(screen.getByText(/not assigned to a cohort/i)).toBeInTheDocument();
  });

  it('variant=no-matches renders a Clear filters CTA that fires onClearFilters', () => {
    const onClear = vi.fn();
    render(
      <ChallengeEmptyState variant="no-matches" onClearFilters={onClear} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
