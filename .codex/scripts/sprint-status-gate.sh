#!/usr/bin/env bash
set -euo pipefail

# Best-effort Codex hook adapter.
#
# Reads a proposed PreToolUse event as JSON from stdin. Codex hook event
# schemas may vary across clients, so this script recognizes common tool names,
# command fields, path fields, and edit/patch payload fields. It fails closed
# only when it can clearly detect a direct sprint-status.yaml transition to
# review.
#
# The canonical gate is scripts/story-review.sh <story-id>. Keep real policy
# there rather than duplicating it in this convenience guardrail.

INPUT="$(cat || true)"

if [[ -z "${INPUT//[[:space:]]/}" ]]; then
  exit 0
fi

extract_with_jq() {
  local filter="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -r "$filter // empty" 2>/dev/null <<<"$INPUT" || true
  fi
}

TOOL_NAME="$(
  extract_with_jq '.tool_name // .toolName // .name'
)"

COMMAND="$(
  extract_with_jq '.command // .tool_input.command // .params.command'
)"

PATH_FIELDS="$(
  extract_with_jq '
    [
      .path,
      .file_path,
      .filepath,
      .target_path,
      .tool_input.path,
      .tool_input.file_path,
      .tool_input.filepath,
      .tool_input.target_path,
      .params.path,
      .params.file_path,
      .params.filepath,
      .params.target_path
    ] | map(select(type == "string")) | join("\n")
  '
)"

PAYLOAD="$(
  extract_with_jq '
    [
      .content,
      .new_content,
      .after,
      .value,
      .patch,
      .diff,
      .tool_input.content,
      .tool_input.new_content,
      .tool_input.after,
      .tool_input.value,
      .tool_input.patch,
      .tool_input.diff,
      .params.content,
      .params.new_content,
      .params.after,
      .params.value,
      .params.patch,
      .params.diff
    ] | map(select(type == "string")) | join("\n")
  '
)"

EVENT_TEXT="$TOOL_NAME
$COMMAND
$PATH_FIELDS
$PAYLOAD
$INPUT"

if ! grep -Eq '(^|[/\\])sprint-status\.yaml([[:space:]"'\''}]|$)' <<<"$EVENT_TEXT"; then
  exit 0
fi

if grep -Eq '(^|[[:space:]"'\'';&|])(\./)?scripts/story-review\.sh([[:space:]"'\'';&|]|$)' <<<"$COMMAND"; then
  exit 0
fi

looks_like_review_transition() {
  grep -Eq '(^|[[:space:]])[A-Za-z0-9._-]+:[[:space:]]*review([[:space:]#"'\'']|$)|"review"|'\''review'\''' <<<"$1"
}

looks_like_direct_command_write() {
  local text="$1"

  grep -Eiq '\breview\b' <<<"$text" || return 1

  grep -Eiq '(^|[[:space:];|&])(sed|perl|python|python3|node|ruby|pwsh|powershell|bash|sh)[[:space:]]|Set-Content|Add-Content|Out-File|>>|>[[:space:]]*.*sprint-status\.yaml|sprint-status\.yaml.*>[[:space:]]' <<<"$text"
}

if looks_like_review_transition "$PAYLOAD" || looks_like_review_transition "$INPUT" || looks_like_direct_command_write "$COMMAND"; then
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Direct sprint-status.yaml review transitions are blocked. Use scripts/story-review.sh <story-id> from the repository root so checks and visual validation run before sprint status changes."
  }
}
EOF
  exit 0
fi

exit 0
