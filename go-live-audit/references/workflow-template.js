// ============================================================================
// GO-LIVE AUDIT — Workflow template
// ============================================================================
// This is a TEMPLATE, not a runnable script. Copy it, fill every `FILL:` marker
// with project-specific content, delete this banner, then pass the result as the
// `script` argument to the Workflow tool.
//
// Architecture (do NOT change the control flow — it is generic and load-bearing):
//   Gates  → run typecheck/test/lint/build in parallel, awaited at the very end
//            so they overlap the finder sweep instead of blocking it.
//   Find   → one read-only finder agent per audit dimension (barrier: dedup needs all).
//   Dedup  → an agent groups findings that describe the same root cause (only if >5).
//   Verify → each finding is handed to adversarial verifiers told to REFUTE it.
//            blocker/high get two lenses (code + spec); medium/low get code only.
//   Critic → a completeness critic names uncovered areas → spawns follow-up finders
//            → dedups vs already-seen → verifies the survivors.
//
// What you MUST customize per project: ROOT, the `meta` block, PRODUCT_CONTEXT,
// HARD_RULES, the blocker examples in SEVERITY_DEFS, the FINDERS array, and STACK.
// Everything else (schemas, dedup, verify, critic, assembly) is reusable as-is.
// ============================================================================

export const meta = {
  // FILL: keep `name` kebab-case; tailor `description` to the project if you like.
  name: 'go-live-audit',
  description: 'End-to-end pre-launch audit: workspace gates, dimension finder sweep, adversarial verification, completeness critic',
  phases: [
    { title: 'Gates', detail: 'typecheck / test / lint / build' },
    { title: 'Find', detail: 'dimension-specific finders' },
    { title: 'Dedup', detail: 'merge duplicate findings' },
    { title: 'Verify', detail: 'adversarial refutation per finding' },
    { title: 'Critic', detail: 'coverage gaps, follow-up finders, verify' },
  ],
}

// FILL: absolute path to the repo being audited.
const ROOT = '<ABSOLUTE_REPO_ROOT>'

// ---------------------------------------------------------------------------
// Schemas — reusable verbatim across every project.
// ---------------------------------------------------------------------------
const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'file', 'description', 'evidence'],
        properties: {
          title: { type: 'string', description: 'One-line summary of the issue' },
          severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] },
          file: { type: 'string', description: 'Path relative to repo root' },
          line: { type: 'number' },
          description: { type: 'string', description: 'What is wrong and why it matters for go-live' },
          evidence: { type: 'string', description: 'Quoted offending code lines or command output proving the issue. Secret values must be replaced with <REDACTED>.' },
        },
      },
    },
    notes: { type: 'string', description: 'Anything checked and found clean, briefly' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['isReal', 'severity', 'reasoning'],
  properties: {
    isReal: { type: 'boolean' },
    severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low', 'none'] },
    reasoning: { type: 'string', description: '2-4 sentences: what you checked and why it stands or falls' },
  },
}

const GATE_SCHEMA = {
  type: 'object',
  required: ['passed', 'summary', 'failures'],
  properties: {
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        required: ['member', 'detail'],
        properties: {
          member: { type: 'string', description: 'workspace member / file name' },
          detail: { type: 'string', description: 'error excerpt' },
        },
      },
    },
  },
}

const DEDUP_SCHEMA = {
  type: 'object',
  required: ['groups'],
  properties: {
    groups: {
      type: 'array',
      description: 'Groups of finding ids that describe the same underlying issue. Only include groups with 2+ ids.',
      items: {
        type: 'object',
        required: ['keepId', 'duplicateIds'],
        properties: {
          keepId: { type: 'number' },
          duplicateIds: { type: 'array', items: { type: 'number' } },
        },
      },
    },
  },
}

const CRITIC_SCHEMA = {
  type: 'object',
  required: ['gaps'],
  properties: {
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['area', 'prompt'],
        properties: {
          area: { type: 'string', description: 'short kebab-case name of the uncovered area' },
          prompt: { type: 'string', description: 'A complete, self-contained investigation prompt for a finder agent' },
        },
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Severity framing. FILL: replace the blocker examples with failure modes that
// are genuinely launch-stopping for THIS product (data loss, auth bypass,
// money math errors, privacy leak, broken build, etc.). Keep the four tiers.
// ---------------------------------------------------------------------------
const SEVERITY_DEFS = `Severity definitions (go-live framing):
- blocker: must fix before launch — data corruption/loss, security hole (auth bypass, cross-tenant leak, path traversal, injection), privacy violation, money/billing math that overcharges or undercharges, broken build/typecheck/tests, anything that breaks a user's own workflow on install. <FILL: add this product's launch-stopping failure modes>
- high: wrong results users will see, or a reliability landmine (race that loses data, unbounded growth, missing authorization on a sensitive read).
- medium: robustness/quality issue worth fixing soon (poor error handling on plausible paths, drift between docs and code).
- low: minor issue or nit.`

// ---------------------------------------------------------------------------
// FILL: one paragraph describing the product, its layout, and the authority
// order of its docs (e.g. "spec > root CLAUDE.md > per-package CLAUDE.md > code").
// ---------------------------------------------------------------------------
const PRODUCT_CONTEXT = `<FILL: what the product is, the stack/monorepo layout (apps/* and packages/* or src/ tree), and which docs are the source of truth.>`

// FILL: the project's invariants that count as blockers when violated. Derive
// these from the spec/PRD/README/CLAUDE.md. If none are documented, derive
// sensible universal ones (data integrity, authz on every sensitive read,
// no secrets committed, build/test/lint green, no TODO/placeholder in shipping code).
const HARD_RULES = `Hard rules that count as blockers when violated:
1. <FILL>
2. <FILL>
3. Pre-launch hygiene: no TODO/FIXME/"deferred"/"not yet wired" in shipping code; no lint-disable comments; every file passes the project's lint config.`

const COMMON = `You are one finder in a multi-agent pre-launch audit of the repo at ${ROOT} (run all commands from there; read-only — do NOT modify, create, or delete any file, do NOT run builds or installs).

Product context: ${PRODUCT_CONTEXT}

${HARD_RULES}

Method: read the actual code (and the relevant spec/doc sections for your dimension) before claiming anything. Report ONLY issues you verified by reading the code — no hypotheticals, no style nits. Quote the offending lines in 'evidence' with the path relative to repo root and a line number. NEVER quote a secret value (API key, token, password, private key) — report its type and location and replace the value with <REDACTED>. Prioritize launch blockers. Report at most 12 findings; if you find more, keep the most severe. If an area is clean, say so in 'notes' rather than inventing findings.

${SEVERITY_DEFS}

Your final structured output is data for an orchestrator, not prose for a human.

`

// ---------------------------------------------------------------------------
// FILL: the audit dimensions for THIS project. See the skill's
// references/dimensions.md for a catalog to choose from. Aim for 8–16. Each
// prompt must be self-contained (the finder sees only COMMON + this prompt).
// Name concrete files/dirs to inspect.
// ---------------------------------------------------------------------------
const FINDERS = [
  {
    key: '<dimension-key>',
    prompt: `## Your dimension: <Name> (<which hard rule, if any>)
Targets: <concrete files/dirs to read>.
Check: (a) <specific thing to verify>; (b) <another>; (c) <another>. For each finding quote the offending lines.`,
  },
  // ... more finders ...
]

// ---------------------------------------------------------------------------
// FILL: detected build/test commands. Set any gate to null to skip it.
// Run each from ROOT. Common stacks:
//   pnpm workspace : typecheck 'pnpm -r --if-present typecheck', test 'pnpm -r --if-present test', lint 'pnpm lint', build 'pnpm -r --if-present build'
//   npm/yarn single: 'npm run typecheck', 'npm test', 'npm run lint', 'npm run build'
//   turbo          : 'pnpm turbo run typecheck' etc.
//   cargo (Rust)   : typecheck 'cargo check --workspace', test 'cargo test --workspace', lint 'cargo clippy --workspace -- -D warnings', build 'cargo build --workspace'
//   go             : typecheck 'go build ./...', test 'go test ./...', lint 'golangci-lint run', build 'go build ./...'
// ---------------------------------------------------------------------------
const STACK = {
  typecheck: '<FILL or null>',
  test: '<FILL or null>',
  lint: '<FILL or null>',
  build: '<FILL or null>',
}

const GATE_TIMEOUT = 600000 // ms per Bash run; finders/verify have no such cap.
const GATES = Object.entries(STACK)
  .filter(([, cmd]) => cmd)
  .map(([key, cmd]) => ({
    key,
    prompt: `From ${ROOT}, run the ${key} gate: \`${cmd}\` with a Bash timeout of ${GATE_TIMEOUT} ms. ${
      key === 'build'
        ? 'Building may write dist/ artifacts — that is acceptable; do NOT modify source files, do NOT commit, do NOT run installs.'
        : 'Do not modify any file; do not run installs.'
    } If a single run times out, split it by workspace member / directory group until every member is covered, reusing results already obtained. passed=true only if EVERY member passes${
      key === 'lint' ? ' with zero errors AND zero warnings' : ''
    }. For each failure, capture the member/file name and the first ~10 lines of the error in failures[]. Summarize totals in 'summary'.`,
  }))

// ===========================================================================
// CONTROL FLOW — reusable verbatim. Do not edit below unless you know why.
// (The concurrency gate just below is intentional and load-bearing — do not
// remove it; tune MAX_PARALLEL if needed.)
// ===========================================================================

// ---------------------------------------------------------------------------
// Concurrency cap. A wide fan-out — 8–16 finders, then one verifier per finding
// × up to 2 lenses, plus the critic round — can put enough agents in flight at
// once to trip Claude's API rate limits (429s). This is a GLOBAL gate: it bounds
// how many agent() calls run concurrently across the WHOLE audit, independent of
// the workflow runtime's own min(16, cpu-2) cap. It does NOT reduce the total
// number of agents (still ~40–80) — only how many run at the same time.
// Keep it sane: NOT 1–2 (that serializes the audit). 6 is a good default; lower
// it only if you still see rate-limit errors, raise it on a high-limit account.
// ---------------------------------------------------------------------------
const MAX_PARALLEL = 6
let _inFlight = 0
const _queue = []
function _acquire() {
  if (_inFlight < MAX_PARALLEL) { _inFlight++; return Promise.resolve() }
  return new Promise((resolve) => _queue.push(resolve))
}
function _release() {
  const next = _queue.shift()
  if (next) next()        // hand the in-flight slot straight to the next waiter (no decrement)
  else _inFlight--        // nobody waiting → free the slot
}
// gAgent === agent(), but never lets more than MAX_PARALLEL run at once. Every
// fan-out below calls gAgent so the global cap holds no matter how parallel()
// nests (verify spawns per-finding AND per-lens). parallel() still supplies the
// barriers; this only throttles how fast its thunks actually fire.
async function gAgent(prompt, opts) {
  await _acquire()
  try { return await agent(prompt, opts) }
  finally { _release() }
}

// Launch gates immediately; don't await until the end (they overlap the finders).
const gatesPromise = parallel(
  GATES.map((g) => () =>
    gAgent(g.prompt, { label: `gate:${g.key}`, phase: 'Gates', schema: GATE_SCHEMA }).then((r) =>
      r ? { gate: g.key, ...r } : { gate: g.key, passed: false, summary: 'gate agent failed to report', failures: [] },
    ),
  ),
)

// Finder sweep (barrier needed: dedup requires all findings).
const finderResults = await parallel(
  FINDERS.map((f) => () =>
    gAgent(COMMON + f.prompt, { label: `find:${f.key}`, phase: 'Find', schema: FINDINGS_SCHEMA }).then((r) =>
      r ? { key: f.key, findings: r.findings.slice(0, 12), notes: r.notes || '' } : null,
    ),
  ),
)

const clean = finderResults.filter(Boolean)
const all = []
for (const fr of clean) {
  for (const f of fr.findings) {
    all.push({ ...f, category: fr.key, id: all.length })
  }
}
const finderNotes = clean.map((fr) => ({ key: fr.key, notes: fr.notes }))
log(`${all.length} raw findings from ${clean.length}/${FINDERS.length} finders`)

// Agent-based dedup across the full set.
let unique = all
if (all.length > 5) {
  const listing = all
    .map((f) => `#${f.id} [${f.category}/${f.severity}] ${f.file}${f.line ? ':' + f.line : ''} — ${f.title} :: ${f.description.slice(0, 180)}`)
    .join('\n')
  const d = await gAgent(
    `Below are findings from independent code-audit agents over the same repo. Identify groups that describe the SAME underlying issue (same root cause — typically same file/feature; different finders often phrase it differently). Be conservative: only group when clearly the same defect, not merely the same file. Return groups of ids; pick keepId = the most precise/severe phrasing.\n\n${listing}`,
    { label: 'dedup', phase: 'Dedup', schema: DEDUP_SCHEMA },
  )
  if (d && Array.isArray(d.groups)) {
    const drop = new Set()
    for (const g of d.groups) {
      const kept = all.find((f) => f.id === g.keepId)
      if (!kept) continue
      const dups = (g.duplicateIds || []).filter((x) => x !== g.keepId && all.some((f) => f.id === x))
      for (const x of dups) drop.add(x)
      if (dups.length) kept.alsoReportedBy = dups.map((x) => all.find((f) => f.id === x).category)
    }
    unique = all.filter((f) => !drop.has(f.id))
  }
}
log(`${unique.length} findings after dedup; verifying adversarially`)

const REFUTE_CODE = `You are an adversarial verifier in the repo at ${ROOT} (read-only; run commands from there). Your job is to REFUTE the finding below by reading the cited file plus its surrounding context, callers, and tests. Common refutations: the case is handled elsewhere (upstream guard, caller-side validation, try/catch wrapper, process-level handler), the claim misreads the code, the scenario cannot occur given how the code is invoked, the cited file/line does not exist or the evidence is misquoted, or a test pins the behavior as intended. Only set isReal=true if after a genuine refutation attempt the issue still stands. Re-grade severity strictly by go-live impact. ${SEVERITY_DEFS}\n\nFinding to verify:\n`

const REFUTE_SPEC = `You are an adversarial verifier in the repo at ${ROOT} (read-only). Refute the finding below BY SPEC: read the relevant sections of the authority docs (spec/PRD/README and the affected member's CLAUDE.md). Maybe the behavior is intended, explicitly in/out of scope, or the finding misreads the requirement. Also sanity-check the cited code yourself. Note: a documented scoping decision is not a defect. Only set isReal=true if the finding still stands against the spec. Re-grade severity by go-live impact. ${SEVERITY_DEFS}\n\nFinding to verify:\n`

async function verifyFinding(f, phaseTitle) {
  const desc = `[${f.severity}] (${f.category}) ${f.file}${f.line ? ':' + f.line : ''}\nTitle: ${f.title}\nClaim: ${f.description}\nEvidence quoted by the finder:\n${f.evidence}`
  const lenses = f.severity === 'blocker' || f.severity === 'high' ? ['code', 'spec'] : ['code']
  const verdicts = (
    await parallel(
      lenses.map((lens) => () =>
        gAgent((lens === 'code' ? REFUTE_CODE : REFUTE_SPEC) + desc, {
          label: `verify#${f.id}:${lens}`,
          phase: phaseTitle,
          schema: VERDICT_SCHEMA,
        }).then((v) => (v ? { lens, ...v } : null)),
      ),
    )
  ).filter(Boolean)
  const realCount = verdicts.filter((v) => v.isReal).length
  const status =
    verdicts.length === 0 ? 'unverified' : realCount === verdicts.length ? 'confirmed' : realCount > 0 ? 'uncertain' : 'rejected'
  return { ...f, status, verdicts }
}

const verified = (await parallel(unique.map((f) => () => verifyFinding(f, 'Verify')))).filter(Boolean)
const confirmedCount = verified.filter((v) => v.status === 'confirmed').length
log(`verification done: ${confirmedCount} confirmed, ${verified.filter((v) => v.status === 'uncertain').length} uncertain, ${verified.filter((v) => v.status === 'rejected').length} rejected`)

// Completeness critic round.
const surviving = verified.filter((v) => v.status !== 'rejected')
const criticInput = `A multi-agent pre-launch audit of ${ROOT} just ran these finder dimensions: ${FINDERS.map((f) => f.key).join(', ')}; plus workspace gates (${GATES.map((g) => g.key).join(', ')}).\n\nSurviving findings so far:\n${surviving.map((f) => `- [${f.severity}] (${f.category}) ${f.file} — ${f.title}`).join('\n') || '(none)'}\n\nFinder coverage notes:\n${finderNotes.map((n) => `- ${n.key}: ${(n.notes || '').slice(0, 250)}`).join('\n')}\n\nYou are the completeness critic. Explore the repo briefly (read the layout, root CLAUDE.md / README, the spec table of contents, anything the dimension list plausibly missed — e.g. deployment/runbook readiness, performance-budget assertions, dependency vulnerabilities, license compliance, release/versioning process, observability/alerting). Name up to 6 genuinely UNCOVERED risk areas worth a follow-up investigation before go-live. For each, write a complete self-contained finder prompt (the finder will not see this conversation). If coverage is genuinely complete, return an empty gaps array.`
const critic = await gAgent(criticInput, { label: 'critic', phase: 'Critic', schema: CRITIC_SCHEMA })

let extraVerified = []
if (critic && Array.isArray(critic.gaps) && critic.gaps.length > 0) {
  log(`critic proposed ${critic.gaps.length} follow-up areas: ${critic.gaps.map((g) => g.area).join(', ')}`)
  const extraFound = await parallel(
    critic.gaps.slice(0, 6).map((g) => () =>
      gAgent(COMMON + `## Your dimension: ${g.area} (critic follow-up)\n` + g.prompt, {
        label: `find2:${g.area}`,
        phase: 'Critic',
        schema: FINDINGS_SCHEMA,
      }).then((r) => (r ? r.findings.slice(0, 10).map((x) => ({ ...x, category: 'critic:' + g.area })) : [])),
    ),
  )
  let extras = extraFound.filter(Boolean).flat()
  const keyOf = (f) =>
    f.file + '|' + f.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 6).join(' ')
  const seenKeys = new Set(all.map(keyOf))
  extras = extras.filter((f) => !seenKeys.has(keyOf(f)))
  extras.forEach((f, i) => {
    f.id = 1000 + i
  })
  if (extras.length) {
    log(`${extras.length} new findings from critic round; verifying`)
    extraVerified = (await parallel(extras.map((f) => () => verifyFinding(f, 'Critic')))).filter(Boolean)
  }
}

const gates = await gatesPromise

return {
  gates: gates.filter(Boolean),
  findings: [...verified, ...extraVerified],
  finderNotes,
  stats: {
    rawFindings: all.length,
    afterDedup: unique.length,
    findersReported: clean.length,
    findersTotal: FINDERS.length,
    criticGaps: critic && critic.gaps ? critic.gaps.map((g) => g.area) : [],
  },
}
