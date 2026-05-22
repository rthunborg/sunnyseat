#!/usr/bin/env bash
# fetch-claude-design.sh
# Re-fetches the SunnySeat Claude Design bundle and refreshes the local copy.
#
# The bundle is the visual + behavioural source of truth for the front end
# rebuild. MVP captures use only the MVP Unlocked prototype files from the
# active bundle; Post-MVP locked/payment prototypes are preserved as future
# references but are not active MVP validation sources.
#
# Usage:  scripts/fetch-claude-design.sh
# Run from the project root.

set -euo pipefail

URL="https://api.anthropic.com/v1/design/h/gKMZ6UQJpiNOQ8Cm3dD7Bw"
TARGET="nextjs-app/docs/design/references/claude-design"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Fetching Claude Design bundle from $URL"
curl -sfL "$URL" -o "$TMP_DIR/bundle.tar.gz"

echo "Extracting bundle"
tar -xzf "$TMP_DIR/bundle.tar.gz" -C "$TMP_DIR"

# The archive contains a single top-level "sunnyseat/" directory.
# Resolve it without assuming the literal name in case it ever changes.
INNER_DIR=$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [ -z "$INNER_DIR" ] || [ ! -d "$INNER_DIR" ]; then
  echo "ERROR: Could not find inner directory inside bundle." >&2
  exit 1
fi

echo "Refreshing $TARGET"
mkdir -p "$TARGET"
# Wipe everything *except* the project-curated artefacts that don't come
# from the upstream bundle:
#   - STATE-MAPPING.md  (Screen ID → prototype state recipes)
#   - ESLINT-AUDIT.md   (durable audit justifying the eslint.config.mjs ignore)
find "$TARGET" -mindepth 1 -maxdepth 1 \
  ! -name 'STATE-MAPPING.md' \
  ! -name 'ESLINT-AUDIT.md' \
  -exec rm -rf {} +
cp -R "$INNER_DIR/." "$TARGET/"

# ─── Story 1.6 review (P48 / AC6 + R2-P3 narrow-scope correction) ────────────
# AC6 requires upstream-fixable ESLint errors to be patched at the fetch
# stage rather than ignored. The audit (ESLINT-AUDIT.md) identified
# exactly two raw ASCII apostrophes in JSX text content that trigger
# react/no-unescaped-entities — both on the line "Each pin's peak hour
# depends on orientation" in Tweaks.jsx (`src/` MVP and `src-free/`
# Post-MVP mobile flavours).
#
# Round 1 P48 used a regex `[A-Za-z]'[A-Za-z]` over every .jsx/.tsx file
# in the bundle. Round 2 R-003 (Regression Hunter) found the regex was
# far broader than its comment claimed — it also matches the ~17
# apostrophes in JS line-comments and identifiers ("Figma's",
# "host-sync'd", "can't favorite", "don't start pan", "what's gated",
# …). Every fetch silently mangled those comments to `Figma&apos;s`
# etc., and risked corrupting future string literals shaped `"don't"`.
#
# R2-P3 fix: replace the regex sweep with a literal-substring substitution
# (`pin's peak` → `pin&apos;s peak`) applied ONLY to the two known target
# files. The literal text exists nowhere else in the bundle, the
# substitution is naturally idempotent (a re-run cannot match because the
# literal `'` is already replaced), and it cannot touch comments or
# string literals. If a future bundle introduces a new JSX text-node
# apostrophe, ESLINT-AUDIT.md must be updated and a new line-targeted
# substitution added here — not a regex sweep.
echo "Applying AC6 entity-escape post-processing (R2-P3 narrow scope)"
APOSTROPHE_TARGETS=(
  "$TARGET/project/src/Tweaks.jsx"
  "$TARGET/project/src-free/Tweaks.jsx"
)
for FILE in "${APOSTROPHE_TARGETS[@]}"; do
  if [ -f "$FILE" ]; then
    if sed --version >/dev/null 2>&1; then
      # GNU sed
      sed -i "s/pin's peak/pin\&apos;s peak/g" "$FILE"
    else
      # BSD sed (macOS)
      sed -i '' "s/pin's peak/pin\&apos;s peak/g" "$FILE"
    fi
  fi
done
echo "  (entity-escape pass complete on ${#APOSTROPHE_TARGETS[@]} target file(s))"

CHAT_COUNT=0
if [ -d "$TARGET/chats" ]; then
  CHAT_COUNT=$(find "$TARGET/chats" -type f | wc -l)
fi

echo "Done. Updated bundle:"
echo "  $TARGET/README.md"
echo "  $TARGET/project/SunnySeat MVP Mobile Unlocked.html"
echo "  $TARGET/project/SunnySeat MVP Desktop Unlocked.html"
echo "  $TARGET/project/  (MVP + Post-MVP HTML prototypes + JSX source)"
if [ "$CHAT_COUNT" -gt 0 ]; then
  echo "  $TARGET/chats/  ($CHAT_COUNT transcripts)"
else
  echo "  chats/: none in current handoff bundle"
fi
echo
echo "Next steps:"
echo "  1. git diff  -- review what changed in the bundle"
echo "  2. nextjs-app/scripts/capture-claude-design-refs.mjs  -- regenerate visual gate PNGs"
