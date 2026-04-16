import { describe, it, expect } from 'vitest';
import { parseInterviewQuestions } from '@/lib/markdownParser';

const makeBlock = (overrides: {
  topicLine?: string;
  keywordsLine?: string;
  answer?: string;
}) => {
  const { topicLine = '', keywordsLine = '**Keywords:** hooks, state', answer = 'Some answer.' } = overrides;
  return `### Q1: What are React hooks?
${topicLine}
${keywordsLine}
<details>
<summary>Model Answer</summary>
${answer}
</details>
`;
};

describe('markdownParser — topic extraction', () => {
  it('extracts topic from **Topic:** frontmatter line', () => {
    const content = makeBlock({ topicLine: '**Topic:** React Hooks' });
    const [q] = parseInterviewQuestions(content, 1);
    expect(q.topic).toBe('React Hooks');
  });

  it('falls back to keywords[0] when **Topic:** is absent but keywords exist', () => {
    const content = makeBlock({ topicLine: '' });
    const [q] = parseInterviewQuestions(content, 1);
    expect(q.topic).toBe('hooks');
  });

  it('returns empty string when both **Topic:** and keywords are absent', () => {
    const content = makeBlock({ topicLine: '', keywordsLine: '' });
    const [q] = parseInterviewQuestions(content, 1);
    expect(q.topic).toBe('');
  });

  it('topic field exists on ParsedQuestion interface (compile-time check via assignment)', () => {
    const content = makeBlock({ topicLine: '**Topic:** State Management' });
    const [q] = parseInterviewQuestions(content, 2);
    // If the field didn't exist on the type this would be a TS error
    const topic: string | undefined = q.topic;
    expect(topic).toBe('State Management');
  });
});
