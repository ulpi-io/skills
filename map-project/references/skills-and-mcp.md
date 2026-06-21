# Available Skills & MCP Discovery

Use this reference when `map-project` needs to discover the skills and MCP servers the target project
provides, and render them into `CLAUDE.md` so future agents prefer them instead of reinventing work or
forgetting they exist.

Why this section lives INLINE in `CLAUDE.md` (not an imported reference): `CLAUDE.md` is always in
context; imported references are lazy-loaded (or only pulled in via `@import`). A "prefer the available
skills/MCP" directive only changes behavior if it is always loaded. Keep it compact — a table, not prose.

## Discover available skills

Enumerate project-committed skills (portable, shared with everyone who clones the repo):

- `.claude/skills/*/SKILL.md` and `*/SKILL.MD` — read frontmatter `name`, `description`, and
  `when_to_use` (or `argument-hint`) from each. Some skills nest references in subfolders; the
  `SKILL.md` carrying frontmatter `name` is the skill root (`.claude/skills/**/SKILL.md`).
- Repo-enabled plugin skills: `enabledPlugins` / marketplace entries in `.claude/settings.json` and
  `.claude/settings.local.json`, plus any committed `.claude/plugins/` directory.

Rules:

- list only skills an agent in THIS repo can actually invoke. Do not present the user's global
  `~/.claude/skills` as repo-provided; if mentioned, label them "user-global (may be absent for
  collaborators)".
- take each skill's trigger from its real `when_to_use`, not a guess.
- skip skills that are disabled in settings or are neither model- nor user-invocable.

## Discover enabled MCP servers

- `.mcp.json` at the repo root — the standard committed MCP config. List each server key and infer
  purpose from its command/url/package.
- `.claude/settings.json` / `.claude/settings.local.json` — `enabledMcpjsonServers`,
  `enableAllProjectMcpServers`, and any `mcpServers` block. A server in `.mcp.json` is active only if
  enabled (or `enableAllProjectMcpServers: true`); note others as "configured but not enabled".

Rules:

- NEVER copy secrets, tokens, headers, or env values into `CLAUDE.md`; document the server name and
  what it is for, not its credentials.
- describe each server by capability (e.g. "GitHub — PRs, issues, code search"), not just package name.

## Output section for `CLAUDE.md`

Two pieces, both INLINE in `CLAUDE.md` (never a lazy reference):

1. A one-line pointer at the VERY TOP of `CLAUDE.md`, above the project overview, so it is the first
   thing read:

       > ⚡ Check "Available Skills & MCP" below before implementing — prefer existing skills/MCP over
       > doing the work by hand.

2. ONE compact section near the top, after the project overview and before the deep imports:

       ## Available Skills & MCP — prefer these

       Before implementing, check this list: if a skill or MCP server below covers the task, use it
       instead of doing the work by hand or assuming it does not exist.

       ### Skills
       | Skill | Use it when |
       |-------|-------------|
       | `/<name>` | <one-line trigger from when_to_use> |

       ### MCP servers
       | Server | Provides | Use for |
       |--------|----------|---------|
       | `<name>` | <capability> | <when to reach for it> |

Rules:

- omit a table if the repo has none of that kind (don't invent rows); omit the whole section AND the
  top pointer if there are neither skills nor MCP servers.
- one line per skill / server; push longer guidance into the relevant reference, not this section.
- keep the whole section under ~40 lines even for skill-heavy repos — it is a capability router, not a
  manual.
