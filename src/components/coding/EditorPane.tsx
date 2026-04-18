/**
 * EditorPane — Phase 40 Plan 03 Task 2
 *
 * Composes LanguageToggle + CodingEditor. Per CONTEXT D-08: switching language
 * resets code to `starters[lang]` (literal reset on each switch — preserve-draft
 * behavior is deferred to v1.5).
 */
'use client';

import { useState } from 'react';
import { LanguageToggle } from './LanguageToggle';
import { CodingEditor } from './MonacoEditor';
import type { CodingEditorLanguage } from './MonacoEditor';
import { useColorMode } from '@/hooks/useColorMode';

export interface EditorPaneProps {
  languages: string[];
  starters: Record<string, string>;
  onCodeChange: (language: string, code: string) => void;
  initialLanguage?: string;
  editorHeight?: string | number;
}

function isSupportedLanguage(l: string): l is CodingEditorLanguage {
  return ['python', 'javascript', 'typescript', 'java', 'sql', 'csharp'].includes(l);
}

export function EditorPane({
  languages,
  starters,
  onCodeChange,
  initialLanguage,
  editorHeight = 'calc(100vh - 320px)',
}: EditorPaneProps) {
  const first = initialLanguage ?? languages[0] ?? 'python';
  const [currentLang, setCurrentLang] = useState<string>(first);
  const [code, setCode] = useState<string>(starters[first] ?? '');
  const mode = useColorMode();

  const handleLangChange = (lang: string) => {
    setCurrentLang(lang);
    const next = starters[lang] ?? '';
    setCode(next);
    onCodeChange(lang, next);
  };

  const handleCodeChange = (next: string) => {
    setCode(next);
    onCodeChange(currentLang, next);
  };

  const editorLang: CodingEditorLanguage = isSupportedLanguage(currentLang)
    ? currentLang
    : 'python';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0,
        flex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <LanguageToggle
          languages={languages}
          value={currentLang}
          onChange={handleLangChange}
        />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: '320px',
          height: editorHeight,
          display: 'flex',
        }}
      >
        <CodingEditor
          language={editorLang}
          value={code}
          onChange={handleCodeChange}
          theme={mode}
          height="100%"
        />
      </div>
    </div>
  );
}

export default EditorPane;
