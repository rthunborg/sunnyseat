---
name: review-round-guard
description: Enforces the three-round cap on code reviews per story. Use this skill before invoking the bmad-code-review skill on any story. Checks how many prior review rounds have occurred and either allows the next round, requires human confirmation to override the cap, or forces human triage of remaining findings.
---

# Review Round Guard

Before invoking bmad-code-review on any story, check the story file 
for prior review history and enforce the three-round cap.

## How to check

Open the story file at _bmad-output/implementation-artifacts/stories/
<story-id>-<slug>.md. Look for a `### Review Findings` section. Count 
headers matching the pattern `**Round N of 3**` (where N is 1, 2, or 3).

## Decision logic

- **Zero prior rounds:** Proceed with Round 1. Before starting, add 
  the header `**Round 1 of 3**` to your findings section.

- **One prior round:** Proceed with Round 2. Add the header `**Round 
  2 of 3**`. Announce to the user: "Starting Round 2 of 3. This is 
  a follow-up review to verify Round 1 fixes and catch any regressions."

- **Two prior rounds:** Proceed with Round 3, but surface explicitly 
  that this is the final automatic round. Announce: "Starting Round 
  3 of 3 — the final automatic review round. Any issues remaining 
  after this round will require human triage."

- **Three or more prior rounds:** HALT. Do not run another review 
  automatically. Present the current state of the story (open 
  findings from prior rounds, what was resolved, what remains) and 
  require explicit user choice:

  1. **Waive remaining findings.** The user adds a note to the 
     story's Dev Agent Record explaining why the remaining issues 
     are acceptable, and the story transitions to done.
  
  2. **Spin off follow-up story.** The user adds a new story to 
     epics.md covering the unresolved findings, and the current 
     story transitions to done with a reference to the follow-up.
  
  3. **Override the cap and run another round.** The user must 
     explicitly confirm they understand they're breaking the 
     guardrail and why. Only proceed after explicit confirmation.

## Why the cap exists

Agents do not tire of finding issues the way humans do. Without a 
cap, each review round surfaces slightly different findings and the 
loop never terminates. Rounds 1 and 2 catch genuine issues; Round 
3 is the last honest shot. Beyond that, reviews find marginal nits 
and consume time without improving quality.

If stories routinely hit Round 3, that's a signal the SM is 
generating inadequate stories — not a problem with the review 
process itself. Tighten the story-file-audit discipline instead of 
running more review rounds.