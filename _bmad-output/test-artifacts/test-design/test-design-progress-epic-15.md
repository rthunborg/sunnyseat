---
workflowStatus: completed
totalSteps: 5
stepsCompleted: [step-01-detect-mode, step-02-load-context, step-03-risk-and-testability, step-04-coverage-plan, step-05-generate-output]
lastStep: step-05-generate-output
nextStep: ''
lastSaved: '2026-09-10'
epic: 15
output: '_bmad-output/test-artifacts/test-design/test-design-epic-15.md'
---

# Epic 15 test-design progress and validation record

This epic-specific progress file preserves both pre-existing generic progress files and all earlier epic test plans. It consolidates workflow findings from the current documentation run; it is not a story-status transition or execution report.

1. **Mode/prerequisites:** explicit user request selects create, epic-level, Epic 15. PRD/architecture/epics/readiness/sprint sources exist; numbered ACs live in epics.md, with no dedicated Story 15.x brief required for this plan. Branch `main`, HEAD `ed13d76a6e214f5e9f66ef5b73f8202f4406033d`.
2. **Context:** loaded AGENTS.md, project context, installed test-design workflow/config/customization/template/checklist, relevant risk/NFR knowledge, SunnySeat test-gate, controlling Epic 15 sources, approved historical proposal, direct-sun decision/accuracy specification and latest recorded production findings. Inspected representative source/test seams and previous Epic 12 test design for regression context only. Input inventory is in the main plan frontmatter.
3. **Risks/testability:** 14 risks, 11 with score >=6. F1–F6 are carried into measurement lock, coordinate/oracle limitations, completeness, reproducibility and dependency tracking. Actual transaction tests are needed beyond the existing SQL-text/state-machine mocks. All risks remain open pending evidence.
4. **Coverage:** 35 ACs map to 28 families (M01–M07, I01–I16, O01–O05); priorities 10 P0, 17 P1, 1 P2. Measurement is separate from implementation and production rollout. New numeric budgets remain UNKNOWN; existing truth, temporal, performance and accessibility requirements remain binding.
5. **Output/checklist:** epic plan produced using the installed template, with timeline/priority separation per the checklist. Risk scores, scenario identifiers, AC mapping, source links, evidence fields, role ownership, entry/exit gates, effort ranges and preservation checked. Runtime/NFR pass verdicts and all owner approvals remain pending.

## Explicit workflow adaptations and limitations

- Output follows the configured `test-design/` directory and existing epic naming. A new epic-specific progress filename avoids overwriting another workflow's saved state.
- Python customization resolution was attempted but the host's `python3` alias is unavailable. The documented manual fallback found only base customization: project-context persistent fact, empty prepend/append/on-complete, no team/user override files. The completion resolver was also attempted and skipped on failure as instructed; no Python installation or configuration change.
- Epic-level output uses one worker. No browser exploration, Pact access, utility installation or new framework is needed to plan this monolithic snapshot/geometry change. No external service was contacted.
- Existing acceptance criteria are preserved. The checklist's generic ambiguity/approval items are conditional on G1 and later maintainer review; this report does not claim stakeholder acceptance. Generic percentage pass thresholds cannot waive a mandatory Epic 15 criterion.
- No story brief, ATDD scaffold, sprint regeneration, status transition, application edit, production operation or resource launch. Story-baseline checks were not run because this task only designs tests; future story preflight remains mandatory.
- No reset, revert, clean, commit, push, merge or deployment. The two new Markdown planning files are the only intended writes. Existing modified/untracked paths were SHA-256 inventoried before writing for final preservation comparison, including the config, party-mode file and documentation-contract test.

## Next handoff

Prepare Story 15.1 in a fresh scoped session, run normal preflight, execute reproducible measurements and obtain the complete G1 decision lock. Later implementation/ATDD and rollout require their own authorized work and predecessor evidence. Do not interpret test-design workflow completion as evidence that the implementation or production gates pass.

## Final validation

- All 14 pre-existing modified/untracked files matched their initial SHA-256 hashes; protected config, party-mode memory and documentation-contract test are unchanged.
- Branch and HEAD are unchanged. Git status adds only the two intended planning Markdown files to the prior state.
- `git diff --check` passed, with the existing config CRLF warning. New-document scenario checks found 28 unique families, the declared 10/17/1 priority distribution, correct risk products and no broken Markdown source links.
- No application tests, measurements, database checks, browser execution or production verification were run. The plan's approval and evidence gates remain open.
