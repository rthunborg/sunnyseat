---
name: review-round-guard
description: Use before invoking code review on a SunnySeat story. Enforces the three-round cap, checks prior review findings in the story file, and forces human triage beyond round three.
---

# Review Round Guard

Before running automated code review, inspect the story file under `_bmad-output/implementation-artifacts/` and count prior review rounds in its review findings section.

## Decision Logic

- Zero prior rounds: proceed with Round 1.
- One prior round: proceed with Round 2 and say this is a follow-up review.
- Two prior rounds: proceed with Round 3 and state this is the final automatic round.
- Three or more prior rounds: halt and ask for human triage.

## Human Triage Options After Round Three

1. Waive remaining findings with rationale in the story's Dev Agent Record.
2. Spin unresolved findings into a follow-up story.
3. Explicitly override the cap and run another round.

The cap prevents unbounded review loops. If stories routinely hit Round 3, improve story generation and `story-file-audit` discipline rather than running more automatic review rounds.
