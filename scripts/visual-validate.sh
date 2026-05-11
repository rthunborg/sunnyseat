#!/usr/bin/env bash
set -euo pipefail

# Provider-neutral SunnySeat visual validation wrapper.
#
# Current migration status:
# - claude/anthropic: delegates to the legacy .claude implementation.
# - none: dry-run/manual-review mode; not a passing automated gate unless
#   ALLOW_MANUAL_VISUAL_VALIDATION=1 is explicitly set by a human.
# - openai: reserved for a future provider implementation.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCREEN_ID="${1:-}"
ROUTE="${2:-}"
VIEWPORT="${3:-mobile}"
PROVIDER="${VISUAL_VALIDATE_PROVIDER:-claude}"

usage() {
  cat <<'EOF'
Usage: scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]

Environment:
  VISUAL_VALIDATE_PROVIDER=claude|anthropic|none|openai
  DEV_SERVER_URL=http://localhost:3000

VISUAL_VALIDATE_PROVIDER=none is for dry-run/manual review only. It exits
non-zero unless ALLOW_MANUAL_VISUAL_VALIDATION=1 is also set.
EOF
}

if [[ -z "$SCREEN_ID" || -z "$ROUTE" ]]; then
  usage >&2
  exit 2
fi

case "$PROVIDER" in
  claude|anthropic)
    LEGACY_SCRIPT="$ROOT_DIR/.claude/scripts/visual-validate.sh"
    if [[ ! -f "$LEGACY_SCRIPT" ]]; then
      echo "VISUAL GATE FAILED: legacy Claude visual validator is missing: $LEGACY_SCRIPT" >&2
      exit 1
    fi

    if [[ -x "$LEGACY_SCRIPT" ]]; then
      exec "$LEGACY_SCRIPT" "$SCREEN_ID" "$ROUTE" "$VIEWPORT"
    fi

    exec bash "$LEGACY_SCRIPT" "$SCREEN_ID" "$ROUTE" "$VIEWPORT"
    ;;

  none)
    cat >&2 <<EOF
VISUAL GATE MANUAL MODE: VISUAL_VALIDATE_PROVIDER=none
Screen:   $SCREEN_ID
Route:    $ROUTE
Viewport: $VIEWPORT

This is not an automated visual pass. Run a manual comparison against
nextjs-app/docs/design/references/screens/${VIEWPORT}/${SCREEN_ID}.png and
record the rationale in the story or validation artifact.
EOF
    if [[ "${ALLOW_MANUAL_VISUAL_VALIDATION:-}" == "1" ]]; then
      echo "Manual visual acceptance explicitly allowed by ALLOW_MANUAL_VISUAL_VALIDATION=1" >&2
      exit 0
    fi
    exit 2
    ;;

  openai)
    cat >&2 <<'EOF'
VISUAL GATE FAILED: VISUAL_VALIDATE_PROVIDER=openai is not implemented yet.

This migration intentionally avoided an untested vision-provider rewrite.
Use VISUAL_VALIDATE_PROVIDER=claude with the existing legacy implementation,
or VISUAL_VALIDATE_PROVIDER=none only for explicitly documented manual review.
EOF
    exit 2
    ;;

  *)
    echo "VISUAL GATE FAILED: unknown VISUAL_VALIDATE_PROVIDER '$PROVIDER'" >&2
    usage >&2
    exit 2
    ;;
esac
