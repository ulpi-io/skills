---
name: resolve-pr-comments
description: Review, validate, and resolve PR review comments on the current branch. Fetches comments from the open PR, verifies each concern against actual code/history, fixes valid issues, runs build verification, then commits, pushes, replies with reasoning, and resolves threads. Invoke via /resolve-pr-comments or when user says "resolve PR comments", "address review feedback", "fix PR comments".
---

<EXTREMELY-IMPORTANT>
Before resolving ANY PR comment, you **ABSOLUTELY MUST**:

1. Read the actual affected file — never trust the comment's description alone
2. Verify claims against code, git history, and migrations — AI reviewers hallucinate
3. Run a production build after applying fixes to catch regressions
4. Present findings to the user before taking any action

**Blindly applying reviewer suggestions = introducing bugs, unnecessary changes, wasted time**

This is not optional. Every comment requires independent verification.
</EXTREMELY-IMPORTANT>

# Resolve PR Comments

## MANDATORY FIRST RESPONSE PROTOCOL

Before resolving ANY comments, you **MUST** complete this checklist:

1. ☐ Run `git branch --show-current` — identify current branch
2. ☐ Run `gh pr view --json number,title,state,url` — confirm open PR exists
3. ☐ Fetch all review comments via `gh api`
4. ☐ Read every affected file mentioned in comments
5. ☐ Validate each comment independently against the codebase
6. ☐ Categorize each as: valid, partially valid, or invalid
7. ☐ Fix valid/partially valid issues
8. ☐ Run production build to verify fixes
9. ☐ Present summary table to user with verdicts and reasoning
10. ☐ Ask confirmation via **interactive menu** (AskUserQuestion with selectable options, NEVER plain text y/n) before committing, pushing, replying, and resolving

**Resolving comments WITHOUT completing this checklist = bad fixes pushed, valid feedback dismissed.**

## When to Use

- User says "resolve PR comments", "address review feedback", "fix PR comments", "/resolve-pr-comments"
- User asks to review and fix comments left on their PR
- User references a specific PR with comments to resolve
- $ARGUMENTS may include a PR URL or number (e.g., `/resolve-pr-comments https://github.com/org/repo/pull/12`)

## Step 1: Identify the PR

Find the open PR for the current branch.

```bash
# Current branch
git branch --show-current

# Find open PR on this branch
gh pr view --json number,title,state,url,headRefName,baseRefName
```

If $ARGUMENTS contains a PR URL or number, use that instead:

```bash
# From URL or number
gh pr view <number_or_url> --json number,title,state,url,headRefName,baseRefName
```

**Gate:** An open PR must exist. If no PR found, inform the user and stop.

## Step 2: Fetch All Review Comments

Fetch comments using the GitHub REST API:

```bash
# Fetch review comments (code-level)
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '.[] | {id: .id, path: .path, line: .line, body: .body, user: .user.login, in_reply_to_id: .in_reply_to_id}'
```

**Important distinctions:**

- **Review comments** (`/pulls/{number}/comments`) — code-level comments on specific lines. These are the primary target.
- **Issue comments** (`/issues/{number}/comments`) — general PR-level comments. Check these too if no review comments found.
- **Filter out replies** — comments with `in_reply_to_id` set are replies to existing threads, not new issues. Focus on root comments (where `in_reply_to_id` is null).

**Gate:** At least one comment must exist. If no comments, inform the user and stop.

## Step 3: Validate Each Comment

For EACH root comment, perform independent verification:

### 3a. Read the Affected File

Read the file at the path mentioned in the comment. Read enough surrounding context to understand the code.

### 3b. Verify the Claim

**Do NOT trust the comment at face value.** AI code reviewers frequently:

- Flag standard ORM behavior as "SQL injection" (e.g., Drizzle/Prisma parameterized queries)
- Claim missing columns/fields that exist in earlier migrations
- Suggest fixes that produce identical behavior to the current code
- Misidentify race conditions in single-threaded contexts
- Flag NULL handling that is correct SQL behavior

**Verification checklist for each comment:**

- [ ] Is the described problem actually reproducible?
- [ ] Does the code actually behave as the comment claims?
- [ ] If it references missing schema/migrations, check ALL migration files
- [ ] If it claims a security issue, verify the ORM's query parameterization
- [ ] If it claims a logic error, trace the actual code path
- [ ] Does the suggested fix change behavior, or is it cosmetic?

### 3c. Categorize

Assign each comment one of:

| Verdict             | Meaning                                                   | Action                    |
| ------------------- | --------------------------------------------------------- | ------------------------- |
| **Valid**           | Real issue, fix needed                                    | Implement fix             |
| **Partially valid** | Concern has merit but overstated, or fix approach differs | Implement appropriate fix |
| **Invalid**         | Not a real issue, misunderstanding of code/framework      | Dismiss with reasoning    |

## Step 4: Fix Valid Issues

<EXTREMELY-IMPORTANT>
**USE `/run-parallel-agents-feature-debug` TO DEBUG AND RESOLVE ISSUES.**

After categorizing all comments, gather the valid and partially valid issues and invoke the `run-parallel-agents-feature-debug` skill to debug, verify, and fix them. This ensures each issue gets proper diagnosis with the correct specialized agent (Next.js, Laravel, Go, etc.) and that independent fixes run in parallel for speed.

Only skip this if there is a single trivial fix (e.g., a one-line typo) — for anything involving logic, race conditions, security, or multi-file changes, the parallel debug skill is mandatory.
</EXTREMELY-IMPORTANT>

For each valid or partially valid comment:

1. Implement the fix in the affected file
2. Ensure the fix follows existing codebase patterns
3. Do NOT apply the reviewer's suggested code blindly — write the correct fix yourself

**Do NOT change code for invalid comments.** Unnecessary changes add noise and risk.

## Step 5: Build Verification

Run the project's production build to verify fixes don't introduce regressions:

```bash
pnpm build
```

If the build fails, diagnose and fix before proceeding. Do NOT present results to the user until the build passes.

Also run any other verification commands relevant to the project (type checking, linting, tests):

```bash
# If available
pnpm tsc --noEmit
pnpm lint
```

**Gate:** Build must pass before proceeding to Step 6.

## Step 6: Present Summary to User

Present a clear summary table of all comments and your verdicts:

```
## PR Comment Review — PR #<number>

| # | File | Comment | Verdict | Action |
|---|------|---------|---------|--------|
| 1 | `path/to/file.ts` | Brief description | **Valid** | Fixed — description of fix |
| 2 | `path/to/other.ts` | Brief description | **Invalid** | Dismissed — reasoning |
| 3 | `path/to/third.ts` | Brief description | **Partially valid** | Fixed — description of fix |

**Build status:** Passing
```

After presenting the summary table, use the `AskUserQuestion` tool to present an **interactive menu** for confirmation. **NEVER ask plain text y/n questions.** Always use selectable options:

```
AskUserQuestion with options:
- "Yes — commit, push, reply to all comments, and resolve threads"
- "No — cancel, keep local changes for manual review"
```

**Gate:** Wait for user selection before proceeding.

## Step 7: Execute Actions

After user confirms with "y", execute ALL of the following:

### 7a. Commit and Push

```bash
# Stage only the fixed files (never git add -A)
git add <specific-files>

# Commit with descriptive message using HEREDOC for multiline
git commit -m "$(cat <<'EOF'
fix: address PR review feedback

- <brief description of each fix>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"

# Push to remote
git push
```

### 7b. Reply to Each Comment

Reply to EVERY root comment with your reasoning — both valid and invalid:

**For valid/partially valid comments (fixed):**

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies \
  -f body="**Valid concern — fixed.** <reasoning and what was changed>"
```

**For invalid comments (dismissed):**

```bash
gh api repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies \
  -f body="**Not a valid issue.** <detailed reasoning with evidence>"
```

Always include evidence in replies:

- Reference specific code, migrations, or framework behavior
- Quote relevant documentation or source code
- Explain WHY the current code is correct (for invalid comments)
- Explain WHAT was changed and WHY (for valid comments)

### 7c. Resolve All Threads

Resolve all review threads using the GitHub GraphQL API:

```bash
# First, get thread IDs
gh api graphql -f query='{
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {number}) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes { path }
          }
        }
      }
    }
  }
}'

# Then resolve each unresolved thread
gh api graphql -f query='mutation {
  resolveReviewThread(input: {threadId: "{thread_id}"}) {
    thread { isResolved }
  }
}'
```

## Completion Announcement

```
PR review comments resolved:

- **Fixed:** X comments (committed and pushed)
- **Dismissed:** Y comments (with reasoning)
- **Total threads resolved:** Z

All replies posted and threads marked as resolved on PR #<number>.
```

## Edge Cases

### No Open PR on Current Branch

If `gh pr view` fails, check $ARGUMENTS for a PR URL/number. If neither exists:

> "No open PR found on the current branch (`<branch>`). Create a PR first or provide a PR number."

### No Comments on PR

> "PR #<number> has no review comments to resolve."

### Comments Are Only Replies (No Root Comments)

If all comments have `in_reply_to_id` set, they're replies to already-handled threads:

> "All comments on PR #<number> are replies to existing threads. No new issues to resolve."

### Build Fails After Fixes

Do NOT present to user. Diagnose the build failure, fix it, re-run the build. Only proceed once passing.

### Mixed: Some Valid, Some Invalid

This is the normal case. Fix valid ones, dismiss invalid ones, present the full picture in the summary table.

### All Comments Are Invalid

Still reply to each with reasoning and resolve the threads. No commit needed — skip the commit/push step and note this in the summary.

### User Declines (answers "n")

> "No changes made. The fixes are still in your working directory if you'd like to review them manually."

Do not discard the local changes — the user may want to review and commit manually.
