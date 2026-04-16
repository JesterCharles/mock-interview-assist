export type ChipState = 'valid' | 'invalid' | 'duplicate';

export interface ParsedEmail {
  value: string;       // original email string (trimmed)
  normalized: string;  // lowercased for dedup comparison
  state: ChipState;
}

export interface ChipSummary {
  valid: number;
  invalid: number;
  duplicate: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmails(raw: string): ParsedEmail[] {
  const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set<string>();

  return parts.map(value => {
    const normalized = value.toLowerCase();
    const isValid = EMAIL_REGEX.test(value);

    if (!isValid) {
      return { value, normalized, state: 'invalid' as ChipState };
    }

    const isDuplicate = seen.has(normalized);
    seen.add(normalized);

    return {
      value,
      normalized,
      state: isDuplicate ? 'duplicate' : 'valid',
    } satisfies ParsedEmail;
  });
}

export function getChipSummary(chips: ParsedEmail[]): ChipSummary {
  return chips.reduce(
    (acc, chip) => {
      acc[chip.state]++;
      return acc;
    },
    { valid: 0, invalid: 0, duplicate: 0 },
  );
}

export function isOverCap(chips: ParsedEmail[], cap: number): boolean {
  return chips.filter(c => c.state === 'valid').length > cap;
}

/**
 * Remove the chip at `index` and re-run dedup classification on the remaining chips.
 * Invalid chips stay invalid. A former duplicate may become valid if its original was removed.
 */
export function removeChip(chips: ParsedEmail[], index: number): ParsedEmail[] {
  const remaining = chips.filter((_, i) => i !== index);
  const seen = new Set<string>();

  return remaining.map(chip => {
    if (chip.state === 'invalid') {
      // Invalid stays invalid regardless
      return chip;
    }
    // Re-classify valid/duplicate
    const isDuplicate = seen.has(chip.normalized);
    seen.add(chip.normalized);
    return { ...chip, state: isDuplicate ? 'duplicate' : 'valid' };
  });
}
