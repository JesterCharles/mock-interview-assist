/**
 * Phase 39 — Execution API contract checks.
 *
 * Encodes the grep-based truths from each plan's <verification> block as
 * automated assertions so regressions are caught by `npm run test`:
 *
 * - Plan 39-01 verify: `grep -r "wait.*true" src/app/api/coding/ src/lib/judge0` returns no matches in production code
 * - Plan 39-01 verify: `grep -rn "loadHiddenTests" src/app/api/coding/submit/route.ts` returns exactly one import + one call site
 * - Plan 39-01 verify: `grep -n "getCallerIdentity" src/app/api/coding/submit/route.ts` called in POST handler
 * - Plan 39-02 verify: Zod `.strict()` output schema on attempts route
 * - Plan 39-02 verify: grep (stdin|expectedStdout) returns 0 in response-building code
 * - Plan 39-03 verify: `grep -n "NextResponse.json({ error:" src/app/api/coding/` returns 0 (codingApiError is single source)
 *
 * These are structural invariants that back CODING-API-01 (async, no wait=true),
 * CODING-API-02 (hidden-test shield), CODING-API-05 (poll shield), CODING-API-07
 * (response envelope). They supplement the behavioral tests; if someone
 * reintroduces `wait: true` or an inline error envelope, this test fails.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf-8');
}

describe('Phase 39 — Execution API structural contract', () => {
  describe('no wait=true in production code (CODING-API-01 / D-03)', () => {
    const PROD_FILES = [
      'src/app/api/coding/submit/route.ts',
      'src/app/api/coding/attempts/[id]/route.ts',
      'src/app/api/coding/challenges/route.ts',
      'src/lib/judge0Verdict.ts',
      'src/lib/codingAttemptPoll.ts',
    ];

    for (const file of PROD_FILES) {
      it(`${file} contains no "wait: true" / "wait=true" invocation`, () => {
        const content = read(file);
        // Strip line comments + block comments so the documented-absence
        // comment in submit/route.ts doesn't trip the check.
        const stripped = content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '');
        expect(/wait\s*[:=]\s*true/i.test(stripped)).toBe(false);
      });
    }
  });

  describe('submit route wires hidden-test injection server-side (CODING-API-02 / D-04)', () => {
    const submit = read('src/app/api/coding/submit/route.ts');

    it('imports loadHiddenTests from the server-only service', () => {
      expect(submit).toMatch(
        /import\s+\{[^}]*\bloadHiddenTests\b[^}]*\}\s+from\s+['"]@\/lib\/coding-challenge-service['"]/
      );
    });

    it('invokes loadHiddenTests in the submit pipeline', () => {
      expect(submit).toMatch(/\bloadHiddenTests\s*\(/);
    });

    it('invokes getCallerIdentity to authenticate the caller', () => {
      expect(submit).toMatch(/\bgetCallerIdentity\s*\(/);
    });
  });

  describe('attempts poll route enforces Zod output shield (CODING-API-05 / D-06)', () => {
    const attempts = read('src/app/api/coding/attempts/[id]/route.ts');

    it('response schema uses z.object(...).strict()', () => {
      expect(attempts).toMatch(/\.strict\s*\(\s*\)/);
    });

    it('hiddenTestResults schema is the aggregate {passed, total} object, not an array', () => {
      // The schema should pair hiddenTestResults with z.object(...).
      // Reject any regression that types it as z.array(...).
      // Allow whitespace/newlines between key and z.object (multi-line schema).
      expect(attempts).toMatch(/hiddenTestResults\s*:\s*z\s*\.?\s*\n?\s*\.?\s*object/);
      expect(attempts).not.toMatch(/hiddenTestResults\s*:\s*z\s*\.?\s*\n?\s*\.?\s*array/);
    });

    it('response-building code references no hidden-test fixture fields (stdin/expectedStdout)', () => {
      // Allow the strings inside imports/comments but not as response body keys.
      const stripped = attempts
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      expect(/\bstdin\s*:/.test(stripped)).toBe(false);
      expect(/\bexpectedStdout\s*:/.test(stripped)).toBe(false);
    });
  });

  describe('shared error envelope is single source (CODING-API-07 / D-15)', () => {
    const FILES = [
      'src/app/api/coding/submit/route.ts',
      'src/app/api/coding/attempts/[id]/route.ts',
      'src/app/api/coding/challenges/route.ts',
    ];

    for (const file of FILES) {
      it(`${file} has no inline NextResponse.json error envelope`, () => {
        const content = read(file);
        // Accept NextResponse.json for success responses, reject the
        // { error: { ... } } inline envelope pattern.
        expect(content).not.toMatch(/NextResponse\.json\s*\(\s*\{\s*error\s*:/);
      });

      it(`${file} uses codingApiError for error responses`, () => {
        const content = read(file);
        expect(content).toMatch(/\bcodingApiError\s*\(/);
      });
    }
  });
});
