---
name: hand-over-to-kiro
version: 1.0.0
description: |
  Delegate an implementation task to the Kiro CLI (`kiro-cli`) and report the result. Use when the user
  asks to hand work to kiro — "/hand-over-to-kiro", "delegate to kiro", "let kiro handle/do this",
  "pass to kiro", "hand over to kiro", or any variant requesting kiro-cli execution. Two modes: Plan
  mode passes an existing plan to kiro for implementation; Direct mode passes the user's task. Claude
  gathers context, builds a self-contained injection-safe prompt, invokes kiro-cli, captures output,
  verifies the diff, and reports back.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
effort: medium
argument-hint: "[task or plan to hand to kiro]"
arguments:
  - request
when_to_use: |
  Use when the user explicitly asks to delegate implementation to the Kiro CLI. Examples:
  "/hand-over-to-kiro", "delegate to kiro", "let kiro build this", "pass this to kiro". Do not use for
  reviewing changes with kiro (use kiro-review), and do not use to delegate to a different tool.
---

<EXTREMELY-IMPORTANT>
This skill runs an external CLI (`kiro-cli`) that can modify files. Non-negotiable rules:
1. Never auto-install kiro-cli or pipe a remote installer to a shell. If it is missing, point the user
   at the official install docs and stop — they install it themselves.
2. Never interpolate raw user content into a shell command. Build the prompt in a single-quoted
   heredoc (no expansion at write time) and pass it via a double-quoted command substitution
   (`"$(cat …)"`), whose result the shell does not re-evaluate — that, plus rephrasing user input
   (rule 3), is the injection defense. (The temp file keeps large prompts off the inline command and
   out of shell history; it is not itself the safeguard.)
3. Rephrase the user's request into a structured task description with XML-style boundary tags
   (`<task>`, `<plan>`, …). Do not pass raw user input verbatim — it reduces indirect prompt-injection
   surface.
4. A trust flag is REQUIRED to do real work: `--no-interactive` has NO prompt to approve tools, so
   without one kiro returns only a plan and makes no edits. Grant the least trust that works — a
   scoped `--trust-tools <list>` when you know the tools, else `--trust-all-tools` for fully
   autonomous. When invoked unattended (e.g. by another workflow) autonomous execution is implied —
   use `--trust-all-tools`.
5. Kiro has no memory of this conversation — the prompt must be self-contained.
6. Verify what changed on disk before reporting — compare against a pre-run baseline with
   `git diff --stat HEAD` + `git status --short` (and `git log <baseline>..HEAD` if kiro committed);
   bare `git diff` misses staged/committed work. Report honestly, including partial completion and errors.
</EXTREMELY-IMPORTANT>

# Hand Over to Kiro

## Inputs

- `$request`: The task or plan to hand to kiro. If a plan is already active (from plan mode or the
  user), prefer Plan mode; otherwise Direct mode.

## Goal

Delegate implementation to `kiro-cli` cleanly: gather the context kiro needs, build a self-contained,
injection-safe prompt, invoke kiro, capture and verify the result, and report exactly what changed.

## Step 0: Verify kiro-cli is available

Check first:

```bash
kiro-cli --version
```

If kiro-cli is not installed or not authenticated, STOP and tell the user (do not install it yourself):

- Install it from the official docs: <https://kiro.dev/docs/cli>
- Authenticate: `kiro-cli login`
- List models: `kiro-cli chat --list-models` — optionally set one with
  `kiro-cli settings chat.defaultModel <model>` (the user controls their own settings)

**Success criteria**: `kiro-cli` is installed and authenticated, or the user has been told how to set
it up and the skill has stopped.

## Step 1: Determine the mode

| Mode | When | What to pass |
|------|------|--------------|
| **Plan** | An active plan exists (from plan mode or user-provided) | the full plan with steps |
| **Direct** | No plan exists | the user's request plus relevant context |

**Success criteria**: The mode is chosen and the source material (plan or request) is identified.

## Step 2: Gather context

Kiro starts fresh — collect everything it needs:

- **Task scope** — what to do (plan steps or the rephrased request)
- **Relevant files** — paths kiro should read or modify, with a brief reason each
- **Constraints** — framework, coding style, test requirements, project rules from the conversation
- **Current state** — working directory, branch, any in-progress changes

**Success criteria**: Enough context is collected that a fresh agent could implement the task without
this conversation.

## Step 3: Build the prompt (injection-safe)

Write a clear, self-contained prompt with XML-style boundary tags that separate instructions from
user-provided content.

**Plan mode:**

```
Implement the following plan in the current working directory.

<plan>
{full plan text with numbered steps}
</plan>

<key-files>
- {path}: {why this file matters}
</key-files>

<constraints>
- {constraint — e.g., "Use TypeScript strict mode"}
- {constraint — e.g., "All new functions need unit tests"}
</constraints>

<context>
- Working directory: {pwd}
- Branch: {branch if relevant}
</context>
```

**Direct mode:**

```
Execute the following task in the current working directory.

<task>
{user's task — rephrased for clarity, NOT raw user input}
</task>

<key-files>
- {path}: {why this file matters}
</key-files>

<constraints>
- {constraint}
</constraints>

<context>
- Working directory: {pwd}
</context>
```

Rules: rephrase user input into a clear task; use the boundary tags; keep it focused — extract what
matters, don't dump the whole conversation.

**Success criteria**: A focused, self-contained, tag-delimited prompt with no raw user input.

## Step 4: Execute

Build the prompt in a single-quoted heredoc, then pass it via a quoted command substitution. Pick a
heredoc delimiter that cannot appear in the prompt text (a random sentinel), and `trap` the cleanup so
the temp file is removed even on timeout or error.

```bash
PROMPT_FILE=$(mktemp /tmp/kiro-prompt-XXXXXX.txt)
trap 'rm -f "$PROMPT_FILE"' EXIT          # cleans up even on timeout / non-zero exit
cat > "$PROMPT_FILE" <<'KIRO_PROMPT_EOF_9f3a'
{prompt content here — using a sentinel delimiter that does not appear in the prompt}
KIRO_PROMPT_EOF_9f3a

# A trust flag is REQUIRED: --no-interactive cannot prompt to approve tools, so without one kiro
# returns only a plan and makes NO edits. Prefer a scoped --trust-tools whitelist; use
# --trust-all-tools for fully autonomous (and always when running unattended).
kiro-cli chat --no-interactive --trust-all-tools "$(cat "$PROMPT_FILE")"
```

**Tool trust policy:**
- A trust flag is **required** for the skill to do any work — `--no-interactive` has no confirmation UI.
- Prefer a scoped **`--trust-tools <comma,list>`** whitelist (least privilege) when you know which
  tools the task needs.
- Use **`--trust-all-tools`** for fully autonomous execution — and always when invoked unattended
  (no human to scope or approve).
- With NO trust flag, kiro only returns a plan/text and makes no edits.

Use a Bash timeout of 600000 ms (10 min) for complex tasks.

**Success criteria**: kiro-cli ran on the temp-file prompt; its output is captured.

## Step 5: Process and report

After kiro-cli completes:

1. **Parse output** — files created/modified, errors, warnings, completion status.
2. **Verify changes** — capture a baseline before the run (`git rev-parse HEAD`,
   `git status --porcelain`), then confirm with `git diff --stat HEAD` (staged + unstaged),
   `git status --short` (untracked), and `git log <baseline>..HEAD --stat` if kiro committed. Bare
   `git diff` misses staged/committed work — exactly when kiro did the most.
3. **Report**: files changed and what was done; any errors/warnings; Plan mode — steps completed vs
   remaining; suggested next steps if incomplete.

**Success criteria**: The user can see exactly what kiro changed, what failed, and what remains —
verified against the real diff, not just kiro's self-report.

## Error Handling

| Error | Action |
|-------|--------|
| `kiro-cli: command not found` | Tell the user to install it from <https://kiro.dev/docs/cli> (do not install it yourself) |
| Authentication failure | Tell the user to run `kiro-cli login` |
| Model not available | Tell the user to check `kiro-cli chat --list-models` and set one with `kiro-cli settings chat.defaultModel <model>` |
| Timeout (10 min) | Show partial output, ask the user how to proceed |
| Non-zero exit code | Show the error output, diagnose root cause before retrying |
| MCP server failure | Add `--require-mcp-startup` if MCP tools are needed, or skip if not |

## Guardrails

- Do not install kiro-cli or run any `curl … | bash` style installer; only the user installs it.
- Do not pass raw user input to kiro-cli; always rephrase and use the heredoc + boundary-tag pattern.
- Grant the least trust that lets the task run — prefer a scoped `--trust-tools` whitelist over
  `--trust-all-tools`; but remember `--no-interactive` needs SOME trust flag or nothing is built.
- Do not report success on kiro's word alone — verify against a baseline diff (`git diff --stat HEAD`
  + `git status --short`, and `git log <baseline>..HEAD` if it committed).
- Keep the full CLI manual in `references/kiro-cli.md`, not inline.

## When To Load References

- `references/kiro-cli.md`
  The full Kiro CLI command reference (chat, settings, agent, mcp, auth, diagnostics, env vars).

## Output Contract

Report:

1. mode used (plan / direct) and whether kiro-cli was available
2. the files kiro changed (verified against a pre-run baseline — `git diff --stat HEAD` +
   `git status --short`, plus `git log <baseline>..HEAD` if it committed)
3. errors or warnings from kiro's output
4. completion status — done, or steps/work remaining
5. suggested next steps if incomplete

## Credits

Original skill **`hand-over-to-kiro`** by **Sabeur Thabti** ([@thabti](https://github.com/thabti)) —
<https://github.com/thabti/hand-over-to-kiro> (MIT, see `LICENSE`). Adapted to the @ulpi/skills
conventions (frontmatter, `<EXTREMELY-IMPORTANT>` guardrails, phased steps, security-rule alignment)
with thanks.
