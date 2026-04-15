import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Regression test for Plan 11-02 truth:
 *   "Trainer can navigate from /trainer to /trainer/cohorts via a visible nav link"
 *
 * The nav link lives in a client component that pulls in browser-only hooks
 * (useRouter, useAuth), so rendering it in vitest's node env is impractical.
 * We verify the link exists in source instead — sufficient to catch accidental
 * removal during refactors of /trainer/page.tsx.
 */
describe('/trainer nav → /trainer/cohorts link', () => {
  it('renders a Next <Link> to /trainer/cohorts on the trainer dashboard', () => {
    const source = readFileSync(
      resolve(__dirname, 'page.tsx'),
      'utf8',
    )

    // Must import Link from next/link
    expect(source).toMatch(/from ['"]next\/link['"]/)
    // Must contain a Link pointing at the cohorts route
    expect(source).toMatch(/<Link[^>]*href=["']\/trainer\/cohorts["']/)
    // And the visible "Cohorts" label
    expect(source).toMatch(/>\s*Cohorts\s*</)
  })
})
