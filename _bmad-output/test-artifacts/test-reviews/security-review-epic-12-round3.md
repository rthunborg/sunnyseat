# Auto-BMAD Epic 12 Integration Review Round 3 - Security

Date: 2026-08-17

Scope: dedicated security review of the current Epic 12 integration state from baseline `1c9287c` plus intended uncommitted integration changes. Per delegate constraint, no git commands were run; scope was reconstructed from BMAD Epic 12 state/artifacts and current source files. Excluded user-owned files:

- `_bmad-output/implementation-artifacts/validation/story-12-10-mer-info-timing/20260726-local/evidence.json`
- `nextjs-app/test/e2e/map-primary.spec.ts`

Security focus:

- Production dev-editor gating and service-role write boundary.
- Public venue visibility for list/detail/reviews/feedback, including `hidden` and `deleted_at`.
- Supabase RLS/storage policy source for venue media and service-only geometry/weather tables.
- Secret/env exposure in source and deployable config.
- Injection surfaces: PostgREST filters, RPC calls, JSON parsing, public route input handling.
- Sensitive-data exposure through DTO mapping and route error bodies.

## Findings

No reachable exploitable security findings.

Severity counts:

- HIGH: 0
- MEDIUM: 0
- LOW: 0

## Reviewed Evidence

- `nextjs-app/lib/services/dev-venue-editor-guard.ts`: denies production, missing dev flag, forwarded-host ambiguity, and non-loopback hosts. Browser-realistic loopback `GET`/`HEAD` requests may omit `Origin`; all writes still require a matching loopback `Origin` before route handlers access the service-role editor store.
- `nextjs-app/app/api/dev/venues/route.ts` and `nextjs-app/app/api/dev/venues/[identifier]/route.ts`: call the guard before listing, decoding identifiers, parsing JSON, or invoking Supabase-backed writes.
- `supabase/migrations/20260727173000_dev_venue_editor_display_coordinates.sql`: `apply_dev_venue_editor_patch` is `security definer`, bounded to `public` search path, revoked from public/anon/authenticated, and granted only to `service_role`.
- `nextjs-app/lib/services/venue-store.ts`: Supabase public reads filter `hidden = false` and `deleted_at is null`; shared id/slug resolver applies the same filters for detail/reviews/feedback.
- `supabase/migrations/20260808130000_add_venue_soft_delete_timestamp.sql` and `20260718214954_add_public_venue_visibility.sql`: public visibility fields exist as route-filter inputs, not client DTO fields.
- `nextjs-app/app/api/reviews/route.ts`, `nextjs-app/app/api/venues/[slug]/feedback/route.ts`, and persistence adapters: inputs are schema-validated, venue identity is resolved through the shared public resolver, writes use Supabase query builders/service-role inserts, and route errors avoid database error details.
- `supabase/migrations/20260719000000_venue_media_storage.sql`: `venue-media` bucket is public-read only for browser rendering; stale anon/auth write policies for the bucket are dropped; the only explicit browser policy is SELECT for anon/authenticated.
- `nextjs-app/lib/utils/venue-media.ts`, `nextjs-app/lib/services/dev-venue-editor-validation.ts`, and `nextjs-app/scripts/upload-venue-media.mjs`: managed media URLs are origin/bucket/slug/version/rendition constrained; upload tooling rejects oversize, metadata-bearing, animated, non-WebP, or wrong-dimension files before service-role upload.
- `supabase/migrations/20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql` plus scheduled runners: geometry/weather tables are service-only, RLS forced, and service functions are not granted to public/anon/authenticated.
- `.github/workflows/hours-review-audit.yml` and `.github/workflows/sun-geometry-and-weather.yml`: protected Production environment, read-only repository token permissions, explicit fail-closed enablement variables, and secrets passed only as environment variables to service-only runners.

## Non-Finding Notes

- The alternate Round 3 reviewer identified the no-`Origin` loopback-read compatibility defect after this security pass. The remediation deliberately widens only `GET`/`HEAD`; a focused regression proves no-`Origin` writes remain denied before service access.
- Local ignored env files contain real-looking credentials. They are covered by root `.gitignore` and `nextjs-app/.gitignore`, are not treated as Epic 12 diff findings, and no values are reproduced here.
- This was a source/static review. Live protected Supabase policy proof remains owned by the orchestrator's protected-validation lane if not already accepted separately.
