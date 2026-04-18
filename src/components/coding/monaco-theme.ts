/**
 * monaco-theme.ts — Phase 40 Plan 01 Task 1
 *
 * Maps current color-mode to a Monaco built-in theme name. This is the
 * minimal v1.4 pairing. Full palette tuning (custom `monaco.editor.defineTheme`
 * to reuse DESIGN tokens exactly) is Claude's discretion per CONTEXT D-07 /
 * discretion block.
 *
 * For v1.4 we use built-ins:
 *   - light → 'vs'     (neutral background, warm-ish greys — pairs with our cream)
 *   - dark  → 'vs-dark' (charcoal background — pairs with our dark-mode ink palette)
 *
 * Debt ticket (v1.5): consider `defineTheme('nlm-light' / 'nlm-dark')` with
 * background = var(--surface-muted), foreground = var(--ink), and warm-accent
 * syntax colors. Held for v1.5 once the editor surface is validated.
 */
export type ColorMode = 'light' | 'dark';
export type MonacoThemeName = 'vs' | 'vs-dark';

export function resolveMonacoTheme(colorMode: ColorMode): MonacoThemeName {
  return colorMode === 'dark' ? 'vs-dark' : 'vs';
}
