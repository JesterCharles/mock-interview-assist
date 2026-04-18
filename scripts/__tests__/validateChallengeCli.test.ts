/**
 * Phase 44 Plan 03 Task 1 — HARD-04 / D-13 behavioral coverage.
 *
 * Exercises `scripts/validate-challenge.ts` end-to-end via tsx:
 *   - exits 0 on a valid challenge directory
 *   - exits 0 and emits a "NOTE" line when hidden-tests.json is absent
 *   - exits 2 on a malformed meta.json
 *   - exits 1 on missing argv
 *   - exits 1 on non-existent directory
 *
 * The plan's <verify> block only checks that the CLI compiles and imports
 * from the Phase 37 schemas — this fills the behavioral gap flagged by
 * /gsd-validate-phase.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI_PATH = path.join(REPO_ROOT, 'scripts', 'validate-challenge.ts');

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): RunResult {
  // tsx is invoked via npx (project does not install tsx locally; the npm
  // script uses `tsx` which resolves through the PATH that npm sets up).
  try {
    const stdout = execFileSync('npx', ['--no-install', 'tsx', CLI_PATH, ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    const e = err as { status?: number | null; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      code: typeof e.status === 'number' ? e.status : 1,
      stdout: e.stdout ? e.stdout.toString() : '',
      stderr: e.stderr ? e.stderr.toString() : '',
    };
  }
}

function writeChallenge(
  dir: string,
  overrides: {
    meta?: unknown;
    visibleTests?: unknown;
    hiddenTests?: unknown;
    starters?: Record<string, string>;
    omitHidden?: boolean;
  } = {},
): void {
  const meta = overrides.meta ?? {
    slug: 'unit-test-sum',
    title: 'Unit Test Sum',
    languages: ['python'],
    difficulty: 'easy',
    skillSlug: 'arrays-hashmaps',
    cohortId: null,
  };
  const visibleTests = overrides.visibleTests ?? [
    {
      id: 'v1',
      orderIndex: 0,
      stdin: '1 2\n',
      expectedStdout: '3\n',
      weight: 1,
    },
  ];
  const hiddenTests = overrides.hiddenTests ?? [
    {
      id: 'h1',
      orderIndex: 0,
      stdin: '4 5\n',
      expectedStdout: '9\n',
      weight: 1,
    },
  ];
  const starters = overrides.starters ?? {
    'python.py':
      'import sys\n' +
      "a, b = map(int, sys.stdin.readline().split())\n" +
      'print(a + b)\n',
  };

  fs.mkdirSync(path.join(dir, 'starters'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(dir, 'visible-tests.json'), JSON.stringify(visibleTests, null, 2));
  if (!overrides.omitHidden) {
    fs.writeFileSync(path.join(dir, 'hidden-tests.json'), JSON.stringify(hiddenTests, null, 2));
  }
  for (const [file, body] of Object.entries(starters)) {
    fs.writeFileSync(path.join(dir, 'starters', file), body);
  }
  fs.writeFileSync(path.join(dir, 'README.md'), '# Sum\n');
}

describe('scripts/validate-challenge.ts CLI', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-challenge-'));
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('exits 1 when no path argument is supplied', () => {
    const result = runCli([]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Usage:');
  });

  it('exits 1 when target directory does not exist', () => {
    const missing = path.join(tmpRoot, 'does-not-exist');
    const result = runCli([missing]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Directory not found');
  });

  it('exits 0 and reports valid challenge when all files are well-formed', () => {
    const dir = path.join(tmpRoot, 'valid');
    fs.mkdirSync(dir, { recursive: true });
    writeChallenge(dir);

    const result = runCli([dir]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Valid challenge: unit-test-sum');
    expect(result.stdout).toContain('languages: python');
  });

  it('exits 0 and emits NOTE when hidden-tests.json is absent (public-repo workflow)', () => {
    const dir = path.join(tmpRoot, 'no-hidden');
    fs.mkdirSync(dir, { recursive: true });
    writeChallenge(dir, { omitHidden: true });

    const result = runCli([dir]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('NOTE');
    expect(result.stdout).toContain('hidden-tests.json not present');
    expect(result.stdout).toContain('hidden tests: (not validated locally)');
  });

  it('exits 2 when meta.json fails Zod schema validation', () => {
    const dir = path.join(tmpRoot, 'bad-meta');
    fs.mkdirSync(dir, { recursive: true });
    writeChallenge(dir, {
      meta: {
        // invalid slug (uppercase not allowed by SLUG_REGEX)
        slug: 'BAD_SLUG',
        title: 'Bad',
        languages: ['python'],
        difficulty: 'easy',
        skillSlug: 'arrays-hashmaps',
        cohortId: null,
      },
    });

    const result = runCli([dir]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Validation failed');
  });

  it('exits 2 when declared language has no matching starter file', () => {
    const dir = path.join(tmpRoot, 'missing-starter');
    fs.mkdirSync(dir, { recursive: true });
    writeChallenge(dir, {
      meta: {
        slug: 'missing-starter',
        title: 'Missing Starter',
        // declares java, but starters only has python
        languages: ['java'],
        difficulty: 'easy',
        skillSlug: 'arrays-hashmaps',
        cohortId: null,
      },
    });

    const result = runCli([dir]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Validation failed');
  });
});
