#!/bin/bash
# sprint-status-gate.sh
# PreToolUse hook — fires before any write_file call.
# If the target is sprint-status.yaml AND the new content sets a story
# to "review", runs the visual validation gate for frontend stories.
# Exit 0 = allow the write. Exit 1 = block the write.

# ─── Resolve script directory for sibling script calls ────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Extract the file path and new content from Claude's tool input ───────────
FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.path // ""')
NEW_CONTENT=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.content // ""')

# Only care about sprint-status.yaml writes
if ! echo "$FILE_PATH" | grep -q "sprint-status.yaml"; then
  exit 0
fi

# ─── Check if the new content contains a transition to "review" ───────────────
if ! echo "$NEW_CONTENT" | grep -q '"review"\|: review'; then
  exit 0
fi

# Extract the story ID that is being set to review.
# Two YAML shapes are supported:
#   1. BMAD struct shape:   `- id: E1S4\n    status: review`
#   2. Flat-key shape:      `  1-4-maplibre-integration-venue-pin-layer: review`
# Try BMAD first; if no match, fall back to the flat-key form. Take the last
# match in the file so callers transitioning a single story always pick that
# one rather than an older sibling that was already at "review".
STORY_ID=$(echo "$NEW_CONTENT" | grep -B5 'status:.*review' | grep 'id:' | tail -1 | sed 's/.*id: *//' | tr -d ' "')

if [ -z "$STORY_ID" ]; then
  STORY_ID=$(echo "$NEW_CONTENT" \
    | grep -E '^[[:space:]]+[A-Za-z0-9._-]+:[[:space:]]+review[[:space:]]*$' \
    | grep -vE '^[[:space:]]+epic-' \
    | tail -1 \
    | sed -E 's/^[[:space:]]+([^:]+):.*/\1/')
fi

if [ -z "$STORY_ID" ]; then
  echo "INFO: Could not extract story ID from sprint-status write — visual validation skipped"
  exit 0
fi

echo "=== Sprint status gate: story '$STORY_ID' → review ==="

# ─── Find the story file ──────────────────────────────────────────────────────
# BMAD story files may be named story-E2S5.md, E2S5.md, 2_5_slug.md, etc.
# Search implementation artifacts directories for any file containing the story ID
STORY_FILE=$(find . -path "*implementation-artifacts*" -name "*.md" 2>/dev/null | xargs grep -l "^# Story.*${STORY_ID}\|id:.*${STORY_ID}" 2>/dev/null | head -1)

# Fallback: try common naming patterns
if [ -z "$STORY_FILE" ]; then
  STORY_FILE=$(find . -name "story-${STORY_ID}.md" -o -name "${STORY_ID}.md" -o -name "${STORY_ID,,}.md" 2>/dev/null | head -1)
fi

# Also check the story_file field in the sprint-status.yaml itself
if [ -z "$STORY_FILE" ]; then
  STORY_FILE=$(echo "$NEW_CONTENT" | grep -A10 "id: ${STORY_ID}" | grep 'story_file:' | head -1 | sed 's/.*story_file: *//' | tr -d ' "')
  if [ -n "$STORY_FILE" ] && [ ! -f "$STORY_FILE" ]; then
    STORY_FILE=""
  fi
fi

if [ -z "$STORY_FILE" ]; then
  echo "INFO: Story file not found for '$STORY_ID' — visual validation skipped"
  exit 0
fi

echo "Found story file: $STORY_FILE"

# ─── Check if story references a Figma frame name ────────────────────────────
# Look for patterns like: Figma frame `map-primary` or screen: map-primary
SCREEN_ID=$(grep -o 'Figma frame `[^`]*`' "$STORY_FILE" | head -1 | sed 's/Figma frame `//;s/`//')

# Fallback: look for screen_id or screen: patterns
if [ -z "$SCREEN_ID" ]; then
  SCREEN_ID=$(grep 'screen_id:' "$STORY_FILE" | head -1 | sed 's/.*screen_id:[[:space:]]*//' | tr -d ' "')
fi

if [ -z "$SCREEN_ID" ]; then
  echo "INFO: No Figma frame reference found in story — backend story, visual validation skipped"
  exit 0
fi

# ─── Look up the route for this screen ID ─────────────────────────────────────
CONTEXT_FILE=$(find . -name "project-context.md" -not -path "./.git/*" 2>/dev/null | head -1)

if [ -z "$CONTEXT_FILE" ]; then
  echo "WARNING: project-context.md not found — cannot resolve route for screen '$SCREEN_ID'"
  echo "Visual validation skipped. Ensure project-context.md exists with Screen ID → Route Map."
  exit 0
fi

# Match the Screen ID → Route Map table row(s).
# The screen ID must be the first cell (anchored to the start of the line)
# so we don't accidentally match other tables whose notes column mentions
# the screen ID as part of a longer string (e.g. "map-primary-offline" in
# the Design Artifacts table).
#
# Story 1.6 review (P39): screens that ship both mobile + desktop variants
# have one row per viewport (see project-context.md "Screen ID → Route
# Map"). The original `head -1` always picked the first row (mobile),
# leaving desktop variants structurally unreachable from this gate.
# Iterate every matching row and run visual validation per row instead.
MATCH_LINES=$(grep -E "^\|[[:space:]]+${SCREEN_ID}[[:space:]]+\|" "$CONTEXT_FILE")

if [ -z "$MATCH_LINES" ]; then
  echo "WARNING: Screen ID '$SCREEN_ID' found in story but not in project-context.md screen map"
  echo "Add it to the Screen ID → Route Map in project-context.md before retrying"
  echo "GATE BLOCKED: Cannot validate screen '$SCREEN_ID' without a route mapping"
  exit 1
fi

VALIDATE_SCRIPT="$SCRIPT_DIR/visual-validate.sh"
if [ ! -x "$VALIDATE_SCRIPT" ]; then
  echo "WARNING: $VALIDATE_SCRIPT not found or not executable"
  echo "Run: chmod +x $VALIDATE_SCRIPT"
  exit 0
fi

# ─── Run visual validation for EACH viewport row ──────────────────────────────
ANY_FAIL=0
while IFS= read -r MATCH_LINE; do
  [ -z "$MATCH_LINE" ] && continue
  # Strip backticks so route cells written as `\`/\`` resolve cleanly to `/`.
  ROUTE=$(echo "$MATCH_LINE" | awk -F'|' '{print $3}' | sed 's/^ *//;s/ *$//' | tr -d '`')
  VIEWPORT_TYPE=$(echo "$MATCH_LINE" | awk -F'|' '{print $4}' | tr -d ' ')
  VIEWPORT_TYPE="${VIEWPORT_TYPE:-mobile}"  # Default to mobile if column is missing

  if [ -z "$ROUTE" ]; then
    echo "WARNING: Empty route in match for screen '$SCREEN_ID' viewport='$VIEWPORT_TYPE' — skipping row"
    continue
  fi

  echo "Running visual validation: screen='$SCREEN_ID' route='$ROUTE' viewport='$VIEWPORT_TYPE'"
  "$VALIDATE_SCRIPT" "$SCREEN_ID" "$ROUTE" "$VIEWPORT_TYPE"
  VISUAL_EXIT=$?
  if [ $VISUAL_EXIT -ne 0 ]; then
    echo "  ❌ FAIL: $SCREEN_ID / $VIEWPORT_TYPE"
    ANY_FAIL=1
  else
    echo "  ✓ PASS: $SCREEN_ID / $VIEWPORT_TYPE"
  fi
done <<< "$MATCH_LINES"

if [ $ANY_FAIL -ne 0 ]; then
  echo ""
  echo "GATE BLOCKED: Visual validation failed for at least one viewport of '$SCREEN_ID'"
  echo "The sprint-status.yaml write has been blocked."
  echo "Fix the visual issues described above, then re-attempt story completion."
  exit 1
fi

echo "GATE PASSED: Visual validation passed for every viewport of '$SCREEN_ID'"
echo "Allowing sprint-status.yaml update to 'review'"
exit 0