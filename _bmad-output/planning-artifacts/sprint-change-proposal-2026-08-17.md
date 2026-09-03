# Sprint Change Proposal — Launch Resilience Evidence

Date: 2026-08-17
Mode: Batch
Approval: The maintainer explicitly requested autonomous implementation of this post–Epic 12 launch-readiness sequence.

## Issue Summary

Epic 12 is complete and immutable. Its final NFR assessment reported CONCERNS without a release blocker, leaving three evidence gaps:

1. only three provider-classified cold starts exist for /api/venues, below the required sample of 20;
2. external dependency destination paths were inferred rather than directly measured;
3. no full isolated restore/failover drill has been executed and documented.

A cache MISS is not evidence of a cold function start.

## Impact Analysis

- Epic 12 remains done; no story, retrospective, gate, or closeout artifact is reopened.
- Add Epic 13 with one cohesive backend/operations Story 13.1.
- The shipped MVP and UX are unchanged.
- Add safe request-scoped telemetry, a reproducible production measurement lane, and an isolated restore runbook/drill.
- Production overwrite or failover remains excluded without fresh explicit approval.

## Recommended Approach

Use a moderate direct adjustment: one new Epic 13 and one Story 13.1. This is smaller and safer than reopening Epic 12, rolling back production code, or redefining the MVP.

## Implementation Handoff

- Product owner/developer: register Epic 13 and Story 13.1 without changing Epic 12.
- Developer: implement telemetry, measurement tooling, runbook, and safe rehearsal.
- Maintainer: provide or approve staging/provider credentials when required; separately approve any real production failover.

Success means all three NFR caveats have direct, reproducible evidence or are explicitly documented as blocked by a credential or provider capability after safe alternatives are exhausted.

## Checklist Record

- [x] Trigger and concrete evidence identified.
- [x] Epic impact assessed; new Epic 13 selected.
- [x] PRD and UX remain unchanged.
- [x] Architecture, observability, testing, and DR artifacts require additions.
- [x] Direct adjustment selected; rollback and MVP redefinition rejected.
- [x] Handoff and success criteria defined.
- [x] Maintainer approval documented from the initiating request.
- [x] Sprint status update routed through BMAD course-correction and sprint-planning workflows.
