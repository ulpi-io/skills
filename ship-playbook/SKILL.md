---
name: ship-playbook
version: 1.0.0
description: |
  Take one feature request and run the entire delivery playbook automatically: plan it, review the
  plan, build it task by task, review the build, and optionally audit it for launch — then return the
  verified findings as feedback (one pass, no autonomous loop; the user decides on any fix round). It
  chains the existing skills as one runnable Workflow:
  plan-to-task-list-with-dag (plan + assign a specialist agent per task) → plan-founder-review →
  a specialist engineer/reviewer build across the DAG → a full claude ∥ codex/kiro cross-review →
  go-live-audit. Up front it asks which gates to run and at what depth — every review is independently
  dialable from full rigor (claude + a second harness everywhere, build/review delegated to codex/kiro)
  down to skip, so the user controls token cost. Use when the user wants "prompt → planned, built,
  reviewed, audited" in one go
  instead of running each phase by hand.
allowed-tools:
  - Skill
  - Agent
  - AskUserQuestion
  - Bash
  - Read
  - Glob
  - Grep
  - Edit
  - Write
  - TodoWrite
  - Workflow
disable-model-invocation: true
user-invocable: true
effort: high
argument-hint: "<feature prompt — what to plan, build, review, and ship>"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks to run the full delivery playbook on a feature request —
  "ship this end to end", "run the playbook on <X>", "/ship-playbook build <X>", "plan, review,
  build and audit <X>". Do NOT use for a single phase: use plan-to-task-list-with-dag to only plan,
  plan-founder-review to only review a plan, go-live-audit to only audit, or the per-harness review
  skills to only cross-review. This skill spawns many agents over multiple rounds — it is
  explicit-user-only.
---

<EXTREMELY-IMPORTANT>
This skill drives a long-running, multi-agent delivery Workflow. Non-negotiable rules:
1. The Workflow runs ONE pass — plan → plan review → build → impl review → (audit) → verify — and
   RETURNS the verified findings as feedback. It does NOT loop on its own: a Workflow can't ask the
   user mid-run, and an autonomous fix-loop is what caused multi-hour grinds. When findings remain, the
   skill (Phase 3) presents them and the USER decides whether to run a fix round. The Workflow executes
   steps 3–14 as real phases; the skill performs steps 1, 2, 2.1 (the prompt + the intake questions)
   and feeds them in as `args`.
2. ALWAYS ask the intake questions first (the seven: second harness, plan review, build handoff,
   per-task review, impl review, go-live audit, project-map refresh). These select which gates run and
   at what depth; they are Workflow inputs (except the map refresh, a Phase-3 action). Honor the
   choices — the user may dial to full rigor or skip gates to save tokens.
3. The BUILD is a Workflow phase, not a description. Per task across the DAG layers: the ENGINEER
   implements on a task branch in an isolated worktree, an in-workflow INTEGRATE agent git-merges it
   onto the working branch AND removes each merged worktree, the REVIEWER reviews the integrated state
   (unless `taskReview skip`), and a bounded fix loop runs until the task passes. Engineer routes per
   `buildHarness` (native specialist / `codex` / `kiro`); reviewer routes per `taskReview` (native
   `-reviewer` / the second harness / none).
4. The build picks the closest AVAILABLE specialist per task; it falls back to `general-purpose` ONLY
   with the user's consent after the skill notified them a specialist is missing — never silently. When
   a task's stack skill is installed, the engineer MUST use it (`/nextjs`, `/laravel`, `/rust`, …).
   (This applies to the native path; when the user handed building/reviewing to `codex` or `kiro`,
   those tasks route there instead.)
5. Gates that ARE enabled are real — never wave one through or fake a clean verdict to exit. But the
   user controls WHICH gates run: a skipped gate (`planReview skip`, `taskReview skip`, `implReview
   skip`, `goLive no`) is a deliberate choice, not a gate to sneak back in. Warn (don't block) when
   both per-task and impl review are off — nothing checks the build then.
6. The `harness` is ONE global external review harness: `none` (claude/native only), `codex` (the
   `codex:codex-rescue` plugin), or `kiro` (the kiro path). It is the second opinion any `claude+harness`
   gate or `taskReview harness` uses. `buildHarness` (who writes) is a separate axis. (See `harness-routing.md`.)
7. There is no autonomous recursion. After one pass, surface the verified findings honestly and let
   the user choose to run a fix round (re-invoke with the findings as the prompt) — NEVER fake a clean
   verdict, and never silently loop.
8. Keep this body focused on launching + reporting the Workflow. Load the build contract, harness
   routing, state machine, and the Workflow script itself from `references/`.
</EXTREMELY-IMPORTANT>

# Ship Playbook

## Inputs

- `$request`: The feature prompt — what to plan, build, review, and ship. May carry overrides like
  `harness=codex` or `golive=yes` to seed intake. For a fix round, pass the prior findings as the prompt.

## Goal

Turn one prompt into shipped-quality work the same way every time, by running the delivery playbook
as a single runnable Workflow: a grounded DAG plan, a plan that survives founder review
(native + an optional second harness, looped to APPROVE), an implementation built task-by-task with a
specialist engineer/reviewer pair across the DAG layers, a full implementation cross-review (the
plan-vs-implementation gate), and an optional go-live audit — then it RETURNS the verified findings as
feedback. It runs ONE pass and does not loop on its own; if findings remain, the user decides whether
to run a fix round.

The 14 steps map to the Workflow phases: **step 3 → Plan · steps 4–9 → Plan review (optional, bounded
loop) · steps 10–11 → Build (per-task review optional) · step 12 → Impl review (optional,
plan-vs-implementation) · step 14 → Verify (dedup + adversarial verify → feedback) · step 13 → Audit
(only if `goLive` AND build+impl verified-clean)**. Steps 1, 2, 2.1 are the prompt and the questions
the skill collects up front. Each review gate runs at the depth the user chose (skip / claude /
claude+harness); there is no automatic recursion — the workflow returns its findings and stops.

## Phase 1 — Intake (steps 1, 2, 2.1)

The prompt is `$request` (step 1). Ask the governing questions up front (in two `AskUserQuestion` calls
— the tool allows up to 4 each), in execution order so they make sense, unless `$request` already pins
them. Each review gate is independently dialable so the user controls token cost — defaults are LIGHT;
the user can dial every gate UP to full rigor, or DOWN to skip. The questions:

1. **Second harness** — the ONE external review harness used wherever a gate below is set to
   "claude + harness": `none` (default), `codex`, or `kiro`. (claude/native always runs its own side;
   this is the optional second opinion.) Passed as `harness`.
2. **Plan (founder) review** — `skip`, `claude` (native founder review only — default), or
   `claude + harness` (native ∥ the second harness). Passed as `planReview`.
3. **Build handoff** — who WRITES the code for each task: `native` (the plan's specialist engineer
   agents — default), `codex`, or `kiro`. Passed as `buildHarness`.
4. **Per-task review** — who REVIEWS each built task: `skip` (no per-task reviewer or fix loop —
   biggest token save), `native` (the matched `-reviewer` agent — default), or `harness` (the second
   harness). Passed as `taskReview`.
5. **Final implementation review** — the plan-vs-implementation review after the build: `skip`,
   `claude` (native — default), or `claude + harness`. Passed as `implReview`.
6. **Go-live audit at the end** — `no` (default) adds nothing; `yes` runs the go-live audit (only if
   build+impl come back verified-clean). Passed as `goLive`.
7. **Refresh the project map at the end** — regenerate the `CLAUDE.md` context map after the build:
   `no` (default), `map-project` (single project), or `map-project-monorepo` (workspace). Detect the
   repo layout and offer the matching default. Run only in Phase 3 on a real, non-aborted run.

**Defaults** (lighter than full, kept safe): `harness none`, `planReview claude`, `buildHarness native`,
`taskReview native`, `implReview claude`, `goLive no`, map `no`. The user can choose **full swing** —
`planReview claude+harness`, `taskReview harness`, `implReview claude+harness`, `buildHarness codex|kiro`,
`goLive yes`, with `harness codex|kiro` — or delegate building and per-task review to codex/kiro
(`buildHarness` + `taskReview harness`). **Warn (do not block)** if the user sets BOTH `taskReview skip`
AND `implReview skip`: nothing then checks the build, so a clean verdict only means the engineer
validates passed — say so before launching.

Then gather the project facts the Workflow needs (do not ask the user — read the repo): `root`
(absolute repo path), `workingBranch` (the current branch to build on — never build on a protected
branch without confirmation), `validate` (the workspace typecheck+lint+test command), and
`hardRules` (the load-bearing invariants from root `CLAUDE.md` / the spec).

**Verify `root` is a git work tree before launching** — `git -C <root> rev-parse --is-inside-work-tree`
must print `true`, and `workingBranch` must exist with at least one commit. The build creates task
branches and git-merges them, so a non-git folder (or a repo with no commit on `workingBranch`) cannot
be built. If `root` is not a git repo, STOP and tell the user — offer `git init` + a baseline commit, or
correct the path — and do not launch the Workflow. (The Workflow runs the same preflight and aborts
cleanly with `ranReal:false`, but catching it here avoids spawning the run at all.)

**Resolve the specialist agents/skills this environment has, and notify on gaps.** The build assigns
an engineer + `-reviewer` agent per task and may require a stack skill (`/nextjs`, `/laravel`, `/rust`,
…) — these differ per install, and the plan agent (a subagent) cannot see the registry, so YOU resolve
them here and pass them down (this is why an unconstrained plan once invented a `nestjs-backend-engineer`
that wasn't installed):

1. From the agent types available to you (your Agent tool's `subagent_type` options) and your installed
   skills, list the specialist engineer/`-reviewer` agents and stack skills that actually exist here.
2. Identify the project's stack(s) and the specialists they'd want. If a needed specialist agent or
   stack skill is MISSING, NOTIFY the user with `AskUserQuestion` before building — name exactly what's
   missing and offer: **install it** (tell them how, then stop so they can re-run) or **continue
   without** (the build uses `general-purpose` for that agent and skips the missing stack skill).
3. Pass `availableAgents` (the specialist agent names that exist here, including their `-reviewer`
   forms) and `allowGeneralFallback` (`true` only if the user chose continue) into the Workflow `args`.
   The plan then assigns ONLY agents from that list, so it cannot invent one that isn't installed; the
   Workflow also returns `missingAgents` for anything that still slipped through.

Never silently substitute `general-purpose` for a missing specialist without telling the user first.

**Verify any chosen harness tooling is installed, and notify if not.** Whenever `harness` is `codex`
or `kiro`, or `buildHarness` is `codex`/`kiro`, confirm its tooling exists before launching:
- **codex** (the `harness` second opinion, or `buildHarness codex`) needs the codex plugin (`codex:codex-rescue`).
- **kiro build** (`buildHarness kiro`) needs the `hand-over-to-kiro` skill (by Sabeur Thabti, @thabti)
  **and** `kiro-cli` (`kiro-cli --version`); **kiro as the `harness`** (used by any `claude+harness`
  gate or `taskReview harness`) needs the `kiro-review` skill **and** `kiro-cli`.

If a chosen harness's tool is missing, NOTIFY the user with `AskUserQuestion` — offer to **install it**
(for kiro: `hand-over-to-kiro` via `npx skills add …` + kiro-cli from <https://kiro.dev/docs/cli>) or
**fall back** (drop the `+harness` to `claude`, set `harness none`, or `buildHarness native`). Do not
silently degrade.

Open a master `TodoWrite` mirroring the phases in `references/playbook-state.md`.

**Success criteria**: `harness`, `planReview`, `buildHarness`, `taskReview`, `implReview`, `goLive`,
`mapRefresh`, `root` (a confirmed git work tree), `workingBranch`, `validate`, `hardRules`, and
`availableAgents` (+ `allowGeneralFallback` if any specialist is missing) are all resolved.

## Phase 2 — Run the playbook Workflow (steps 3–14)

If `goLive == yes`, FIRST author the go-live audit so step 13 composes the proven audit rather than a
thin pass: run the **`go-live-audit`** skill to generate the project-tailored audit workflow and
capture the `scriptPath` the Workflow tool persists for it; pass that path in as `auditScriptPath`.
(If you skip this, step 13 falls back to an inline finder pass.)

Then launch `references/workflow-template.js` via the **Workflow** tool, passing intake as `args`:

```
Workflow({ scriptPath: ".../references/workflow-template.js",
           args: { prompt, root, workingBranch, validate, hardRules, goLive,
                   harness, planReview, buildHarness, taskReview, implReview,
                   auditScriptPath, availableAgents, allowGeneralFallback } })
```

**Pass `args` as a real JSON object, NOT a JSON-encoded string.** A stringified blob reaches the
script as one string, fails its `typeof args === 'object'` check, and every input silently falls to a
`FILL:` placeholder. The script now hard-THROWS on that (and on a `harness` outside
`claude|codex|kiro|none`) instead of returning a fake `converged:true`, so a stringified-args launch
errors loudly — if you hit it, relaunch as a FRESH run (no resume) with `args` as an object.

The Workflow then executes the playbook in one pass, running each gate at the level the user chose:

- **Plan (step 3)** — a planning agent follows the plan-to-task-list-with-dag methodology unattended
  (mode auto-selected), grounds every path in the real repo, assigns a specialist engineer +
  `-reviewer` + stack skill to each task, writes `.ulpi/plans/<name>.md`+`.json`, returns `{tasks, layers}`.
- **Plan review (steps 4–9)** — per `planReview`: `skip` (no review), `claude` (native founder review),
  or `claude+harness` (native ∥ the second harness). ONE bounded loop → fix the plan (JSON-first,
  re-render MD) → re-review; exits on no BLOCK/CONCERN (OBSERVATIONs never block) OR non-convergence,
  capped at `MAX_REVIEW` (2).
- **Build (steps 10–11)** — walk the DAG layers; per task: engineer (worktree, task branch) →
  in-workflow integrate agent (`git merge` onto the working branch, then removes each merged worktree)
  → reviewer (unless `taskReview skip`) → bounded fix loop until it passes; barrier between layers.
  Engineer = native specialist / `codex` / `kiro` per `buildHarness`; reviewer = native `-reviewer` or
  the second harness per `taskReview` (or none if `skip`).
- **Impl review (step 12)** — per `implReview`: `skip`, `claude`, or `claude+harness`. The
  plan-vs-implementation review of everything built.
- **Verify (step 14)** — dedup + adversarially verify the build+impl findings. These become the
  returned `openRegister` — the feedback. No automatic re-plan/re-build; the workflow returns and stops.
- **Audit (step 13)** — runs only when `goLive` AND build+impl come back verified-clean: COMPOSE the
  proven `go-live-audit` workflow inline via the `workflow()` hook (`auditScriptPath`) — gates →
  finders → dedup → dual-lens verify → critic — ∥ a second-harness audit lane; its findings become
  `openRegister`.

Watch progress via `/workflows`. To iterate on the script, edit the saved `scriptPath` the tool
returns and re-invoke with `{scriptPath}` (and `resumeFromRunId` to reuse cached agent results).
**On any resume, re-pass the SAME `args` object** — `resumeFromRunId` reuses cached *agent* results but
the script re-executes from the top, so omitting `args` empties `CFG` and the script hard-throws on the
`FILL:` guard. Always include the full `args` object you launched with.

**Success criteria**: The Workflow runs to completion and returns
`{ converged, ranReal, plan, build, openRegister, missingAgents, reviewConfig, noReviewGate }`.

## Phase 3 — Report and escalate

Read the Workflow result:

- **First, confirm the run is real — not a false-clean.** If the result has `ranReal: false` (or an
  `aborted` message) or `harness` comes back as a `FILL:` string, the inputs never reached the script.
  Report that failure and relaunch (fresh run) with `args` as a real JSON object; do NOT treat
  `converged` as meaningful.
- **If `missingAgents` is non-empty**, some tasks ran on `general-purpose` because the assigned
  specialist isn't installed here. Surface the list (which agents, how to install) so the user can
  decide whether to install them and re-run for higher-quality output.
- **If `noReviewGate: true`** (the user skipped BOTH per-task review and impl review), CAVEAT any
  clean verdict: it only means the engineer validates passed, nothing reviewed the build. Report
  `reviewConfig` so the user sees which gates ran.
- **`converged: true`** (real run, `openRegister` empty) → DONE. Report the build outcome per task,
  the review/audit verdicts (per `reviewConfig`), and where the plan landed.
- **`openRegister` non-empty** → PRESENT the feedback and let the user decide. List the verified
  BLOCK/CONCERN findings (file:line, issue, suggested fix, which gate found them). Then offer the next
  move: **run a fix round** (re-invoke the workflow with the findings as the prompt — same intake),
  **hand-fix**, or **accept-with-risk**. The workflow does not loop on its own; never represent open
  findings as clean.

**Then, if the user chose a project-map refresh at intake AND the run was real (`ranReal`, not
aborted), run it last** — invoke the chosen skill (`map-project` or `map-project-monorepo`) so the
`CLAUDE.md` context map reflects the code the build just landed. Skip it on an aborted/false-clean run
(there's nothing new to map). This is the final step, after reporting.

**Success criteria**: Either the enabled gates are genuinely clean (caveated by `reviewConfig` /
`noReviewGate`), or the user is handed an honest list of what still blocks plus next moves; and the
project map is refreshed if requested.

## Guardrails

- Do not run proactively; this is explicit-user-only (it spawns many agents across rounds).
- The workflow runs ONE pass and never loops on its own; a fix round is a deliberate user choice
  (re-invoke with the findings as the prompt). Review gates are user-selected per run — honor the
  user's `planReview`/`taskReview`/`implReview` choices, and warn (don't block) when both per-task and
  impl review are skipped. The Workflow owns 3–14, the skill owns 1–2.1.
- Do not hand-roll the plan — the Workflow's plan phase follows the plan-to-task-list-with-dag
  methodology and assigns a specialist agent per task.
- The build assigns the closest AVAILABLE specialist per task; fall back to `general-purpose` only with
  the user's consent after notifying them a specialist is missing (never silently). When a stack skill
  is installed, the engineer MUST use it (`/nextjs`, `/laravel`, `/rust`, …).
- Never fabricate a clean verdict — open BLOCK/CONCERN findings are returned as feedback, not hidden.
- The workflow runs ONE pass and never loops on its own; a fix round is a deliberate user choice
  (re-invoke with the findings as the prompt). Do not re-introduce autonomous recursion.
- Do not pass secrets/tokens into any agent brief; reference by location, redact values.
- Do not build on a protected branch without explicit confirmation of `workingBranch`.
- Do not launch the build in a non-git folder or an empty repo — the build creates and merges task
  branches, so it requires a git work tree with a committed `workingBranch`.
- Keep build worktrees from poisoning the gate: the workflow prunes its `.claude/worktrees/` build
  checkouts (at preflight, after each integrate, and at end), and the integrate validate must never
  scan `.claude/worktrees/**` or sibling agent dirs. If a run's gate fails on files outside the task's
  scope, suspect leftover worktrees before suspecting the code.

## When To Load References

- `references/workflow-template.js`
  The runnable Workflow that executes the playbook in one pass (plan → bounded plan review →
  specialist build across DAG layers with in-workflow git integration → impl review → verify →
  go-live audit) and returns the verified findings. Launch it via the Workflow tool with the intake
  `args`; edit + re-run it to iterate.
- `references/build-loop.md`
  The build CONTRACT the build phase implements: MUST-pick-a-specialist pairing, per-stack skill
  enforcement, DAG layering + git integration, and the task-exit gate.
- `references/harness-routing.md`
  How `claude` / `codex` / `kiro` / `none` map to concrete invocations (the `codex:codex-rescue`
  plugin, kiro, native) for plan-review, code-review, and go-live-audit.
- `references/playbook-state.md`
  The single-pass state machine, master TodoWrite shape, finding schema + dedup, the Verify phase, and
  the clean-vs-feedback decision (fix rounds are user-driven, not automatic).

## Output Contract

Report:

1. intake — the review config used (`reviewConfig`: harness + which gates ran at what depth), go-live
   choice, resolved working branch
2. plan name + build outcome per task (passed / fixes / blocked)
3. plan review and implementation review — findings by enabled gate (confirmed vs rejected), or "skipped"
4. go-live audit — verdict and blockers (or "skipped")
5. final state — clean (caveated if `noReviewGate`), or the honest remaining-findings list + next moves
