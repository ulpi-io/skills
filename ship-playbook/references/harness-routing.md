# Harness routing

The `harness` intake picks ONE global external review harness: `none`, `codex`, or `kiro`. Native
claude (this orchestrator) always runs its own side of any enabled review; the harness is the optional
*external cross-check* run alongside it. It is used wherever a gate is set to **`claude+harness`**
(`planReview`, `implReview`) or `taskReview` is **`harness`**. `none` = native only, no external lane.

This file pins how each choice maps to a concrete invocation for the review surfaces the playbook uses:
**plan review** (a markdown/JSON plan), **code review** (a branch diff), and **go-live audit** (the repo).

## The matrix

| Surface | native (claude, always runs its side) | `codex` | `kiro` |
|---|---|---|---|
| Plan review (`planReview claude+harness`) | `plan-founder-review <plan>` (forked) | `codex:codex-rescue` agent, read-only founder-review brief | `kiro-review` adapted to the plan files |
| Impl review (`implReview claude+harness`) | `claude-review` over the branch (or a `general-purpose` reviewer in a worktree) | `codex-review` over the branch | `kiro-review` over the branch |
| Go-live audit (Phase G) | `go-live-audit` (multi-agent workflow) | `codex:codex-rescue` agent, read-only launch-audit brief | `kiro-review` whole-repo |

Native always runs its side when the gate is enabled. With `claude+harness` AND `harness != none`, the
harness column runs **in parallel** with native. Plan review is a bounded loop (exits clean or
non-converging); impl review and audit run once and their findings are returned as feedback. Any gate
can be `skip`ped — then neither lane runs.

## Per-task build & review handoff

Two selectors decide who does the per-task work inside the build loop — `buildHarness` (who WRITES each
task) and `taskReview` (who REVIEWS each task). `buildHarness` ∈ `native | codex | kiro` is an
independent axis; `taskReview` ∈ `skip | native | harness`, where `harness` routes to the ONE global
`harness` (codex or kiro):

| Handoff | `native` (default) | `codex` | `kiro` |
|---|---|---|---|
| Build (write) — `buildHarness` | the plan's specialist engineer agent (`resolveAgent(t.agent)`, in a worktree) | `codex:codex-rescue` agent (write-capable), worktree, brief allows edits | a `general-purpose` agent that runs the **`hand-over-to-kiro`** skill (by Sabeur Thabti, @thabti) to delegate the build to `kiro-cli` (autonomous); if that skill or the CLI is absent it implements directly |
| Per-task review — `taskReview` (`harness` → global) | the matched `-reviewer` agent (`resolveAgent(t.reviewer)`) | `codex:codex-rescue` agent, READ-ONLY brief | the **`kiro-review`** skill via the Kiro CLI, READ-ONLY; if unavailable it says so and returns empty findings (never substitutes a native review) |

`taskReview skip` runs no per-task reviewer at all (and no per-task fix loop) — the task passes on its
engineer validate alone.

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
