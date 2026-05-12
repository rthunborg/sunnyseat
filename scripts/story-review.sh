#!/usr/bin/env bash
set -euo pipefail

# Canonical SunnySeat BMAD story -> review transition gate.
#
# This script runs the available deterministic checks, runs visual validation
# for mapped screen stories when possible, writes a validation artifact, and
# only then updates _bmad-output/implementation-artifacts/sprint-status.yaml.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMPLEMENTATION_DIR="$ROOT_DIR/_bmad-output/implementation-artifacts"
SPRINT_STATUS="$IMPLEMENTATION_DIR/sprint-status.yaml"
PROJECT_CONTEXT="$ROOT_DIR/project-context.md"
APP_DIR="$ROOT_DIR/nextjs-app"

usage() {
  cat <<'EOF'
Usage: scripts/story-review.sh [--dry-run] <story-id>

Examples:
  scripts/story-review.sh 1-6-ci-cd-quality-gates
  scripts/story-review.sh --dry-run 1-6-ci-cd-quality-gates

The story must already be in-progress in sprint-status.yaml.
--dry-run runs the same available checks but does not update sprint-status.yaml.
EOF
}

DRY_RUN=0
STORY_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "$STORY_ID" ]]; then
        echo "ERROR: only one story id may be provided" >&2
        usage >&2
        exit 2
      fi
      STORY_ID="$1"
      shift
      ;;
  esac
done

if [[ -z "$STORY_ID" ]]; then
  usage
  exit 2
fi

if [[ ! -f "$SPRINT_STATUS" ]]; then
  echo "ERROR: sprint status file is missing: $SPRINT_STATUS" >&2
  exit 1
fi

VALIDATION_DIR="$IMPLEMENTATION_DIR/validation"
mkdir -p "$VALIDATION_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
VALIDATION_LOG="$VALIDATION_DIR/${STORY_ID}-review-${TIMESTAMP}.log"
exec > >(tee "$VALIDATION_LOG") 2>&1

echo "SunnySeat story review gate"
echo "Story: $STORY_ID"
echo "Mode: $([[ "$DRY_RUN" == "1" ]] && echo "dry-run" || echo "apply")"
echo "Sprint status: $SPRINT_STATUS"
echo "Validation artifact: $VALIDATION_LOG"
echo

find_story_file() {
  shopt -s nullglob
  local candidates=(
    "$IMPLEMENTATION_DIR/$STORY_ID.md"
    "$IMPLEMENTATION_DIR/stories/$STORY_ID.md"
  )
  shopt -u nullglob

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  local escaped_story_id
  escaped_story_id="$(escape_ere "$STORY_ID")"
  find "$IMPLEMENTATION_DIR" -maxdepth 2 -type f -name "*.md" -print 2>/dev/null \
    | grep -E "/${escaped_story_id}[^[:alnum:]][^/]*\.md$" \
    | sort \
    | head -1 || true
}

escape_ere() {
  sed -E 's/[][(){}.^$*+?|\\]/\\&/g' <<<"$1"
}

get_status() {
  local story="$1"
  grep -E "^[[:space:]]+${story}:[[:space:]]*" "$SPRINT_STATUS" \
    | head -1 \
    | sed -E 's/^[[:space:]]+[^:]+:[[:space:]]*([^[:space:]#]+).*/\1/' || true
}

has_npm_script() {
  local script_name="$1"
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts[process.argv[1]] ? 0 : 1)" "$script_name" >/dev/null 2>&1
}

run_package_script_if_present() {
  local script_name="$1"
  if ! has_npm_script "$script_name"; then
    echo "Skipping npm script '$script_name': not defined in nextjs-app/package.json"
    return 0
  fi

  echo
  echo "Running npm script: $script_name"
  npm run "$script_name"
}

screen_ids_from_context() {
  [[ -f "$PROJECT_CONTEXT" ]] || return 0
  awk -F'|' '
    /^##[[:space:]]+Screen ID/ {
      in_route_map=1
      next
    }
    in_route_map && /^---[[:space:]]*$/ {
      exit
    }
    in_route_map && /^##[[:space:]]+/ {
      exit
    }
    in_route_map && /^\|/ {
      id=$2
      route=$3
      gsub(/^[ \t]+|[ \t]+$/, "", id)
      gsub(/^[ \t]+|[ \t]+$/, "", route)
      if (id != "Screen ID" && id !~ /^-+$/ && route != "" && route !~ /^-+$/) print id
    }
  ' "$PROJECT_CONTEXT" | sort -u
}

story_has_standalone_visual_gate() {
  local story_file="$1"
  awk '
    /^##[[:space:]]+Design Gate Criteria/ {
      in_design_gate=1
      next
    }
    in_design_gate && /^##[[:space:]]+/ {
      exit
    }
    in_design_gate {
      print
    }
  ' "$story_file" | grep -Eiq 'No standalone (screenshot gate|visual deliverable)' && return 1

  return 0
}

story_mentions_screen_id() {
  local story_file="$1"
  local screen_id="$2"
  local escaped_screen_id
  escaped_screen_id="$(escape_ere "$screen_id")"

  grep -Eq "Figma frame \`${escaped_screen_id}\`|references/screens/(mobile|desktop)/${escaped_screen_id}\\.png|_state=${escaped_screen_id}([^[:alnum:]-]|$)" "$story_file"
}

extract_story_screen_ids() {
  local story_file="$1"
  [[ -f "$story_file" ]] || return 0

  story_has_standalone_visual_gate "$story_file" || return 0

  local id
  while IFS= read -r id; do
    if story_mentions_screen_id "$story_file" "$id"; then
      printf '%s\n' "$id"
    fi
  done < <(screen_ids_from_context)
}

lookup_screen_routes() {
  local screen_id="$1"
  awk -F'|' -v id="$screen_id" '
    /^##[[:space:]]+Screen ID/ {
      in_route_map=1
      next
    }
    in_route_map && /^---[[:space:]]*$/ {
      exit
    }
    in_route_map && /^##[[:space:]]+/ {
      exit
    }
    !in_route_map {
      next
    }
    {
      key=$2
      gsub(/^[ \t]+|[ \t]+$/, "", key)
      if (key == id) {
        route=$3
        viewport=$4
        gsub(/^[ \t]+|[ \t]+$/, "", route)
        gsub(/`/, "", route)
        gsub(/^[ \t]+|[ \t]+$/, "", viewport)
        if (route != "") print route "\t" viewport
      }
    }
  ' "$PROJECT_CONTEXT"
}

run_checks() {
  if [[ ! -f "$APP_DIR/package.json" ]]; then
    echo "Skipping app checks: nextjs-app/package.json not found"
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: node is required to inspect nextjs-app/package.json scripts" >&2
    return 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm is required to run configured nextjs-app checks" >&2
    return 1
  fi

  cd "$APP_DIR"
  run_package_script_if_present lint
  run_package_script_if_present typecheck
  run_package_script_if_present test
  cd "$ROOT_DIR"
}

run_visual_validation() {
  local story_file="$1"
  local validator="$ROOT_DIR/scripts/visual-validate.sh"

  if [[ ! -f "$PROJECT_CONTEXT" ]]; then
    echo "ERROR: project-context.md missing; cannot resolve Screen ID -> Route Map" >&2
    return 1
  fi

  if [[ -z "$story_file" || ! -f "$story_file" ]]; then
    echo "Skipping visual validation: story file not found for $STORY_ID"
    return 0
  fi

  local screen_ids
  screen_ids="$(extract_story_screen_ids "$story_file" || true)"
  if [[ -z "$screen_ids" ]]; then
    echo "Skipping visual validation: no mapped screen ID found in story file"
    return 0
  fi

  if [[ ! -x "$validator" ]]; then
    echo "ERROR: visual validation is required for mapped screen IDs, but $validator is not executable or not present" >&2
    return 1
  fi

  local screen_id
  while IFS= read -r screen_id; do
    [[ -z "$screen_id" ]] && continue
    local routes
    routes="$(lookup_screen_routes "$screen_id" || true)"
    if [[ -z "$routes" ]]; then
      echo "ERROR: screen ID '$screen_id' is in the story but not mapped in project-context.md" >&2
      return 1
    fi

    while IFS=$'\t' read -r route viewport; do
      [[ -z "$route" ]] && continue
      viewport="${viewport:-mobile}"
      echo
      echo "Running visual validation: screen='$screen_id' route='$route' viewport='$viewport'"
      "$validator" "$screen_id" "$route" "$viewport"
    done <<<"$routes"
  done <<<"$screen_ids"
}

update_sprint_status_to_review() {
  local current_status
  current_status="$(get_status "$STORY_ID")"

  if [[ -z "$current_status" ]]; then
    echo "ERROR: story '$STORY_ID' not found in sprint-status.yaml development_status" >&2
    return 1
  fi

  if [[ "$current_status" == "review" ]]; then
    echo "Story '$STORY_ID' is already marked review. No sprint-status update needed."
    return 0
  fi

  if [[ "$current_status" != "in-progress" ]]; then
    echo "ERROR: story '$STORY_ID' is '$current_status'; expected 'in-progress' before review" >&2
    return 1
  fi

  local today tmp
  today="$(date +%F)"
  tmp="$(mktemp "${SPRINT_STATUS}.tmp.XXXXXX")"

  if ! awk -v story="$STORY_ID" -v today="$today" '
    BEGIN { updated=0 }
    /^[[:space:]]*last_updated:[[:space:]]*/ {
      print "last_updated: " today
      next
    }
    $0 ~ "^[[:space:]]+" story ":[[:space:]]*" {
      indent=$0
      sub(/[^ \t].*$/, "", indent)
      print indent story ": review"
      updated=1
      next
    }
    { print }
    END { if (!updated) exit 2 }
  ' "$SPRINT_STATUS" > "$tmp"; then
    rm -f "$tmp"
    echo "ERROR: failed to safely edit sprint-status.yaml" >&2
    return 1
  fi

  mv "$tmp" "$SPRINT_STATUS"
  echo "Updated sprint status: $STORY_ID -> review"
}

STORY_FILE="$(find_story_file)"
if [[ -n "$STORY_FILE" ]]; then
  echo "Story file: $STORY_FILE"
else
  echo "ERROR: story file not found for '$STORY_ID'; refusing to mark review because visual/test scope cannot be determined" >&2
  exit 1
fi

CURRENT_STATUS="$(get_status "$STORY_ID")"
if [[ -z "$CURRENT_STATUS" ]]; then
  echo "ERROR: story '$STORY_ID' not found in sprint-status.yaml" >&2
  exit 1
fi

echo "Current sprint status: $CURRENT_STATUS"
if [[ "$CURRENT_STATUS" != "in-progress" && "$CURRENT_STATUS" != "review" ]]; then
  echo "ERROR: expected '$STORY_ID' to be in-progress before review, got '$CURRENT_STATUS'" >&2
  exit 1
fi

run_checks
run_visual_validation "$STORY_FILE"
if [[ "$DRY_RUN" == "1" ]]; then
  echo
  echo "DRY RUN: checks passed; sprint-status.yaml was not updated."
else
  update_sprint_status_to_review
fi

echo
echo "Story review gate passed."
echo "Validation artifact written to: $VALIDATION_LOG"
