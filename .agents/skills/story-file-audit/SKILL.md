---
name: story-file-audit
description: Use immediately after creating any SunnySeat BMAD story file under _bmad-output/implementation-artifacts/ and before marking it ready-for-dev.
---

# Story File Audit

Run this audit after creating a story file. Do not mark the story `ready-for-dev` until all checks pass or Rasmus explicitly waives an item.

## Seven Checks

1. Acceptance criteria are preserved from `_bmad-output/planning-artifacts/epics.md` without paraphrase.
2. Frontend design gate criteria are present when the epic requires them; absence is called out for backend/infrastructure stories.
3. Tasks are sequenced by dependency.
4. No invented requirements or unmapped scope.
5. File impact list is realistic.
6. References include the right primary sources: `AGENTS.md`, `project-context.md`, `epics.md`, architecture, UX spec, and `nextjs-app/docs/design/DESIGN.md` for frontend stories.
7. Test gate matches the actual project commands and story phase.

## Reporting Format

| Criterion | Status | Fix Applied |
|---|---|---|
| ACs preserved | pass/fail | ... |
| Design gate criteria | pass/fail | ... |
| Task sequencing | pass/fail | ... |
| No invented requirements | pass/fail | ... |
| File impact list | pass/fail | ... |
| Doc references | pass/fail | ... |
| Test gate | pass/fail | ... |

End with either "All checks pass, story ready for dev" or a concise list of fixes still needed.
