#!/bin/bash
# visual-validate.sh
# Compares a running dev server screenshot against the Figma design reference.
# Called by sprint-status-gate.sh during story review transitions.
#
# Usage: .claude/scripts/visual-validate.sh <screen-id> <dev-server-route> [viewport]
# Example: .claude/scripts/visual-validate.sh map-primary / mobile
#          .claude/scripts/visual-validate.sh map-primary / desktop
#
# 🎯 Project-specific parameters (update per project):
#   DEV_SERVER_URL      — your local dev server (e.g. http://localhost:3000)
#
# Prerequisites:
#   - Playwright: npx playwright install chromium
#   - ANTHROPIC_API_KEY set in shell environment
#   - Dev server running at DEV_SERVER_URL
#   - Reference PNGs exported from Figma in /docs/design/references/screens/

SCREEN_ID=$1
ROUTE=$2
VIEWPORT_TYPE="${3:-mobile}"                       # "mobile" or "desktop", defaults to mobile
DEV_SERVER_URL="${DEV_SERVER_URL:-http://localhost:3000}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Set viewport dimensions based on type
if [ "$VIEWPORT_TYPE" = "desktop" ]; then
  VIEWPORT="1440,900"
else
  VIEWPORT="390,844"
fi

if [ -z "$SCREEN_ID" ] || [ -z "$ROUTE" ]; then
  echo "Usage: visual-validate.sh <screen-id> <route> [mobile|desktop]"
  exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "VISUAL GATE FAILED: ANTHROPIC_API_KEY is not set in the environment"
  echo "Add 'export ANTHROPIC_API_KEY=sk-ant-...' to ~/.zshrc or ~/.bashrc"
  exit 1
fi

echo "--- Visual validation: $SCREEN_ID ---"

# ─── Platform-aware base64 encoding (no line wrapping) ────────────────────────
base64_encode() {
  if base64 --help 2>&1 | grep -q '\-w'; then
    base64 -w 0 "$1"              # GNU/Linux
  else
    base64 -b 0 "$1" 2>/dev/null || base64 "$1" | tr -d '\n'  # macOS
  fi
}

# ─── Step 1: Screenshot the running dev server via Playwright ─────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMPL_SCREENSHOT=$(mktemp /tmp/impl-XXXXXX.png)
(cd "$PROJECT_ROOT/nextjs-app" && npx playwright screenshot \
  --browser chromium \
  --viewport-size "$VIEWPORT" \
  "$DEV_SERVER_URL$ROUTE" \
  "$IMPL_SCREENSHOT" 2>/dev/null)

if [ ! -f "$IMPL_SCREENSHOT" ] || [ ! -s "$IMPL_SCREENSHOT" ]; then
  echo "VISUAL GATE FAILED: Could not screenshot dev server at $DEV_SERVER_URL$ROUTE"
  echo "Ensure the dev server is running before visual validation."
  rm -f "$IMPL_SCREENSHOT"
  exit 1
fi

# ─── Step 2: Load Figma reference screenshot from repo ────────────────────────
REFERENCE_DIR="${PROJECT_ROOT}/nextjs-app/docs/design/references/screens/${VIEWPORT_TYPE}"
REFERENCE_SCREENSHOT="${REFERENCE_DIR}/${SCREEN_ID}.png"

if [ ! -f "$REFERENCE_SCREENSHOT" ] || [ ! -s "$REFERENCE_SCREENSHOT" ]; then
  echo "VISUAL GATE FAILED: No reference image for screen '$SCREEN_ID' (${VIEWPORT_TYPE})"
  echo "Export from Figma and save to ${REFERENCE_DIR}/${SCREEN_ID}.png"
  rm -f "$IMPL_SCREENSHOT"
  exit 1
fi

# ─── Step 3: Base64-encode both images for the API call ───────────────────────
IMPL_B64=$(base64_encode "$IMPL_SCREENSHOT")
REF_B64=$(base64_encode "$REFERENCE_SCREENSHOT")

# ─── Step 4: Send both to Claude for comparison ──────────────────────────────
RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d @- <<EOF
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "You are a visual QA reviewer comparing a UI implementation against its design reference.\n\nImage 1 (REFERENCE): The approved Figma design for screen '$SCREEN_ID'.\nImage 2 (IMPLEMENTATION): A screenshot of the current implementation running on the dev server.\n\nCompare them and respond with EXACTLY one of two formats:\n\nIf the implementation is acceptable:\nPASS: [one sentence summary of match quality]\n\nIf the implementation has blocking issues:\nFAIL: [comma-separated list of specific issues]\n\nBlocking issues are: wrong layout structure, missing UI components, incorrect colour scheme, broken responsive behaviour, missing or incorrectly positioned UI chrome elements.\n\nNon-blocking (do not fail for these): minor pixel-level spacing differences, placeholder text/images, loading states, hover states not visible in screenshot, minor spacing deviations from the Figma design (the design defines the visual target, not exact pixel measurements).\n\nSPECIAL HANDLING FOR MAP-BASED SCREENS: If the screen contains a map (screen IDs containing 'map', or any screen where a map canvas is visible), the map canvas content itself is dynamic and will never match the reference exactly. You MUST IGNORE the following map-related differences: different street layouts, different tile imagery, different geographic content, different map labels, different map zoom level, different map center coordinates, different exact positions of venue pins on the map, and different number of venue pins visible. You MUST FOCUS ON: UI chrome overlaying the map (search bars, floating buttons, bottom sheets, navigation bars, time sliders), the overall warm/sand colour tint of the map area matching the reference, the presence and visual styling of venue pins (sunny vs shaded variants should look correct even if positioned differently), and the overall layout composition of non-map elements. A map screen where the underlying map shows different streets but all UI chrome, colours, and pin styling match the reference should PASS. Only FAIL a map screen if the UI chrome itself is wrong — wrong button positions, missing bottom sheet, wrong colours on overlays, missing search bar, etc.\n\nBe strict but fair on UI chrome. Be lenient on map content and dynamic data."
        },
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": "$REF_B64"
          }
        },
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": "$IMPL_B64"
          }
        }
      ]
    }
  ]
}
EOF
)

# ─── Step 5: Parse response and gate ──────────────────────────────────────────
VERDICT=$(echo "$RESPONSE" | jq -r '.content[0].text' 2>/dev/null)

if [ -z "$VERDICT" ] || [ "$VERDICT" = "null" ]; then
  echo "VISUAL GATE FAILED: No response from Anthropic API"
  echo "Check that ANTHROPIC_API_KEY is valid and has available credits"
  rm -f "$IMPL_SCREENSHOT"
  exit 1
fi

if echo "$VERDICT" | grep -q "^PASS"; then
  echo "VISUAL GATE PASSED: $VERDICT"
  rm -f "$IMPL_SCREENSHOT"
  exit 0
else
  echo "VISUAL GATE FAILED: $VERDICT"
  echo "Fix the above issues. The sprint-status gate will re-run validation on the next review attempt."
  rm -f "$IMPL_SCREENSHOT"
  exit 1
fi