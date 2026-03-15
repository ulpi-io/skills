# @ulpi/skills

Skill pack for AI coding agents. Compatible with [skills.sh](https://skills.sh).

## Install

```bash
npx skills add ulpi-io/skills
```

Or install a specific skill:

```bash
npx skills add ulpi-io/skills -s browse
```

## Skills

| Skill | Description |
|-------|-------------|
| [browse](browse/) | Fast headless browser CLI — persistent Chromium daemon, 40+ commands, ref-based interaction. Requires `bun install -g @ulpi/browse`. |
| [codemap](codemap/) | Hybrid vector+BM25 code search, symbol lookup, dependency analysis, PageRank scoring, coupling metrics, circular dependency detection. Requires `npm install -g @ulpi/codemap`. |

## Prerequisites

Each skill may have its own runtime dependency. See the individual SKILL.md for setup instructions.
