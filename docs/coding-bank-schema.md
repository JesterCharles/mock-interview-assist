# Coding Challenge Bank — Repo Schema

Authoritative layout for the two-repo challenge bank that backs Phase 37+.

## Public repo (`$GITHUB_CODING_PUBLIC_REPO`)

Contains everything associates may legally see: prompts, starter code, visible tests,
metadata. Fetched via the existing `/api/github` proxy (token-hidden, see
`src/app/api/github/route.ts`).

```
challenges/
  manifest.json                     # [{ slug }] — top-level slug list
  <slug>/
    README.md                       # Prompt markdown (rendered on solve page)
    meta.json                       # see schema below
    visible-tests.json              # TestCase[] — shown to associates
    starters/
      python.py                     # starter per language declared in meta.languages
      javascript.js
      typescript.ts
      java.java
      sql.sql
      csharp.cs
```

## Private repo (`$GITHUB_CODING_PRIVATE_REPO`)

Contains ONLY hidden tests. Fetched via a dedicated server-only helper using
`GITHUB_CODING_PRIVATE_TOKEN`. **MUST NOT be reachable via `/api/github`** — that
proxy is public-scoped by design.

```
challenges/
  <slug>/
    hidden-tests.json               # TestCase[] — server-only
```

Slug keys in the private repo MUST match slug folders in the public repo.

## File schemas

### `meta.json`

```json
{
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "skillSlug": "arrays-and-hashing",
  "cohortId": null,
  "languages": ["python", "javascript"]
}
```

- `difficulty` — one of `easy | medium | hard`
- `skillSlug` — joins `CurriculumWeek.skillSlug`
- `cohortId` — `null` means globally visible; an integer scopes to a single cohort
- `languages` — non-empty subset of the allowlist

Allowlist: `python | javascript | typescript | java | sql | csharp`.

Slug format: `/^[a-z0-9][a-z0-9-]*$/`, max 50 chars (same format as
`CurriculumWeek.skillSlug`).

### `visible-tests.json` / `hidden-tests.json`

```json
[
  {
    "id": "tc-1",
    "stdin": "3 4",
    "expectedStdout": "7",
    "weight": 1.0,
    "orderIndex": 0
  }
]
```

- `id` unique within the file
- `stdin` and `expectedStdout` non-empty
- `weight` strictly positive (default 1.0)
- `orderIndex` 0-indexed, monotonic increasing, contiguous
- **Hidden test ids MUST NOT collide with visible test ids** (prevents client-side shadowing attacks)

### `starters/<lang>.<ext>`

Raw source file. Extension map:
`python→py`, `javascript→js`, `typescript→ts`, `java→java`, `sql→sql`, `csharp→cs`.

Every language listed in `meta.languages` MUST have a matching starter file.

## Validation Pipeline (from phase CONTEXT D-15)

Loader runs these checks in order. First failure throws `ChallengeValidationError`:

1. Zod schema shape (`MetaSchema`, `VisibleTestsSchema`, `HiddenTestsSchema`, `StarterSchema`)
2. Language allowlist + starter-file presence per declared language
3. Test-case sanity (non-empty stdin/stdout, distinct ids, positive weight, monotonic contiguous orderIndex)
4. Duplicate-slug guard (manifest-walk scope; enforced by `listChallenges`)
5. Hidden/visible id disjointness

## Trainer workflow (v1.4 — PR-based authoring; in-app editor is v1.5)

1. Fork the public + private repos (or open a branch if you have write access).
2. Add `challenges/<your-slug>/` in BOTH repos with the files above.
3. Add `{ "slug": "<your-slug>" }` to `challenges/manifest.json` in the public repo.
4. Open a PR. Once merged, the loader cache refreshes within 5 minutes (TTL) or
   immediately via the trainer-only `POST /api/coding/bank/refresh`.
