# Audit dimension catalog

A menu of finder dimensions to choose from when filling `FINDERS` in
`workflow-template.js`. **Pick the 8–16 that actually apply to the target
project** — do not include a dimension the codebase has no surface for. Each
finder prompt must be self-contained and name concrete files/dirs to read.

Selection rule of thumb: if the repo has the surface, include it. A web API needs
auth/multi-tenancy; a CLI does not. A billing system needs money-math; a static
site does not. Add project-specific dimensions the catalog doesn't list.

## Universal (almost always include)
- **hygiene** — repo-wide: TODO/FIXME/"deferred"/"placeholder"/"coming soon" in shipping code; lint-disable comments; `console.log`/debug leaks in library/server paths; committed secrets (`git ls-files | grep -i env`, token/key literals, private keys — report type and location only, never quote the secret value); package.json sanity (license, version, name, stray `private`/`publish` flags); dead exports; README/doc claims that contradict code.
- **error-handling** — unhandled rejections / floating promises, swallowed errors, error paths that crash the process or leak stack traces to users, missing timeouts on network calls.
- **wiring / contract-drift** — mismatches BETWEEN modules that unit tests miss: enum/union variants unhandled in a switch, request body vs server validation schema field drift, event/record shapes written by one module and parsed by another, route paths vs the client fetches, `workspace:*`/version skew.

## Security & data
- **authz** — every sensitive read/write enforces authorization server-side; role model enforced per-route; can a user read/modify another's data; client-only guards backing privileged views.
- **multi-tenancy** — every query filters by tenant/org scope; scope comes from the authenticated principal, never request body/params; ingest attribution can't be forged; caches keyed without tenant id.
- **authn** — session/token verification, expiry/revocation, sign-out invalidates server-side, cookie flags (httpOnly/secure/sameSite), CSRF on state-changing routes.
- **injection** — SQL/NoSQL injection, command injection, path traversal (`..`/symlink), SSRF, `dangerouslySetInnerHTML`/XSS sinks.
- **secrets-handling** — tokens logged/echoed/sent to wrong endpoint; credential storage (file perms 0600, plaintext locations); secret-to-process handoff windows. Findings must never quote the secret value itself — use `<REDACTED>`.
- **privacy / data-capture** — if the product has a privacy guarantee: what exactly is persisted/transmitted; over-capture of content/PII; whether regression tests actually pin the guarantee.

## Data integrity
- **schema / migrations** — column/type conventions on every table; migrations apply in order and match the schema (drift = bug); required indexes present; multi-dialect parity if applicable; transactional DDL.
- **data-loss / sync** — checkpoint/HWM advanced only after confirmed ack; idempotency so retries don't double-count; poison-pill handling (one bad record doesn't wedge a batch); partial-write atomicity; ordering/clock-skew assumptions.
- **money / billing math** — unit errors (per-1k vs per-1M, cents vs dollars), rounding direction, division-by-zero, currency handling, proration/refund correctness, can a user be over/undercharged.
- **metrics / calculation correctness** — division-by-zero on empty input, time-window boundary edges (inclusive/exclusive, UTC vs local, DST, epoch s vs ms), percentile/median impls, idempotent re-aggregation (re-run doesn't double-count).

## Runtime & ops
- **concurrency / lifecycle** — lockfiles and stale-lock takeover, races between concurrent starts, clean shutdown mid-work, AbortController actually reaching the I/O, backoff bounds (interval can't collapse to 0 or grow unbounded), timer drift.
- **resource-limits** — unbounded memory (reading whole large files vs streaming), unbounded growth (queues/tables/logs), event-loop blocking on sync work, missing pagination.
- **local-server / bind-safety** — bind address not `0.0.0.0` unless intended, CORS posture, content-types, atomic config writes, port-conflict behavior.
- **performance-budgets** — if the project claims latency/overhead budgets, are there assertions; obvious heavy paths (N+1 queries, sync I/O on hot path, cold-start cost).

## Delivery surfaces
- **ci-actions / build-artifacts** — published `dist/` freshness vs `src`; CI action soft-fail (can it ever fail a user's build); action.yml correctness; build determinism.
- **install / hooks** — installers that clobber a user's existing config/hook; idempotent install/uninstall; soft-fail on every error path; no unexpected files written.
- **cli** — every advertised command wired; meaningful exit codes; `--help`/`--version` work without side effects; commands that can hang without a timeout; cold-start budget.
- **frontend / spa** — role gating backed by server enforcement; token storage XSS exposure; offline/error states (infinite spinners, missing error boundaries); hardcoded URLs/ports breaking deploys; injected-HTML sinks.
- **deps / supply-chain** — known-vulnerable dependencies, license compliance, lockfile committed and consistent, no unexpected/typosquat packages.
- **docs / runbook readiness** — deploy/runbook exists and matches reality; env vars documented; rollback path; observability/alerting wired.

## Writing a good finder prompt
Mirror the template's style:
```
## Your dimension: <Name> (<hard rule # if any>)
Targets: <exact files/dirs>.
Check: (a) <specific, verifiable thing>; (b) <another>; (c) <another>.
<Any spec sections to read first.> Quote offending lines in 'evidence'.
```
Make each check a concrete thing an agent can confirm by reading code, not a
vague "review X for quality." Name the files. Tie the worst findings to a hard rule.
