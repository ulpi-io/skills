#!/usr/bin/env bash
# run-kiro.sh — robust launcher for delegating ONE task to kiro-cli.
#
# Encapsulates the fragile mechanics (prompt passing, empty-prompt guard, scoped trust, SKILL
# injection, baseline capture) so the calling agent never hand-rolls mktemp/heredoc and never has to
# remember to inline skills — both were sources of past failures.
#
# Contract: the agent writes the rephrased, boundary-tagged prompt to a file with the WRITE TOOL
# (literal bytes — no shell, no heredoc, no mktemp), then calls:
#
#   bash <skill-dir>/helpers/run-kiro.sh --mode <review|implement|autonomous> --prompt-file <path> \
#        [--skill <name>]...
#
# --skill <name>   Make kiro FOLLOW an installed kiro skill (repeatable). The helper resolves
#                  .kiro/skills/<name>/SKILL.md (or ~/.kiro/skills/<name>/SKILL.md), prepends it to the
#                  prompt over stdin under a <skill> tag, and tells kiro to read its references/ on
#                  demand. Kiro has NO Skill tool, so this deterministic inject is how kiro actually
#                  uses a skill in a one-shot --no-interactive run. An uninstalled name is warned + skipped.
#
# Trust is scoped by mode (least privilege — never blanket --trust-all-tools by default):
#   review      --trust-tools=fs_read,execute_bash          read-only; clears the auto-mode classifier
#   implement   --trust-tools=fs_read,fs_write,execute_bash  least privilege that can edit files
#   autonomous  --trust-all-tools                            unsafe-by-default; opt-in only, and the
#                                                            harness may need a Bash allow-rule for kiro-cli
set -uo pipefail

MODE=implement
PROMPT_FILE=
SKILL_FILES=""   # newline-separated resolved SKILL.md paths (no arrays → bash 3.2 + set -u safe)
while [ $# -gt 0 ]; do
  case "$1" in
    --mode)        MODE="${2:-}"; shift 2 ;;
    --prompt-file) PROMPT_FILE="${2:-}"; shift 2 ;;
    --skill)
      _name="${2:-}"; shift 2
      _f=""
      for _base in ".kiro/skills" "$HOME/.kiro/skills"; do
        if [ -f "$_base/$_name/SKILL.md" ]; then _f="$_base/$_name/SKILL.md"; break; fi
      done
      if [ -n "$_f" ]; then
        SKILL_FILES="${SKILL_FILES}${_f}
"
      else
        echo "run-kiro: skill '$_name' not installed for kiro (.kiro/skills/$_name/ or ~/.kiro/skills/$_name/) — proceeding without it." >&2
      fi
      ;;
    -h|--help)     grep '^#' "$0" | cut -c3-; exit 0 ;;
    *) echo "run-kiro: unknown argument: $1" >&2; exit 64 ;;
  esac
done

# 1. Locate kiro-cli — the binary is `kiro-cli` (not `kiro`), often in ~/.local/bin which may be off PATH.
KIRO="$(command -v kiro-cli 2>/dev/null || true)"
if [ -z "$KIRO" ]; then
  for p in "$HOME/.local/bin/kiro-cli" "$HOME/.kiro/bin/kiro-cli" /usr/local/bin/kiro-cli /opt/homebrew/bin/kiro-cli; do
    [ -x "$p" ] && { KIRO="$p"; break; }
  done
fi
if [ -z "$KIRO" ]; then
  echo "run-kiro: kiro-cli not found (PATH or ~/.local/bin). Install per https://kiro.dev/docs/cli or implement the task yourself." >&2
  exit 69
fi

# 2. Prompt must exist and be NON-EMPTY. This is the guard that stops kiro running on no input.
if [ -z "$PROMPT_FILE" ] || [ ! -f "$PROMPT_FILE" ]; then
  echo "run-kiro: --prompt-file is missing or not a file: '${PROMPT_FILE:-}'. Write the prompt with the Write tool first." >&2
  exit 66
fi
if [ ! -s "$PROMPT_FILE" ]; then
  echo "run-kiro: prompt file is EMPTY ('$PROMPT_FILE') — refusing to launch kiro on no input. Re-write the prompt and retry." >&2
  exit 65
fi

# 3. Scope trust by mode (least privilege). --trust-all-tools is unsafe-by-default and opt-in only.
case "$MODE" in
  review)     TRUST="--trust-tools=fs_read,execute_bash" ;;
  implement)  TRUST="--trust-tools=fs_read,fs_write,execute_bash" ;;
  autonomous) TRUST="--trust-all-tools" ;;
  *) echo "run-kiro: --mode must be review | implement | autonomous (got '$MODE')." >&2; exit 64 ;;
esac

# Prepend each resolved skill's SKILL.md to the prompt (kiro has no Skill tool — this is how it FOLLOWS
# a skill in a one-shot run). Body goes over stdin (no argv/shell parsing); references load on demand.
emit_skills() {
  [ -z "$SKILL_FILES" ] && return 0
  printf '%s\n' "$SKILL_FILES" | while IFS= read -r _sf; do
    [ -z "$_sf" ] && continue
    printf '<skill name="%s"> — follow this as the domain contract; read its references on demand from %s/ via fs_read.\n' \
      "$(basename "$(dirname "$_sf")")" "$(dirname "$_sf")/references"
    cat "$_sf"
    printf '\n</skill>\n\n'
  done
}

# 4. Baseline so the caller can verify what actually changed (never trust kiro's word alone).
BASE="$(git rev-parse HEAD 2>/dev/null || echo NO_GIT)"
[ -n "$SKILL_FILES" ] && echo "run-kiro: injecting $(printf '%s\n' "$SKILL_FILES" | grep -c .) skill(s) into the prompt" >&2
echo "run-kiro: launching kiro — mode=$MODE trust=$TRUST baseline=$BASE" >&2

# 5. Run. Feed (skills + prompt) via STDIN — never on argv, never through shell parsing of the content.
#    This matches the codex companion's stdin/spawn approach: no command substitution, no ARG_MAX
#    ceiling, nothing in the process list. The prompt was validated non-empty above.
{ emit_skills; cat "$PROMPT_FILE"; } | "$KIRO" chat --no-interactive "$TRUST"
RC=$?

echo "run-kiro: kiro exited $RC. VERIFY changes: git diff --stat $BASE ; git status --short" >&2
exit $RC
