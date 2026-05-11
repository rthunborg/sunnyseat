#!/bin/bash
# Usage: .claude/scripts/epic-done.sh "<epic name>"
# The dev agent runs this after all stories in an epic pass the completion gate

EPIC_NAME=$1

echo ""
echo "=================================================="
echo "  EPIC COMPLETE: $EPIC_NAME"
echo "  All stories in this epic passed the sprint-status gate."
echo "  Awaiting manual review before next epic."
echo "=================================================="
echo ""
echo "Review checklist:"
echo "  [ ] Implemented flow matches Figma designs"
echo "  [ ] Animations and transitions feel correct"
echo "  [ ] All interaction states present (empty, error, loading)"
echo "  [ ] Tests pass cleanly"
echo ""
echo "After review:"
echo "  - Merge epic branch to main: git checkout main && git merge epic/<branch>"
echo "  - To continue: reply 'approved' or 'continue' to the dev agent."
echo "  - To request fixes: describe what needs changing."
echo ""

# Pause execution — agent session stays open, you respond in the terminal
read -p "Your review (or press Enter to pause and review manually): " REVIEW_INPUT

if [ -n "$REVIEW_INPUT" ]; then
  echo "REVIEW INPUT RECORDED: $REVIEW_INPUT"
fi

exit 0
