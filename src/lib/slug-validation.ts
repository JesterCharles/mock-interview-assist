import { z } from 'zod';

export const slugSchema = z.string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be lowercase letters, numbers, and hyphens only')
  .min(2, 'Slug must be at least 2 characters')
  .max(64, 'Slug must be 64 characters or fewer');

export function validateSlug(raw: string): { success: true; slug: string } | { success: false; error: string } {
  const result = slugSchema.safeParse(raw);
  if (result.success) {
    return { success: true, slug: result.data };
  }
  return { success: false, error: result.error.issues[0]?.message ?? 'Invalid slug' };
}
