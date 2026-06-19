# Harness routing

There is NO global harness. Every role independently picks its own executor — `native` (claude / the
plan's specialist agent), `codex`, or `kiro`. The four roles: **code writing** (`buildHarness`),
**plan review** (`planReview`), **per-task review** (`taskReview`), **impl review** (`implReview`).
Writer and reviewers are independent (write codex, review kiro is fine); each review also allows `skip`.

This file pins how each executor maps to a concrete invocation per surface.

## Review routing — `planReview` / `taskReview` / `implReview` (each ∈ skip | native | codex | kiro)

| Surface | `native` | `codex` | `kiro` |
|---|---|---|---|
| Plan review (`planReview`) | native founder review (`founderBrief`) | `codex:codex-rescue` agent, read-only founder-review brief | `kiro-review` skill adapted to the plan files |
| Per-task review (`taskReview`) | the matched `-reviewer` agent (`resolveAgent(t.reviewer)`) | `codex:codex-rescue` agent, READ-ONLY brief | the `kiro-review` skill via the Kiro CLI, READ-ONLY |
| Impl review (`implReview`) | native review (`claude-review`-style over the branch) | `codex:codex-rescue` / `codex-review` over the branch | `kiro-review` over the branch |
| Go-live audit (`goLive`, native) | `go-live-audit` (multi-agent workflow) — composed; native only | — | — |

A single reviewer runs per gate (the one the role picked) — not native ∥ harness. Plan review is a
bounded loop (the FIX is always native; exits clean or non-converging); per-task review drives the
build fix loop; impl review and audit run once and their findings are returned as feedback. `skip`
means the gate doesn't run. kiro reviewers that find the CLI unavailable say so and return empty
findings — they never silently substitute a native review. The go-live audit composes the proven
`go-live-audit` workflow (already a thorough multi-agent native audit), so it has no per-harness column.

## Build routing — `buildHarness` (∈ native | codex | kiro)

| `native` (default) | `codex` | `kiro` |
|---|---|---|
| the plan's specialist engineer agent (`resolveAgent(t.agent)`, in a worktree) | `codex:codex-rescue` agent (write-capable), worktree | a `general-purpose` agent that runs the **`hand-over-to-kiro`** skill (by Sabeur Thabti, @thabti) to delegate the build to `kiro-cli` (autonomous); if that skill or the CLI is absent it implements directly |

`buildHarness` and `taskReview` are independent — e.g. write with codex, review each task with kiro.
`taskReview skip` runs no per-task reviewer (and no per-task fix loop) — the task passes on its engineer
validate alone.

These are wired in `workflow-template.js` (`buildSpawn` / `taskReviewSpawn`). The native path keeps the
specialist-agent availability handling (`resolveAgent` + `missingAgents` reporting); the codex/kiro
paths bypass it since the user explicitly chose that harness. Read-only discipline still applies to
every review lane, whoever runs it.

## Codex delegation — the plugin

Codex is reached through the **`codex:codex-rescue`** agent (the codex plugin), spawned via the
Agent tool with `subagent_type: "codex:codex-rescue"`. That agent is a thin forwarder to the codex
companion runtime. Because it defaults to a *write-capable* run, every REVIEW/AUDIT brief must state
**read-only / review-only, no edits** so it stays non-mutating.

- **Plan founder-review (codex):** brief = "Read-only. Founder-review the plan at
  `.ulpi/plans/<name>.md` + `.json` against the codebase. Verify file paths exist, JSON↔MD
  consistency, scope/mode fit, dependency realism, test-coverage and failure-mode gaps. Do NOT edit
  anything. Return findings classified BLOCK / CONCERN / OBSERVATION with file:line evidence and a
  verdict APPROVE / REVISE / REJECT." Mirror the dimensions in the `plan-founder-review` rubric.
- **Go-live audit (codex):** brief = "Read-only launch-readiness audit of this repo. Check the
  project's hard invariants (from root CLAUDE.md / spec), build/test/lint honesty, secrets,
  tenancy/security, dead wiring, placeholder/TODO in shipping code. Do NOT edit. Return
  GO / NO-GO / GO-WITH-FIXES with confirmed blockers, file:line, and evidence; redact secret
  values."
- **Code review (codex):** prefer the purpose-built **`codex-review`** skill — it runs
  `codex review --base <branch>` with disk-read sandbox perms and a focused instruction file built
  from the real diff. Use `codex:codex-rescue` only if `codex-review` is unavailable.
- Pass routing flags as runtime controls, not task text. Leave `--model`/`--effort` unset unless the
  user asked. For a fresh review pass do not add `--resume-last`.

## Kiro delegation

Use the **`kiro-review`** skill. It reviews the current branch / a commit / uncommitted changes via
the Kiro CLI. For *plan* review (no diff), point its brief at the plan files and the founder-review
dimensions; for code review and whole-repo audit it works on the diff/tree directly. If the Kiro CLI
is unavailable, say so and fall back to native-only for that surface (never silently skip a gate
without telling the user).

## Native claude side

- **Plan review:** `plan-founder-review` (runs as a `context: fork` workflow with its own budget;
  read-only — it never edits the plan, so the orchestrator applies fixes).
- **Code review:** `claude-review` (spawns an isolated worktree reviewer) for the branch diff, or a
  `general-purpose` Agent with `isolation: "worktree"` and the review brief for a broader pass.
- **Go-live audit:** `go-live-audit` (fills + runs its bundled multi-agent audit workflow).

## Running native + harness in parallel

When a phase says "in parallel on the selected harness AND on claude," launch both in ONE assistant
message with two concurrent Agent tool uses (and/or the bundled `workflow-template.js`, which fans
them out deterministically):

- native side → an Agent running the native skill's rubric (or the Skill itself if it forks), and
- harness side → the `codex:codex-rescue` / `kiro-review` Agent.

Collect both, merge findings (dedup per `playbook-state.md`), and only exit the loop when neither
side has a BLOCK/CONCERN left.

## Read-only discipline

Every reviewer/auditor — native or external — is **report-only**. None of them edit code or the
plan. Fixes are applied by the orchestrator (plan edits) or the specialist engineer agents (code).
This keeps the gate independent from the fix and prevents a reviewer from rubber-stamping its own
change.
