/**
 * bundle.test.ts — Phase 40 Plan 04 Task 3 regression guard
 *
 * Ensures `@monaco-editor/react` is only imported from the single dynamic
 * wrapper (src/components/coding/MonacoEditor.tsx). Any other import would
 * defeat the lazy-load code split and bloat the main page chunk (~2MB).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Monaco bundle regression guard', () => {
  it('@monaco-editor/react is imported in exactly one file', () => {
    const srcDir = join(process.cwd(), 'src');
    const files = walk(srcDir);
    const offenders = files.filter((f) => {
      const text = readFileSync(f, 'utf8');
      // Skip doc/comment lines: strip block + line comments before scanning.
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      // Match ES import, dynamic import, or require of @monaco-editor/react
      if (/from\s+['"]@monaco-editor\/react['"]/.test(code)) return true;
      if (/import\(\s*['"]@monaco-editor\/react['"]\s*\)/.test(code)) return true;
      if (/require\(\s*['"]@monaco-editor\/react['"]\s*\)/.test(code)) return true;
      return false;
    });
    expect(offenders.map((f) => f.replace(srcDir, 'src')).sort()).toEqual([
      'src/components/coding/MonacoEditor.tsx',
    ]);
  });
});
