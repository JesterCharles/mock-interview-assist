/**
 * sqlResultNormalizer.ts
 *
 * Phase 42 Plan 01 Task 2 — SQLite result normalizer.
 *
 * Pure function: parses Judge0's SQLite stdout (.mode tabs + .headers off)
 * and compares the resulting 2D cell array against trainer-authored
 * expectedRows/expectedColumns via the D-05 5-step pipeline:
 *
 *   1. Parse stdout (tab-delimited, trailing-newline-tolerant)
 *   2. Trim whitespace per cell (strict preserves internal, normalize collapses)
 *   3. Numeric coercion: empty-string → null; numeric strings ↔ numbers
 *   4. Column reorder (when orderSensitiveColumns=false, align alphabetically)
 *   5. Row sort (when rowOrderSensitive=false, lex-sort both sides before compare)
 *
 * Falls back to expectedStdout string-equal compare when expectedRows is
 * absent (backward compat with non-SQL test-case shape).
 *
 * SECURITY PROPERTY (Phase 42 threat T-42-07): mismatch reasons use generic
 * descriptors ("row count mismatch: expected K, got N" / "cell mismatch at
 * row R column C") and NEVER echo expected-row cell values verbatim. This
 * lets the submit/poll route surface `reason` for visible tests without
 * risking leakage if the same normalizer is ever called with hidden data.
 *
 * No IO, no imports beyond types.
 */

import type { SqlTestCase } from './coding-bank-schemas';

export interface NormalizationFlags {
  trimMode: 'strict' | 'normalize';
  numericCoerce: boolean;
  orderSensitiveColumns: boolean;
  rowOrderSensitive: boolean;
  // WR-02 (Phase 42 review): floating-point tolerance for numeric cell compare.
  // Applied only when BOTH cells coerce to finite numbers. Uses relative + abs
  // combined metric so tiny-magnitude and large-magnitude diffs both work.
  epsilon: number;
}

export type Cell = string | number | null;

export interface NormalizationResult {
  passed: boolean;
  actualRows: Cell[][];
  reason?: string;
}

// D-05 defaults — applied when a flag is undefined on the test case.
const DEFAULT_FLAGS: NormalizationFlags = {
  trimMode: 'normalize',
  numericCoerce: true,
  orderSensitiveColumns: true,
  rowOrderSensitive: false,
  epsilon: 1e-9,
};

// WR-01 (Phase 42 review): sentinel markers the submit route wraps around the
// trainer test query so the normalizer can slice off associate-query noise
// (e.g. exploratory SELECTs in the user's answer emit rows BEFORE these
// markers). If either marker is missing the normalizer falls back to parsing
// the entire stdout (backward compat).
const ANSWER_BEGIN_MARKER = '---BEGIN-ANSWER---';
const ANSWER_END_MARKER = '---END-ANSWER---';

type NormalizerInput = Partial<
  Pick<
    SqlTestCase,
    | 'expectedRows'
    | 'expectedColumns'
    | 'expectedStdout'
    | 'trimMode'
    | 'numericCoerce'
    | 'orderSensitiveColumns'
    | 'rowOrderSensitive'
    | 'epsilon'
  >
>;

function resolveFlags(tc: NormalizerInput): NormalizationFlags {
  return {
    trimMode: tc.trimMode ?? DEFAULT_FLAGS.trimMode,
    numericCoerce: tc.numericCoerce ?? DEFAULT_FLAGS.numericCoerce,
    orderSensitiveColumns:
      tc.orderSensitiveColumns ?? DEFAULT_FLAGS.orderSensitiveColumns,
    rowOrderSensitive: tc.rowOrderSensitive ?? DEFAULT_FLAGS.rowOrderSensitive,
    epsilon: tc.epsilon ?? DEFAULT_FLAGS.epsilon,
  };
}

// WR-01: Slice stdout between BEGIN/END answer markers when both are present.
// Returns the original stdout if either marker is missing (backward compat).
function sliceAnswerBlock(stdout: string): string {
  const beginIdx = stdout.indexOf(ANSWER_BEGIN_MARKER);
  if (beginIdx < 0) return stdout;
  const endIdx = stdout.indexOf(ANSWER_END_MARKER, beginIdx + ANSWER_BEGIN_MARKER.length);
  if (endIdx < 0) return stdout;
  // Start after BEGIN marker's own newline; stop before END marker's line.
  const afterBegin = stdout.indexOf('\n', beginIdx);
  if (afterBegin < 0) return stdout;
  return stdout.slice(afterBegin + 1, endIdx);
}

// Step 1 — Parse SQLite `.mode tabs` + `.headers off` output.
function parseStdout(stdout: string): string[][] {
  if (!stdout) return [];
  // Split on newline, drop trailing empty line from a closing \n.
  const lines = stdout.split('\n');
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}

// Step 2 — trim/normalize whitespace per cell (string cells only).
function trimCell(raw: string, mode: 'strict' | 'normalize'): string {
  const trimmed = raw.trim();
  if (mode === 'strict') return trimmed;
  // normalize: collapse internal runs of whitespace to single space
  return trimmed.replace(/\s+/g, ' ');
}

// Step 3 — coerce cells: empty-string → null, numeric strings → numbers when enabled.
function coerceCell(raw: string, numericCoerce: boolean): Cell {
  if (raw === '') return null;
  if (!numericCoerce) return raw;
  // Attempt numeric parse — only coerce if the full string is a valid finite number
  // (avoid '1abc' → 1 via parseFloat). `Number(raw)` fails for non-numeric input (NaN).
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && raw.trim() !== '') {
    // Guard: `Number('')` is 0 — but we already returned null for empty above.
    // Ensure the string actually looks numeric (has a digit).
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw.trim())) return asNum;
  }
  return raw;
}

// Normalize an expected cell to the canonical internal type (null | number | string).
//
// When numericCoerce=false we preserve the trainer-authored type verbatim so a
// number literal will only match another number literal (forcing actual to be
// coerced — but actual parsing also respects the flag, so string-actual stays
// string and mismatch is detected).
function normalizeExpectedCell(
  cell: Cell,
  flags: NormalizationFlags,
): Cell {
  if (cell === null) return null;
  if (typeof cell === 'number') return cell;
  // String expected
  const trimmed = trimCell(cell, flags.trimMode);
  if (trimmed === '') return null;
  if (flags.numericCoerce) {
    return coerceCell(trimmed, true);
  }
  return trimmed;
}

function normalizeActualRow(row: string[], flags: NormalizationFlags): Cell[] {
  return row.map((raw) => {
    const trimmed = trimCell(raw, flags.trimMode);
    return coerceCell(trimmed, flags.numericCoerce);
  });
}

function cellsEqual(a: Cell, b: Cell, epsilon: number): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  // WR-02 (Phase 42 review): floating-point tolerance — SQLite AVG/SUM/REAL
  // arithmetic produces drift like 3.1400000000000006 vs authored 3.14. Use a
  // scale-aware epsilon (combined abs + rel) so tiny values and large values
  // both compare cleanly. Only applied when BOTH sides are finite numbers —
  // exact string/int compares and typed mismatches stay strict.
  if (
    typeof a === 'number' &&
    typeof b === 'number' &&
    Number.isFinite(a) &&
    Number.isFinite(b)
  ) {
    return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
  }
  return a === b;
}

function rowKey(row: Cell[]): string {
  // Stable lexicographic key for sorting. null → '\x00' so it sorts first.
  return row.map((c) => (c === null ? '\x00' : String(c))).join('\x01');
}

// Step 4 helper: given expected columns + actual row length, align by sorting
// both column arrays alphabetically. Because we don't know the actual column
// header (headers off), D-05 step 4 treats column reorder as a DECLARATIVE
// alignment: if the trainer provides expectedColumns and relaxes ordering, we
// sort both expected and actual cell arrays by the alphabetically-sorted
// column permutation.
function alphabetizeReorder(
  cols: string[],
): { permutation: number[]; sorted: string[] } {
  const indexed = cols.map((c, i) => ({ c, i }));
  indexed.sort((a, b) => a.c.localeCompare(b.c));
  return {
    permutation: indexed.map((x) => x.i),
    sorted: indexed.map((x) => x.c),
  };
}

function applyPermutation<T>(row: T[], perm: number[]): T[] {
  return perm.map((i) => row[i]);
}

export function normalizeSqliteResult(
  stdout: string,
  testCase: NormalizerInput,
): NormalizationResult {
  const flags = resolveFlags(testCase);

  // WR-01: If the submit pipeline wrapped the test query in sentinel markers,
  // slice out the answer block to drop any user-query noise preceding it.
  const slicedStdout = sliceAnswerBlock(stdout);

  // Step 1 — parse
  const rawRows = parseStdout(slicedStdout);

  // Fallback (backward compat): if expectedRows is absent, compare trimmed stdout to expectedStdout.
  if (testCase.expectedRows === undefined) {
    const actualStr = slicedStdout.replace(/\s+$/g, '');
    const expectedStr = (testCase.expectedStdout ?? '').replace(/\s+$/g, '');
    const passed = actualStr === expectedStr;
    return {
      passed,
      actualRows: rawRows.map((r) =>
        r.map((cell) => coerceCell(trimCell(cell, flags.trimMode), flags.numericCoerce)),
      ),
      ...(passed ? {} : { reason: 'stdout mismatch (fallback compare)' }),
    };
  }

  const expectedRows = testCase.expectedRows;
  const expectedColumns = testCase.expectedColumns ?? [];

  // Normalize actual rows (trim + coerce per cell)
  let actual: Cell[][] = rawRows.map((r) => normalizeActualRow(r, flags));

  // Normalize expected rows (symmetric trim + coerce for strings)
  let expected: Cell[][] = expectedRows.map((row) =>
    row.map((c) => normalizeExpectedCell(c, flags)),
  );

  // Step 4 — column count check + optional alphabetical reorder
  const expectedColCount = expectedColumns.length || (expected[0]?.length ?? 0);
  if (actual.length > 0 && expectedColCount > 0) {
    if (actual[0].length !== expectedColCount) {
      return {
        passed: false,
        actualRows: actual,
        reason: `column count mismatch: expected ${expectedColCount}, got ${actual[0].length}`,
      };
    }
  }

  if (!flags.orderSensitiveColumns && expectedColumns.length > 0) {
    const { permutation } = alphabetizeReorder(expectedColumns);
    expected = expected.map((r) => applyPermutation(r, permutation));
    actual = actual.map((r) => applyPermutation(r, permutation));
  }

  // Row count check (after possible column reorder — same cell count)
  if (expected.length !== actual.length) {
    return {
      passed: false,
      actualRows: actual,
      reason: `row count mismatch: expected ${expected.length}, got ${actual.length}`,
    };
  }

  // Step 5 — row sort when rowOrderSensitive=false
  if (!flags.rowOrderSensitive) {
    expected = [...expected].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
    actual = [...actual].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
  }

  // Final compare — emit generic reason on mismatch, never echoing expected values.
  for (let r = 0; r < expected.length; r++) {
    const expRow = expected[r];
    const actRow = actual[r];
    if (expRow.length !== actRow.length) {
      return {
        passed: false,
        actualRows: actual,
        reason: `row ${r} column count mismatch: expected ${expRow.length}, got ${actRow.length}`,
      };
    }
    for (let c = 0; c < expRow.length; c++) {
      if (!cellsEqual(expRow[c], actRow[c], flags.epsilon)) {
        return {
          passed: false,
          actualRows: actual,
          reason: `cell mismatch at row ${r} column ${c}`,
        };
      }
    }
  }

  return { passed: true, actualRows: actual };
}
