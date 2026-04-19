# Branch Protection Runbook — NLM v1.5

**Purpose:** Enable required status checks on `main` so the `pr-checks.yml` workflow actually blocks merges. Without this, the workflow runs but failures are advisory only.

## When

Run this **once** after the first successful run of `pr-checks.yml` (GitHub must see the check names at least once before they can be required).

## Steps

### Option A — via `gh` CLI (recommended)

```bash
gh api -X PUT repos/JesterCharles/mock-interview-assist/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]='Typecheck' \
  -f required_status_checks[contexts][]='Lint' \
  -f required_status_checks[contexts][]='Unit Tests' \
  -f required_status_checks[contexts][]='Prisma Schema Format' \
  -F enforce_admins=false \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -F restrictions=null
```

### Option B — via GitHub UI

1. Navigate to: https://github.com/JesterCharles/mock-interview-assist/settings/branches
2. Click **Add branch protection rule** (or edit existing `main` rule)
3. Branch name pattern: `main`
4. Check **Require status checks to pass before merging**
5. Check **Require branches to be up to date before merging**
6. Search for and select all 4 checks:
   - `Typecheck`
   - `Lint`
   - `Unit Tests`
   - `Prisma Schema Format`
7. Save changes

## Verification

```bash
gh api repos/JesterCharles/mock-interview-assist/branches/main/protection \
  --jq '.required_status_checks.contexts'
# Expected: ["Typecheck","Lint","Unit Tests","Prisma Schema Format"]
```

## Rollback

```bash
gh api -X DELETE repos/JesterCharles/mock-interview-assist/branches/main/protection
```

## Notes

- Solo developer: `required_approving_review_count=0` is intentional (no mandatory review; Codex review is the review gate per CLAUDE.md).
- `enforce_admins=false` so the user can push hotfixes directly if CI is broken.
- This runbook is manual-gated because GitHub API occasionally requires interactive 2FA re-auth for `PUT /branches/:branch/protection`.
