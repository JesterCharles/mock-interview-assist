# Phase 42: SQL MVP (SQLite Only) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Wire SQLite as a first-class language in the coding stack: trainer-authored SQL challenges include schema + seed data injected server-side at execution time; result normalization handles column order / whitespace / type coercion per challenge-authored expected rows; dialect label visible everywhere.

**In scope:**
- Challenge schema extension: SQL challenges include `setup.sql` (schema + seed) in the bank repo alongside `visible-tests.json` + `hidden-tests.json` (test cases become SQL queries with expected row sets)
- Judge0 SQLite language ID verified + added to `JUDGE0_LANGUAGE_MAP` (Phase 38 map); SQL-specific submission path in `judge0Client.ts` prefixes user query with `setup.sql` content server-side
- Result normalization: parse Judge0 stdout (SQLite's tab-separated output by default), normalize whitespace/column order per test-case-declared `expectedColumns`; trainer-authored `expectedRows` format documented
- UI dialect label: challenge cards + solve page header show `SQL fundamentals (SQLite dialect)` for SQL challenges
- Trainer dashboard label consistency (reuses label constant)
- Document Postgres SQL deferred to v1.5 in `PROJECT.md` Out of Scope

**Out of scope:**
- Real Postgres SQL runner → v1.5
- SQL challenge authoring UI → v1.5
- Dialect badge in associate UI beyond the text label → v1.5 polish

</domain>

<decisions>
## Implementation Decisions

### Challenge Bank SQL Shape (locked)
- **D-01:** For SQL challenges (`meta.language = 'sql'` OR `languages` contains `sql`), the challenge directory gets an additional `setup.sql` file — schema + seed inserts. Size soft-cap 64 KB (validated in loader).
- **D-02:** Test case JSON shape for SQL extends the base shape: `{id, stdin (= user query wrapper), expectedStdout (raw), expectedRows (parsed: [[col1, col2, ...], ...]), expectedColumns: ['name1', 'name2'], weight, orderIndex}`. `expectedRows` + `expectedColumns` are SQL-specific additions enabling row-set comparison.

### Server-Side Injection (locked — no client involvement)
- **D-03:** At submit time in Phase 39's flow, when `language === 'sql'`: Phase 42 adds a pre-submit step that reads `challenge.setup.sql`, concatenates with user's query (in the order: setup → user query → test query per test case), submits as a single SQLite Judge0 submission per test case. `setup.sql` NEVER leaves the server.
- **D-04:** Hidden test SQL queries ALSO concatenate with setup — hidden tests evaluate different queries against the same seeded schema. Hidden queries + expected rows remain server-only (same rules as Phase 37/39).

### Result Normalization (locked per SQL-02)
- **D-05:** SQLite output parser in `src/lib/sqlResultNormalizer.ts`. Steps:
  1. Parse Judge0 stdout into rows (SQLite uses `|` or `\t` depending on `.mode` — we force tab via `.mode tabs` prefix in concatenated query)
  2. Strip trailing whitespace per cell; normalize internal multi-space to single (configurable per challenge via `trimMode: 'strict' | 'normalize'`)
  3. Numeric coercion: compare `"1"` vs `1` as equal when challenge flag `numericCoerce: true` (default)
  4. Column order: if challenge flag `orderSensitive: false` (default true for SQL — trainer can relax), sort both expected and actual by column name before compare
  5. Row order: if challenge flag `rowOrderSensitive: false` (default false for SQL — ORDER BY isn't always needed), sort rows lexicographically before compare
- **D-06:** Per-test-case `passed` boolean derives from normalized comparison; full normalized actual rows returned to client as stdout for visible tests.

### Dialect Label
- **D-07:** Constant `SQL_DIALECT_LABEL = 'SQL fundamentals (SQLite dialect)'` in `src/lib/codingLabels.ts` (new). Challenge cards in `/coding` list, solve page header, and trainer dashboard all import the constant. No string duplication.
- **D-08:** Label rendered above/alongside challenge title on cards + solve page (DESIGN-token'd subtle secondary-text treatment).

### PROJECT.md Update (locked per SQL-03)
- **D-09:** PROJECT.md "Out of Scope for v1.4" section gains: `Real Postgres SQL execution — deferred to v1.5 as separate hardened service with prewarmed isolated schemas, role-locked connections, statement_timeout, no extensions, no network, full teardown per attempt. v1.4 ships SQLite dialect only.`

### Claude's Discretion
- Whether `sqlResultNormalizer.ts` lives in `src/lib/` or nested under `src/lib/coding/`
- Flag defaults (strict trim vs normalize; row order sensitive vs not) — planner defers to challenge authors per challenge, ships with conservative defaults
- Inline test harness for normalizer

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

### Milestone-level
- `.planning/REQUIREMENTS.md` §SQL-01..03
- `.planning/ROADMAP.md` §Phase 42
- `.planning/phases/37-challenge-bank-contract-loader/37-CONTEXT.md` — bank schema (D-01..D-04)
- `.planning/phases/38-judge0-infrastructure/38-CONTEXT.md` — language map, submit client
- `.planning/phases/39-execution-api/39-CONTEXT.md` — submit flow
- `.planning/phases/40-ui-mvp/40-CONTEXT.md` — list + solve page layout
- `PROJECT.md` — Out of Scope section to extend

### External
- Judge0 SQLite: language id 82 (verify against live `/languages` endpoint)
- SQLite `.mode tabs` output format

### Existing code
- `src/lib/coding-challenge-service.ts` (Phase 37) — extend validator to require `setup.sql` when `language=sql`
- `src/lib/judge0Client.ts` (Phase 38) — extend with SQL submission helper OR handle concatenation in Phase 39 submit route (planner picks)
- `PROJECT.md` — Out of Scope section

### Explicitly out-of-scope
- Real Postgres SQL runner
- SQL authoring UI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `coding-challenge-service.ts` from Phase 37 — extend bank schema validation
- `judge0Client.ts` from Phase 38 — submit helper
- Existing coding UI infrastructure from Phase 40 — renders dialect label

### Established Patterns
- Server-side content injection (setup.sql) mirrors hidden-test injection (Phase 37/39) — security boundary is the server
- Label constants in shared `lib/*Labels.ts` file — precedent: existing role labels or verdict labels

### Integration Points
- Phase 42 touches Phase 37 (bank schema), Phase 39 (submit pre-step), Phase 40 (label display), Phase 41 (trainer label consistency). No new phase creates dependencies forward

### Known Constraints
- Judge0 SQLite language ID drift possible between 1.13.x tags — always verify via `/languages` call before committing map constant
- SQLite output format is brittle — `.mode tabs` + `.headers off` required for deterministic parse

</code_context>

<specifics>
## Specific Ideas

- Discovery §Cross-Model Perspective §3: "SQL: SQLite only via Judge0's built-in language. Trainer reporting must explicitly call out `SQL fundamentals (SQLite dialect)`." — D-07 constant enforces
- Discovery: "Real Postgres SQL = future hardened service with prewarmed isolated schemas, role-locked, `statement_timeout`, no extensions, no network, full teardown per attempt. NOT v1.4 scope." — D-09 documents

</specifics>

<deferred>
## Deferred Ideas

- **Real Postgres SQL hardened service** — v1.5 per discovery
- **SQL schema DDL authoring UI** — v1.5
- **Multi-dialect support (MySQL, etc.)** — v2.0
- **Query plan explanation / EXPLAIN output** — v1.5 pedagogy

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 42-sql-mvp-sqlite*
*Context gathered: 2026-04-18 (auto)*
