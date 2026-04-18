# Trainer Authoring Guide — Coding Challenges (v1.4)

Who this is for: trainers authoring new coding challenges that associates will
practice against. Assumes you have write access to both the public challenge
repo (`GITHUB_CODING_PUBLIC_REPO`) and the private hidden-tests repo
(`GITHUB_CODING_PRIVATE_REPO`).

## 1. Repo Layout

Challenges live under `challenges/<slug>/`. Slugs must match
`/^[a-z0-9][a-z0-9-]*$/` (lowercase, digits, hyphens; no leading hyphen).

```
challenges/
  <slug>/
    meta.json           # Title, languages, difficulty, skillSlug, cohortId?
    README.md           # Prompt markdown (rendered to associates)
    starters/
      python.py         # Starter code per declared language
      javascript.js     # (one file per lang in meta.languages; extension
      typescript.ts     #  matches coding-bank-schemas LANGUAGE_EXTENSIONS)
      java.java
      sql.sql
      csharp.cs
    visible-tests.json  # Public stdin/stdout pairs
    hidden-tests.json   # PRIVATE REPO ONLY — never in the public repo
```

## 2. `meta.json` Schema

Source of truth: `src/lib/coding-bank-schemas.ts` — `MetaSchema` (Zod).
The validator CLI (§5) imports this schema directly.

```json
{
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "skillSlug": "arrays-hashmaps",
  "cohortId": null,
  "languages": ["python", "javascript"]
}
```

Field reference:

| Field        | Type                                   | Notes                                                                                                 |
|--------------|----------------------------------------|-------------------------------------------------------------------------------------------------------|
| `slug`       | string (regex, max 50)                 | Must match the directory name; lowercase slug chars only                                              |
| `title`      | string (1–200)                         | Displayed in the challenge picker                                                                     |
| `difficulty` | `easy` / `medium` / `hard`             | Drives the gap-score difficulty multiplier (0.7 / 1.0 / 1.3)                                         |
| `skillSlug`  | string (regex, max 50)                 | Must match a `CurriculumWeek.skillSlug` for the associate's cohort to be visible                      |
| `cohortId`   | number / null                          | `null` = global. Non-null scopes the challenge to a specific cohort                                   |
| `languages`  | array of `python` / `javascript` / `typescript` / `java` / `sql` / `csharp` | Non-empty. Each listed language must have a matching starter file under `starters/`. |

## 3. Prompt Template (`README.md`)

Keep it skimmable. This renders inside the challenge editor alongside the
code area.

```markdown
# <Title>

<1-2 sentence problem statement>

## Input

Describe `stdin` format precisely. Trim rules: any trailing newline is OK.

## Output

Describe `stdout` format precisely. Call out whitespace expectations.

## Example

**Input**

```
<literal stdin>
```

**Output**

```
<literal stdout>
```

## Constraints

- List input size bounds
- Time budget (Phase 38 caps at 10s CPU)
- Memory budget (Phase 38 caps at 250 MB)

## Notes

Optional — point at the curriculum-week link for the skill this tests.
```

## 4. Test-Case Authoring

Visible tests live in `visible-tests.json`; they are shown to associates in
full (stdin + expected output). 2–5 visible tests per challenge is the
sweet spot.

```json
[
  {
    "id": "vis-1",
    "stdin": "1,2,3|5",
    "expectedStdout": "1,2",
    "weight": 1,
    "orderIndex": 0
  }
]
```

Required fields:

- `id` — unique within the file (and disjoint from hidden-test ids)
- `stdin` / `expectedStdout` — non-empty, ≤ 64 KB each
- `weight` — positive number (defaults to 1 when omitted)
- `orderIndex` — **0-indexed, contiguous, strictly monotonic** (the loader
  refuses to start otherwise)

Whitespace policy: the normalizer trims trailing whitespace per line and
strips a trailing newline on both sides before comparing. If your challenge
must distinguish trailing whitespace, note it in the prompt.

Hidden tests live in `hidden-tests.json` **inside the private repo only** —
authors 3–10 hidden cases that associates cannot see. Only pass/fail counts
reach the client (`CODING-API-02`).

### WARNING — never commit `hidden-tests.json` to the public repo

On first `git push` to the public repo, hidden tests become permanently
recoverable from git history. Rotate your slug (abandon the old one) if this
ever happens, and re-open the PR against a new challenge name. The server
loader refuses to boot if it sees a `hidden-tests.json` in the public-repo
path.

## 5. Local Validation

Before opening a PR, run the validator from your local public-repo clone:

```bash
npm run validate-challenge ./challenges/my-new-challenge
```

Expected output on success:

```
[validate-challenge] NOTE: hidden-tests.json not present — skipping hidden-test validation (expected in local public-repo workflow).
[validate-challenge] ✓ Valid challenge: my-new-challenge
  languages: python, javascript
  difficulty: easy
  skillSlug: arrays-hashmaps
  visible tests: 3
  hidden tests: (not validated locally)
```

The CLI imports `validateChallenge` from
`src/lib/coding-bank-schemas.ts` — the exact function the server loader uses.
If validation passes locally, the server will accept it on refresh (schema
drift is impossible by construction).

Common failures and their causes:

| Message (path.reason)                                      | Cause                                                                 |
|------------------------------------------------------------|-----------------------------------------------------------------------|
| `meta.slug — slug must match /^[a-z0-9][a-z0-9-]*$/`       | Slug contains a capital letter, underscore, or leading hyphen         |
| `meta.languages — languages must be non-empty`             | Declared zero languages                                               |
| `starters.<lang> — no starter file for declared language`  | Missing `starters/<lang>.<ext>` for an entry in `meta.languages`      |
| `visibleTests[i].orderIndex — orderIndex must be …`        | Test cases not contiguous + 0-indexed + monotonic                     |
| `hiddenTests[i].id — id "…" collides with visible test id` | Hidden test reused a visible-test id; rename it                       |

## 6. PR Workflow

1. Fork (or branch) the public repo (`GITHUB_CODING_PUBLIC_REPO`).
2. Create `challenges/<slug>/` with `meta.json`, `README.md`, `starters/*`,
   `visible-tests.json`. **Do not create `hidden-tests.json` here.**
3. Run `npm run validate-challenge ./challenges/<slug>`. Fix any issues.
4. Open a PR titled `[challenge] <slug> — <Title>`.
5. Trainer-lead reviews, merges.
6. **Separately**, open a PR against the **private** repo adding
   `challenges/<slug>/hidden-tests.json`. Trainer-lead reviews, merges.
7. Within ~5 min of both merges (per `CODING-BANK-04` cache invalidation
   window), the challenge becomes visible to cohorts whose curriculum
   includes the declared `skillSlug`.

If the public repo merge lands before the private repo merge, associates
will see the challenge listed but submissions will fail with
`HIDDEN_TESTS_UNAVAILABLE` until the private-repo PR merges. Land the
private-repo PR first if you can.
