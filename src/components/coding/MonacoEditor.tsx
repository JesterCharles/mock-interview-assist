/**
 * MonacoEditor.tsx — Phase 40 Plan 01 Task 1
 *
 * The ONLY entry point for @monaco-editor/react in this codebase. Downstream
 * components (EditorPane, etc.) MUST import `CodingEditor` from this file.
 * A bundle regression test (40-04) fails if `@monaco-editor/react` is imported
 * anywhere else — this keeps Monaco (~2MB) out of the main chunk.
 *
 * Why `next/dynamic` + `ssr:false`:
 *   - Monaco depends on `window`/`document` — SSR would throw.
 *   - Dynamic import code-splits the ~2MB chunk; initial page bundles stay lean.
 */
'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';

const MonacoEditorDynamic = dynamic(
  () => import('@monaco-editor/react').then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
          fontSize: '14px',
          background: 'var(--surface-muted)',
          borderRadius: '8px',
        }}
      >
        Loading editor…
      </div>
    ),
  },
);

export type CodingEditorLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'sql'
  | 'csharp';

export interface CodingEditorProps {
  language: CodingEditorLanguage;
  value: string;
  onChange: (value: string) => void;
  theme: 'light' | 'dark';
  height?: string | number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Map our canonical language ids to Monaco's language ids where they differ.
 * Monaco uses 'csharp' (we match). 'sql' is native. JS/TS/Python/Java match.
 */
function monacoLanguageId(lang: CodingEditorLanguage): string {
  return lang;
}

export function CodingEditor({
  language,
  value,
  onChange,
  theme,
  height = '100%',
  className,
  style,
}: CodingEditorProps) {
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <div
      className={className}
      // Monaco injects <script> tags for its web-worker bootstrap; React
      // warns about script tags in render trees. Suppress — Monaco's pattern
      // is intentional and not under our control. (F-09)
      suppressHydrationWarning
      style={{
        width: '100%',
        height,
        minHeight: '240px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        ...style,
      }}
    >
      <MonacoEditorDynamic
        language={monacoLanguageId(language)}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        theme={monacoTheme}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily:
            "var(--font-jetbrains-mono), 'JetBrains Mono', Menlo, Consolas, monospace",
          lineNumbers: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
          renderWhitespace: 'selection',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}

export default CodingEditor;
