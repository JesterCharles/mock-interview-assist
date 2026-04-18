/**
 * useColorMode — Phase 40 Plan 03 Task 1
 *
 * Client-side hook reading the current color mode from <html class="dark">.
 * SSR-safe: returns 'light' on the server.
 *
 * The color-mode boot script (in root layout) applies `.dark` to <html>;
 * this hook observes that class via MutationObserver so Monaco (and any
 * other theme-sensitive client) can react to theme switches at runtime.
 */
'use client';

import { useEffect, useState } from 'react';

export type ColorMode = 'light' | 'dark';

function read(): ColorMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useColorMode(): ColorMode {
  const [mode, setMode] = useState<ColorMode>(() => read());

  useEffect(() => {
    // Sync once post-hydration in case SSR guessed wrong.
    setMode(read());
    if (typeof MutationObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setMode(read());
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
    };
  }, []);

  return mode;
}
