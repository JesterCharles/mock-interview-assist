/**
 * Coding Challenge Bank — Zod schemas + validation pipeline.
 *
 * Implements the 5-step pipeline from Phase 37 CONTEXT D-15:
 *   1. Schema shape (MetaSchema, VisibleTestsSchema, HiddenTestsSchema, StarterSchema)
 *   2. Language allowlist + starter-file presence per declared language
 *   3. Test-case sanity (non-empty stdin/stdout, distinct ids, positive weight, contiguous orderIndex)
 *   4. (Manifest-scope; enforced in listChallenges)
 *   5. Hidden/visible id disjointness
 *
 * On first failure, throws `ChallengeValidationError({path, reason, slug?})` so
 * the refresh route can surface readable per-slug errors.
 */

import { z } from 'zod';

// Allowlist of supported execution languages (CODING-MODEL-01 + D-03).
export const CODING_LANGUAGES = [
  'python',
  'javascript',
  'typescript',
  'java',
  'sql',
  'csharp',
] as const;

export type CodingLanguage = (typeof CODING_LANGUAGES)[number];

// File-extension map for starter resolution in public repo (D-01).
export const LANGUAGE_EXTENSIONS: Record<CodingLanguage, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  sql: 'sql',
  csharp: 'cs',
};

// Canonical slug pattern — matches curriculumService.ts + CurriculumWeek.skillSlug.
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;

const LanguageEnum = z.enum(CODING_LANGUAGES);

// ──────────────────────────────────────────────────────────────────────────
// meta.json (D-03)
// ──────────────────────────────────────────────────────────────────────────
export const MetaSchema = z
  .object({
    slug: z.string().regex(SLUG_REGEX, 'slug must match /^[a-z0-9][a-z0-9-]*$/').max(50),
    title: z.string().min(1).max(200),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    skillSlug: z
      .string()
      .regex(SLUG_REGEX, 'skillSlug must match /^[a-z0-9][a-z0-9-]*$/')
      .max(50),
    cohortId: z.number().int().nullable(),
    languages: z.array(LanguageEnum).min(1, 'languages must be non-empty'),
  })
  .strict();

// ──────────────────────────────────────────────────────────────────────────
// test-case shape — shared by visible + hidden (D-04)
// ──────────────────────────────────────────────────────────────────────────
export const TestCaseSchema = z.object({
  id: z.string().min(1),
  stdin: z.string().min(1),
  expectedStdout: z.string().min(1),
  weight: z.number().positive().default(1),
  orderIndex: z.number().int().nonnegative(),
});

function testArrayRefinement(arr: Array<z.infer<typeof TestCaseSchema>>, ctx: z.RefinementCtx) {
  // Unique ids.
  const seen = new Map<string, number>();
  arr.forEach((tc, idx) => {
    if (seen.has(tc.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [idx, 'id'],
        message: `duplicate id "${tc.id}" (also at index ${seen.get(tc.id)})`,
      });
    } else {
      seen.set(tc.id, idx);
    }
  });

  // orderIndex must start at 0, be strictly monotonic, contiguous.
  arr.forEach((tc, idx) => {
    if (tc.orderIndex !== idx) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [idx, 'orderIndex'],
        message: `orderIndex must be ${idx} (0-indexed contiguous), got ${tc.orderIndex}`,
      });
    }
  });
}

export const VisibleTestsSchema = z
  .array(TestCaseSchema)
  .superRefine(testArrayRefinement);

export const HiddenTestsSchema = z
  .array(TestCaseSchema)
  .superRefine(testArrayRefinement);

// ──────────────────────────────────────────────────────────────────────────
// Starters — strict map of language → source (unknown keys rejected).
// ──────────────────────────────────────────────────────────────────────────
export const StarterSchema = z
  .object({
    python: z.string().optional(),
    javascript: z.string().optional(),
    typescript: z.string().optional(),
    java: z.string().optional(),
    sql: z.string().optional(),
    csharp: z.string().optional(),
  })
  .strict();

// ──────────────────────────────────────────────────────────────────────────
// ChallengeValidationError — structured {path, reason, slug?}
// ──────────────────────────────────────────────────────────────────────────
export class ChallengeValidationError extends Error {
  public readonly path: string;
  public readonly reason: string;
  public readonly slug?: string;

  constructor(path: string, reason: string, slug?: string) {
    super(reason);
    this.name = 'ChallengeValidationError';
    this.path = path;
    this.reason = reason;
    this.slug = slug;
  }
}

export interface RawChallenge {
  meta: unknown;
  visibleTests: unknown;
  hiddenTests: unknown;
  starters: Partial<Record<string, string>>;
}

export interface ValidatedChallenge {
  meta: z.infer<typeof MetaSchema>;
  visibleTests: z.infer<typeof VisibleTestsSchema>;
  hiddenTests: z.infer<typeof HiddenTestsSchema>;
  starters: Partial<Record<CodingLanguage, string>>;
}

function firstIssuePath(err: z.ZodError, prefix: string): { path: string; message: string } {
  const issue = err.issues[0];
  const joined = issue.path
    .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
    .join('');
  // Build "prefix.field" or "prefix[n].field" while collapsing leading "."
  const tail = joined.startsWith('.') ? joined.slice(1) : joined;
  const path = tail ? `${prefix}.${tail}`.replace('.[', '[') : prefix;
  return { path, message: issue.message };
}

export function validateChallenge(raw: RawChallenge): ValidatedChallenge {
  // ─── Step 1: schema shape ────────────────────────────────────────────
  const metaResult = MetaSchema.safeParse(raw.meta);
  if (!metaResult.success) {
    const { path, message } = firstIssuePath(metaResult.error, 'meta');
    const maybeSlug =
      raw.meta && typeof raw.meta === 'object' && 'slug' in raw.meta
        ? String((raw.meta as { slug?: unknown }).slug ?? '')
        : undefined;
    throw new ChallengeValidationError(path, message, maybeSlug || undefined);
  }
  const meta = metaResult.data;

  const visibleResult = VisibleTestsSchema.safeParse(raw.visibleTests);
  if (!visibleResult.success) {
    const { path, message } = firstIssuePath(visibleResult.error, 'visibleTests');
    throw new ChallengeValidationError(path, message, meta.slug);
  }
  const visibleTests = visibleResult.data;

  const hiddenResult = HiddenTestsSchema.safeParse(raw.hiddenTests);
  if (!hiddenResult.success) {
    const { path, message } = firstIssuePath(hiddenResult.error, 'hiddenTests');
    throw new ChallengeValidationError(path, message, meta.slug);
  }
  const hiddenTests = hiddenResult.data;

  const startersResult = StarterSchema.safeParse(raw.starters);
  if (!startersResult.success) {
    const { path, message } = firstIssuePath(startersResult.error, 'starters');
    throw new ChallengeValidationError(path, message, meta.slug);
  }
  const starters = startersResult.data;

  // ─── Step 2: every declared language must have a non-empty starter ───
  for (const lang of meta.languages) {
    const src = starters[lang];
    if (!src || src.length === 0) {
      throw new ChallengeValidationError(
        `starters.${lang}`,
        `no starter file for declared language "${lang}"`,
        meta.slug,
      );
    }
  }

  // ─── Step 3: test-case sanity (belt-and-suspenders after schema) ─────
  const assertDistinct = (
    list: Array<{ id: string }>,
    label: 'visibleTests' | 'hiddenTests',
  ) => {
    const seen = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      const id = list[i].id;
      if (seen.has(id)) {
        throw new ChallengeValidationError(
          `${label}[${i}].id`,
          `duplicate test case id "${id}"`,
          meta.slug,
        );
      }
      seen.add(id);
    }
  };
  assertDistinct(visibleTests, 'visibleTests');
  assertDistinct(hiddenTests, 'hiddenTests');

  // ─── Step 4: duplicate-slug guard is enforced in listChallenges manifest walk ───
  // (see Plan 37-02; intentionally not run here because validateChallenge has single-challenge scope)

  // ─── Step 5: hidden ids MUST NOT collide with visible ids ────────────
  const visibleIds = new Set(visibleTests.map((t) => t.id));
  for (let i = 0; i < hiddenTests.length; i++) {
    const h = hiddenTests[i];
    if (visibleIds.has(h.id)) {
      throw new ChallengeValidationError(
        `hiddenTests[${i}].id`,
        `id "${h.id}" collides with visible test id (shadowing risk)`,
        meta.slug,
      );
    }
  }

  return { meta, visibleTests, hiddenTests, starters };
}
