import { describe, it, expect } from 'vitest';
import {
  CODING_LANGUAGES,
  LANGUAGE_EXTENSIONS,
  MetaSchema,
  TestCaseSchema,
  VisibleTestsSchema,
  HiddenTestsSchema,
  StarterSchema,
  ChallengeValidationError,
  validateChallenge,
} from './coding-bank-schemas';

describe('CODING_LANGUAGES / LANGUAGE_EXTENSIONS', () => {
  it('exposes the six supported languages', () => {
    expect(CODING_LANGUAGES).toEqual([
      'python',
      'javascript',
      'typescript',
      'java',
      'sql',
      'csharp',
    ]);
  });

  it('maps every language to its file extension', () => {
    expect(LANGUAGE_EXTENSIONS).toEqual({
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      java: 'java',
      sql: 'sql',
      csharp: 'cs',
    });
  });
});

describe('MetaSchema', () => {
  const valid = {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy' as const,
    skillSlug: 'arrays',
    cohortId: null,
    languages: ['python', 'javascript'] as const,
  };

  it('accepts a valid meta payload', () => {
    const result = MetaSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects missing slug', () => {
    const { slug: _s, ...rest } = valid;
    const result = MetaSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'slug')).toBe(true);
    }
  });

  it.each([['Two Sum'], ['two_sum'], ['-foo'], [''], ['Foo']])(
    'rejects slug "%s" (fails regex)',
    (bad) => {
      const result = MetaSchema.safeParse({ ...valid, slug: bad });
      expect(result.success).toBe(false);
    },
  );

  it('rejects difficulty="insane"', () => {
    const result = MetaSchema.safeParse({ ...valid, difficulty: 'insane' });
    expect(result.success).toBe(false);
  });

  it('rejects empty languages array', () => {
    const result = MetaSchema.safeParse({ ...valid, languages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects unknown language "ruby"', () => {
    const result = MetaSchema.safeParse({ ...valid, languages: ['ruby'] });
    expect(result.success).toBe(false);
  });

  it('rejects skillSlug with capitals/spaces', () => {
    const result = MetaSchema.safeParse({ ...valid, skillSlug: 'Arrays And Hashing' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer cohortId', () => {
    const result = MetaSchema.safeParse({ ...valid, cohortId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts null cohortId (global)', () => {
    const result = MetaSchema.safeParse({ ...valid, cohortId: null });
    expect(result.success).toBe(true);
  });

  it('accepts integer cohortId', () => {
    const result = MetaSchema.safeParse({ ...valid, cohortId: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects unknown keys (strict) — typo guard', () => {
    // "cohortID" (capital D) is a common typo; must fail, not silently pass.
    const result = MetaSchema.safeParse({ ...valid, cohortID: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects arbitrary extra fields (strict)', () => {
    const result = MetaSchema.safeParse({ ...valid, extraField: 'nope' });
    expect(result.success).toBe(false);
  });
});

describe('TestCaseSchema / VisibleTestsSchema', () => {
  const ok = { id: 'tc-1', stdin: '3 4', expectedStdout: '7', weight: 1, orderIndex: 0 };

  it('accepts valid test case', () => {
    expect(TestCaseSchema.safeParse(ok).success).toBe(true);
  });

  it('rejects empty stdin', () => {
    expect(TestCaseSchema.safeParse({ ...ok, stdin: '' }).success).toBe(false);
  });

  it('rejects empty expectedStdout', () => {
    expect(TestCaseSchema.safeParse({ ...ok, expectedStdout: '' }).success).toBe(false);
  });

  it('rejects weight=0', () => {
    expect(TestCaseSchema.safeParse({ ...ok, weight: 0 }).success).toBe(false);
  });

  it('rejects negative weight', () => {
    expect(TestCaseSchema.safeParse({ ...ok, weight: -1 }).success).toBe(false);
  });

  it('rejects duplicate ids in array', () => {
    const arr = [ok, { ...ok, orderIndex: 1 }];
    const result = VisibleTestsSchema.safeParse(arr);
    expect(result.success).toBe(false);
  });

  it('rejects orderIndex list [0, 2] (non-contiguous)', () => {
    const arr = [
      { ...ok, id: 'a', orderIndex: 0 },
      { ...ok, id: 'b', orderIndex: 2 },
    ];
    expect(VisibleTestsSchema.safeParse(arr).success).toBe(false);
  });

  it('rejects orderIndex list [1, 2] (must start at 0)', () => {
    const arr = [
      { ...ok, id: 'a', orderIndex: 1 },
      { ...ok, id: 'b', orderIndex: 2 },
    ];
    expect(VisibleTestsSchema.safeParse(arr).success).toBe(false);
  });

  it('rejects orderIndex list [0, 0] (must be strictly monotonic)', () => {
    const arr = [
      { ...ok, id: 'a', orderIndex: 0 },
      { ...ok, id: 'b', orderIndex: 0 },
    ];
    expect(VisibleTestsSchema.safeParse(arr).success).toBe(false);
  });

  it('accepts well-formed two-entry list', () => {
    const arr = [
      { ...ok, id: 'a', orderIndex: 0 },
      { ...ok, id: 'b', orderIndex: 1 },
    ];
    expect(VisibleTestsSchema.safeParse(arr).success).toBe(true);
  });

  it('HiddenTestsSchema accepts the same shape as VisibleTestsSchema', () => {
    const arr = [
      { ...ok, id: 'h-1', orderIndex: 0 },
      { ...ok, id: 'h-2', orderIndex: 1 },
    ];
    expect(HiddenTestsSchema.safeParse(arr).success).toBe(true);
  });
});

describe('StarterSchema', () => {
  it('accepts a record of language → source', () => {
    const result = StarterSchema.safeParse({
      python: 'def solve(): pass',
      javascript: 'function solve(){}',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown language key', () => {
    const result = StarterSchema.safeParse({ ruby: 'puts' });
    expect(result.success).toBe(false);
  });

  it('accepts empty object', () => {
    const result = StarterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects starter source longer than 50_000 chars (DoS guard)', () => {
    const huge = 'x'.repeat(50_001);
    const result = StarterSchema.safeParse({ python: huge });
    expect(result.success).toBe(false);
  });
});

describe('TestCaseSchema size caps (WR-02)', () => {
  it('rejects stdin longer than 64 KB', () => {
    const huge = 'x'.repeat(64 * 1024 + 1);
    const result = TestCaseSchema.safeParse({
      id: 'tc-1',
      stdin: huge,
      expectedStdout: 'ok',
      weight: 1,
      orderIndex: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects expectedStdout longer than 64 KB', () => {
    const huge = 'x'.repeat(64 * 1024 + 1);
    const result = TestCaseSchema.safeParse({
      id: 'tc-1',
      stdin: 'ok',
      expectedStdout: huge,
      weight: 1,
      orderIndex: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('VisibleTestsSchema / HiddenTestsSchema size caps (WR-02)', () => {
  it('rejects array longer than 200 test cases', () => {
    const arr = Array.from({ length: 201 }, (_, i) => ({
      id: `tc-${i}`,
      stdin: 'a',
      expectedStdout: 'b',
      weight: 1,
      orderIndex: i,
    }));
    expect(VisibleTestsSchema.safeParse(arr).success).toBe(false);
    expect(HiddenTestsSchema.safeParse(arr).success).toBe(false);
  });

  it('accepts array of exactly 200 test cases', () => {
    const arr = Array.from({ length: 200 }, (_, i) => ({
      id: `tc-${i}`,
      stdin: 'a',
      expectedStdout: 'b',
      weight: 1,
      orderIndex: i,
    }));
    expect(VisibleTestsSchema.safeParse(arr).success).toBe(true);
  });
});

describe('ChallengeValidationError', () => {
  it('exposes path, reason, slug and is instanceof Error', () => {
    const err = new ChallengeValidationError('meta.slug', 'Required', 'two-sum');
    expect(err).toBeInstanceOf(Error);
    expect(err.path).toBe('meta.slug');
    expect(err.reason).toBe('Required');
    expect(err.slug).toBe('two-sum');
  });

  it('allows omitting slug', () => {
    const err = new ChallengeValidationError('manifest', 'duplicate slug');
    expect(err.slug).toBeUndefined();
  });
});

describe('validateChallenge (5-step pipeline)', () => {
  const goodMeta = {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    skillSlug: 'arrays',
    cohortId: null,
    languages: ['python'],
  };
  const goodVisible = [
    { id: 'v-1', stdin: '3 4', expectedStdout: '7', weight: 1, orderIndex: 0 },
  ];
  const goodHidden = [
    { id: 'h-1', stdin: '5 6', expectedStdout: '11', weight: 1, orderIndex: 0 },
  ];
  const goodStarters = { python: 'def solve(): pass' };

  it('passes with a fully valid payload', () => {
    const result = validateChallenge({
      meta: goodMeta,
      visibleTests: goodVisible,
      hiddenTests: goodHidden,
      starters: goodStarters,
    });
    expect(result.meta.slug).toBe('two-sum');
    expect(result.visibleTests).toHaveLength(1);
    expect(result.hiddenTests).toHaveLength(1);
  });

  // Step 1 — schema shape
  it('step 1: throws ChallengeValidationError with meta.slug path when meta missing slug', () => {
    expect(() =>
      validateChallenge({
        meta: { ...goodMeta, slug: undefined },
        visibleTests: goodVisible,
        hiddenTests: goodHidden,
        starters: goodStarters,
      }),
    ).toThrow(ChallengeValidationError);

    try {
      validateChallenge({
        meta: { ...goodMeta, slug: undefined },
        visibleTests: goodVisible,
        hiddenTests: goodHidden,
        starters: goodStarters,
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
      expect((e as ChallengeValidationError).path).toContain('meta.slug');
    }
  });

  it('step 1: throws with visibleTests[0].stdin path when visible test has empty stdin', () => {
    try {
      validateChallenge({
        meta: goodMeta,
        visibleTests: [{ ...goodVisible[0], stdin: '' }],
        hiddenTests: goodHidden,
        starters: goodStarters,
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
      expect((e as ChallengeValidationError).path).toContain('visibleTests[0].stdin');
    }
  });

  // Step 2 — language ⊆ allowlist + every declared language has a starter
  it('step 2: throws "no starter file" when meta.languages=[python] but starters={}', () => {
    try {
      validateChallenge({
        meta: goodMeta,
        visibleTests: goodVisible,
        hiddenTests: goodHidden,
        starters: {},
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
      expect((e as ChallengeValidationError).reason).toContain('no starter file');
    }
  });

  it('step 2: throws when languages=[python,java] but java starter missing', () => {
    try {
      validateChallenge({
        meta: { ...goodMeta, languages: ['python', 'java'] },
        visibleTests: goodVisible,
        hiddenTests: goodHidden,
        starters: { python: 'def solve(): pass' },
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
      expect((e as ChallengeValidationError).reason).toContain('no starter file');
      expect((e as ChallengeValidationError).path).toContain('java');
    }
  });

  it('step 2: passes when every declared language has a starter', () => {
    expect(() =>
      validateChallenge({
        meta: goodMeta,
        visibleTests: goodVisible,
        hiddenTests: goodHidden,
        starters: goodStarters,
      }),
    ).not.toThrow();
  });

  // Step 3 — test-case sanity (belt and suspenders)
  it('step 3: throws on duplicate ids in visibleTests', () => {
    try {
      validateChallenge({
        meta: goodMeta,
        visibleTests: [
          { id: 'v-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
          { id: 'v-1', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 1 },
        ],
        hiddenTests: goodHidden,
        starters: goodStarters,
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
    }
  });

  it('step 3: throws on duplicate ids in hiddenTests', () => {
    try {
      validateChallenge({
        meta: goodMeta,
        visibleTests: goodVisible,
        hiddenTests: [
          { id: 'h-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
          { id: 'h-1', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 1 },
        ],
        starters: goodStarters,
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
    }
  });

  // Step 4 — documented NOT checked here (manifest-scope)
  it('step 4: does NOT check duplicate slugs (manifest scope handled in listChallenges)', () => {
    // validateChallenge operates on a single challenge; duplicate-slug guard lives in Plan 37-02 manifest walk.
    expect(() =>
      validateChallenge({
        meta: goodMeta,
        visibleTests: goodVisible,
        hiddenTests: goodHidden,
        starters: goodStarters,
      }),
    ).not.toThrow();
  });

  // Step 5 — hidden/visible id disjointness
  it('step 5: throws "collides with visible" when hiddenTests id === visibleTests id', () => {
    try {
      validateChallenge({
        meta: goodMeta,
        visibleTests: [{ id: 'tc-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 }],
        hiddenTests: [{ id: 'tc-1', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 0 }],
        starters: goodStarters,
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
      expect((e as ChallengeValidationError).reason).toContain('collides with visible');
      expect((e as ChallengeValidationError).path).toBe('hiddenTests[0].id');
    }
  });

  it('step 5: passes when hidden/visible ids are disjoint', () => {
    expect(() =>
      validateChallenge({
        meta: goodMeta,
        visibleTests: [
          { id: 'v-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
          { id: 'v-2', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 1 },
        ],
        hiddenTests: [
          { id: 'h-1', stdin: 'e', expectedStdout: 'f', weight: 1, orderIndex: 0 },
          { id: 'h-2', stdin: 'g', expectedStdout: 'h', weight: 1, orderIndex: 1 },
        ],
        starters: goodStarters,
      }),
    ).not.toThrow();
  });

  // Step ordering
  it('step-order: meta error beats hidden/visible collision (step 1 before step 5)', () => {
    try {
      validateChallenge({
        meta: { ...goodMeta, slug: 'BAD SLUG' },
        visibleTests: [{ id: 'tc-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 }],
        hiddenTests: [{ id: 'tc-1', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 0 }],
        starters: goodStarters,
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChallengeValidationError);
      expect((e as ChallengeValidationError).path).toMatch(/^meta\./);
    }
  });
});
