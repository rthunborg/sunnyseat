# Story 12.1 provider-pivot contract

This tracked artifact is the CI-safe mirror of the local BMAD story's
`Superseded Epic Text` boundary.

The historical Epic 12 title and prose proposed Google Places
`regularOpeningHours` ingestion. That design is superseded and is not executable
acceptance criteria. Story 12.1 implements provider-neutral canonical hours,
one-time provenance remediation, and a weekly staleness/manual-review audit.

Controlling sources:

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-12.md`
- `_bmad-output/planning-artifacts/research/technical-google-places-api-policy-epic-12-research-2026-07-12.md`
- Architecture Decision `E12-AD-01`
- Architecture Decision `E12-AD-13`

Only Google Place IDs may remain as server-side identity/reference metadata.
No Google hours, provider URL/content, or provider credential may enter the
database, durable outcomes, fixtures, DTOs, logs, scheduled jobs, or public UI.
