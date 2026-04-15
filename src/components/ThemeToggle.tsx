'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Theme toggle for DESIGN.md tokens. Cycles light <-> dark, persists to
 * localStorage('nlm-theme'), writes data-theme on <html>. Hydration-safe:
 * renders a placeholder until mounted to avoid SSR mismatch with the
 * client-resolved theme.
 *
 * Flash prevention is owned by the inline boot script in src/app/layout.tsx
 * which sets data-theme before paint.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('nlm-theme')) as
      | 'light'
      | 'dark'
      | null;
    const initial = stored ?? 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('nlm-theme', next);
    } catch {
      // ignore write failures (private mode / quota)
    }
  }

  // Render a same-shape placeholder pre-mount so layout doesn't shift.
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        width: 36,
        height: 36,
        background: 'transparent',
        color: 'var(--muted)',
        border: '1px solid var(--border)',
        outlineColor: 'var(--accent)',
      }}
    >
      {theme === null ? (
        <span aria-hidden="true" style={{ width: 16, height: 16 }} />
      ) : isDark ? (
        <Sun className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;
