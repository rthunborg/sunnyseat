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

OLD_PAYLOAD="$(
  extract_with_jq '
    [
      .old_string,
      .before,
      .original_content,
      .tool_input.old_string,
      .tool_input.before,
      .tool_input.original_content,
      .params.old_string,
      .params.before,
      .params.original_content
    ] | map(select(type == "string")) | join("\n")
  '
)"

NEW_PAYLOAD="$(
  extract_with_jq '
    [
      .content,
      .new_content,
      .new_string,
      .after,
      .value,
      .tool_input.content,
      .tool_input.new_content,
      .tool_input.new_string,
      .tool_input.after,
      .tool_input.value,
      .params.content,
      .params.new_content,
      .params.new_string,
      .params.after,
      .params.value
    ] | map(select(type == "string")) | join("\n")
  '
)"

PATCH_PAYLOAD="$(
  extract_with_jq '
    [
      .patch,
      .diff,
      .tool_input.patch,
      .tool_input.diff,
      .params.patch,
      .params.diff
    ] | map(select(type == "string")) | join("\n")
  '
)"

PAYLOAD="$OLD_PAYLOAD
$NEW_PAYLOAD
$PATCH_PAYLOAD"

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

status_keys_matching() {
  local text="$1"
  local status_regex="$2"

  awk -v status_regex="$status_regex" '
    {
      line=$0
      sub(/^[[:space:]]*[+-][[:space:]]*/, "", line)
      if (line ~ "^[[:space:]]*[A-Za-z0-9._-]+:[[:space:]]*" status_regex "([[:space:]#\"'\'']|$)") {
        sub(/^[[:space:]]*/, "", line)
        sub(/:.*/, "", line)
        print line
      }
    }
  ' <<<"$text" | sort -u
}

has_status_transition_to_review() {
  local before_text="$1"
  local after_text="$2"
  local key

  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    if grep -Eq "^[[:space:]]*[+ ]?[[:space:]]*${key}:[[:space:]]*review([[:space:]#\"']|$)" <<<"$after_text"; then
      return 0
    fi
  done < <(status_keys_matching "$before_text" '(in-progress|ready-for-dev|backlog|done)')

  return 1
}

looks_like_patch_review_transition() {
  local patch_text="$1"
  local removed added

  removed="$(grep -E '^[[:space:]]*-[[:space:]]*[A-Za-z0-9._-]+:[[:space:]]*(in-progress|ready-for-dev|backlog|done)([[:space:]#"'\'']|$)' <<<"$patch_text" || true)"
  added="$(grep -E '^[[:space:]]*\+[[:space:]]*[A-Za-z0-9._-]+:[[:space:]]*review([[:space:]#"'\'']|$)' <<<"$patch_text" || true)"

  [[ -n "$removed" && -n "$added" ]] || return 1
  has_status_transition_to_review "$removed" "$added"
}

looks_like_direct_command_write() {
  local text="$1"

  grep -Eiq '(^|[^[:alnum:]_-])review([^[:alnum:]_-]|$)' <<<"$text" || return 1

  grep -Eiq '(^|[[:space:];|&])(sed|perl|python|python3|node|ruby|pwsh|powershell|bash|sh)[[:space:]]|Set-Content|Add-Content|Out-File|>>|>[[:space:]]*.*sprint-status\.yaml|sprint-status\.yaml.*>[[:space:]]' <<<"$text" || return 1

  grep -Eiq '[A-Za-z0-9._-]+:[[:space:]]*review([[:space:]#"'\'']|$)|s[/#|][^/#|]*(in-progress|ready-for-dev|backlog|done)[^/#|]*[/#|][^/#|]*review' <<<"$text"
}

if looks_like_patch_review_transition "$PATCH_PAYLOAD" \
  || has_status_transition_to_review "$OLD_PAYLOAD" "$NEW_PAYLOAD" \
  || looks_like_direct_command_write "$COMMAND"; then
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
