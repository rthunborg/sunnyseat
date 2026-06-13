---
baseline_commit: 4ac03827ce31867e93be982e34456a80254ac0fc
---

# Story 3.0: Remove Admin Surface & Adopt Manual Venue Operations

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Product decision (2026-05-30):** SunnySeat will not have an admin page, admin venue configuration UI, admin venue CRUD API, admin authentication surface, venue candidate review queue, or admin-operated building upload surface. New and changed venues are managed by direct database insert/update queries only.
>
> **Sequencing:** Implement this before Stories 3.1-3.4 so routing, feedback, reviews, and visit-loop hardening do not build on admin/auth/candidate-review code that is no longer product scope.
>
> **Database safety:** If cleanup requires schema/data changes, do not run them automatically. Create `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql` with the exact manual SQL for Rasmus to review and run.

## Story

As a **product owner and maintainer**,
I want all admin-related runtime code, tests, and documentation removed,
So that SunnySeat only supports consumer MVP flows and venue changes happen through direct database insert/update queries.

## Acceptance Criteria

**Given** the project no longer supports an admin page or admin venue configuration
**When** the active Next.js app is audited
**Then** no `/admin` page, `/api/admin` route, admin venue CRUD route, admin login route, admin authentication middleware, admin-specific provider, or admin-only component remains in live runtime paths
**And** no replacement admin UI/API is introduced in this story

**Given** venues will be added or changed only by direct database insert/update queries
**When** project documentation and planning artifacts are updated
**Then** they clearly state that venue onboarding/configuration is manual database work
**And** they no longer describe admin venue CRUD, admin geometry editing, admin building upload, admin candidate approval queues, or admin dashboards as planned SunnySeat product scope

**Given** admin authentication is no longer product scope
**When** dependencies, environment examples, types, and middleware are audited
**Then** unused admin-auth packages, JWT admin environment variables, admin user DTOs, role/claim helpers, and admin-only validation helpers are removed
**And** any server-only Supabase service-role code that remains is named and documented as backend infrastructure, not admin functionality

**Given** previous code may include venue candidate, verification, review-needed, or admin override concepts
**When** venue/domain types, mappers, fixtures, solar/building helpers, and public API responses are cleaned up
**Then** admin/candidate-review fields are removed from active contracts unless they are still required for public consumer functionality
**And** any retained manually-managed data concept uses neutral terminology such as manual or service-role rather than admin

**Given** tests may still cover removed admin behavior
**When** unit, component, E2E, and helper tests are audited
**Then** every test whose purpose is admin login, admin auth, admin venue CRUD, admin review queues, admin dashboard, admin building upload, or admin-only validation is removed
**And** remaining tests are updated so they assert the consumer/public behavior that still exists

**Given** the live database may contain admin-only schema or data
**When** the cleanup audit identifies database objects that should be dropped, renamed, or converted
**Then** the dev agent does not run destructive database changes automatically
**And** it creates `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql` containing the exact manual SQL for Rasmus to review and run
**And** if no database cleanup is required, the story completion notes explicitly say so with the audit basis

**Given** the admin cleanup is complete
**When** the regression gate runs
**Then** typecheck, lint, Vitest, Playwright, and an app build pass
**And** consumer functionality for map discovery, venue list, venue detail, search, planner/date simulation, confidence/refresh, and favourites remains unbroken
**And** scoped scans show no remaining admin runtime/test artifacts except approved historical planning references or this story's own cleanup notes

**Design Gate Criteria:**
- **Visual:** No standalone visual reference. This is a cleanup/infrastructure story with no intended consumer UI change.
- **Behaviour:** Existing consumer flows must continue to behave as they did before the admin cleanup.
- **Visual validation:** Run visual validation only if public consumer UI files are changed; otherwise document that no visual gate applies because no consumer UI was intentionally changed.

## Tasks / Subtasks

- [x] **Task 1: Baseline and source-context check** (AC: all)
  - [x] 1.1 Run `cd nextjs-app && npx tsc --noEmit` before editing. Stop and surface any errors outside story scope.
  - [x] 1.2 Run `cd nextjs-app && npx eslint . --quiet` before editing. Stop and surface any errors outside story scope.
  - [x] 1.3 Read `AGENTS.md`, `project-context.md`, this story, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, and `_bmad-output/planning-artifacts/ux-design-specification.md`.
  - [x] 1.4 Confirm the implementation order with the tracker: Story 3.0 is first in Epic 3 and must land before Story 3.1 routing work proceeds.
  - [x] 1.5 Preserve unrelated dirty work. This checkout may already have BMAD artifact changes for Story 3.1/3.4; do not revert them.

- [x] **Task 2: Re-run the admin/code footprint audit** (AC: #1, #3, #4, #5, #7)
  - [x] 2.1 Run scoped active-code scans before deleting anything:
    - `rg -n "\badmin\b|Admin|/api/admin|app/admin|withAdminAuth|requireAuth|verifyAuthToken|LoginRequest|AuthResponse|AdminUserInfo|JWT_SECRET|jsonwebtoken|bcryptjs" nextjs-app --glob "!docs/design/references/**" --glob "!package-lock.json"`
    - `rg -n "VerificationStatus|verification_status|ReviewNeeded|review_needed|AdminOverride|candidate review|venue candidate|approve|reject|validateCreateVenue|parseGeoJson|UpdatedBy" nextjs-app --glob "!docs/design/references/**" --glob "!package-lock.json"`
    - `rg --files nextjs-app/test | rg -i "admin|auth|login|jwt|bcrypt|venue.*crud|candidate|review-queue|dashboard|building"`
  - [x] 2.2 Classify every match as remove, rename-to-neutral, keep-as-server-infrastructure, or historical/reference-only. Put the classification in Dev Agent completion notes.
  - [x] 2.3 Do not use broad text replacement. Remove or rename each artifact through the smallest code-aware edit that keeps public consumer behavior stable.

- [x] **Task 3: Remove admin auth, DTO, dependency, and env surfaces** (AC: #1, #3, #7)
  - [x] 3.1 Delete `nextjs-app/lib/middleware/admin-auth.ts` if no active non-admin runtime path uses it.
  - [x] 3.2 Delete `nextjs-app/lib/middleware/auth.ts` if it only exists for admin JWT bearer auth. If a non-admin future-monetization signed-token helper is needed later, it must live in a clearly named future-monetization module, not this generic middleware.
  - [x] 3.3 Remove admin auth/request/response types from `nextjs-app/lib/types/api.ts`: `LoginRequest`, `RefreshRequest`, `LogoutRequest`, `ChangePasswordRequest`, `AuthResponse`, `RefreshResponse`, and `AdminUserInfo`, unless a still-live public API uses them.
  - [x] 3.4 Remove unused `bcryptjs`, `jsonwebtoken`, `@types/bcryptjs`, and `@types/jsonwebtoken` from `nextjs-app/package.json` and `nextjs-app/package-lock.json` with the package manager, unless a retained non-admin module truly imports them.
  - [x] 3.5 Remove admin-only `JWT_SECRET` requirements from `nextjs-app/.env.example`, `nextjs-app/docs/environment-variables.md`, and `nextjs-app/docs/vercel-deployment.md`. Keep `CRON_SECRET` and Supabase keys only where still used.
  - [x] 3.6 If future monetization docs still mention signed JWTs, keep that as future-only payment-token language and do not tie it to admin auth or admin users.

- [x] **Task 4: Remove venue admin CRUD/candidate-review remnants** (AC: #1, #2, #4, #7)
  - [x] 4.1 Delete `nextjs-app/lib/validation/venue.ts` if it is only a create/update venue validation helper for the removed admin API.
  - [x] 4.2 Audit `nextjs-app/lib/types/venue.ts`. Remove `VerificationStatus`, `verification_status`, `review_needed`, and the "admin-approved" comment from active app types unless the implementation proves a public consumer flow still needs them.
  - [x] 4.3 Audit `nextjs-app/lib/utils/venue-mapping.ts`. If unused, delete it. If it is kept for a future DB-backed public venues API, remove admin/candidate fields from its output and document it as public DB mapping only.
  - [x] 4.4 Confirm `nextjs-app/app/api/venues/route.ts` and `nextjs-app/app/api/venues/[slug]/route.ts` remain public read endpoints. Do not add admin-only filtering, admin status fields, or write operations.
  - [x] 4.5 Confirm user outdoor-seating feedback from Story 3.2 remains a consumer feedback signal for existing venues, not a new-venue candidate queue or admin approval flow.

- [x] **Task 5: Remove or neutralize admin-operated building/solar remnants** (AC: #1, #3, #4, #6, #7)
  - [x] 5.1 Audit `nextjs-app/lib/buildings/import-geojson.ts`. It appears unused and shaped like the removed admin building-upload surface (`parseGeoJson`, `UpdatedBy`). Delete it if no active backend engine path imports it.
  - [x] 5.2 Audit `nextjs-app/lib/solar/types.ts` and `nextjs-app/lib/solar/shadow-geometry.ts` for `AdminOverride`. If height overrides remain useful for manual database maintenance, rename the source to a neutral term such as `ManualOverride` and update confidence mapping/tests.
  - [x] 5.3 If `AdminOverride` or other admin-coded values may exist in the database, add the needed manual SQL to `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql` instead of assuming production data already matches the code rename.
  - [x] 5.4 Keep `nextjs-app/lib/supabase/server.ts`, `nextjs-app/lib/supabase/health.ts`, and `SUPABASE_SERVICE_ROLE_KEY` only if still required by server-only backend infrastructure. If kept, rename `supabaseAdmin`/`getSupabaseAdmin` to neutral service-role naming where feasible and update imports.
  - [x] 5.5 Do not break `nextjs-app/lib/solar/shadow-calculation-service.ts` or other existing sun/shadow engine paths while removing admin terminology.

- [x] **Task 6: Update docs and planning context** (AC: #2, #3, #6, #7)
  - [x] 6.1 Update `AGENTS.md` if needed so the canonical repo rulebook no longer claims JWT admin auth or admin APIs are retained product scope. Preserve the rule that client components cannot import backend engine modules.
  - [x] 6.2 Update `project-context.md` so stack/status notes no longer say the admin operations platform is part of the active target architecture.
  - [x] 6.3 Update `_bmad-output/planning-artifacts/prd.md`, `_bmad-output/planning-artifacts/architecture.md`, and `_bmad-output/planning-artifacts/ux-design-specification.md` to reflect the 2026-05-30 decision: no admin page, no admin CRUD/configuration, no admin queue/dashboard/upload, direct DB inserts/updates for venues.
  - [x] 6.4 Keep consumer-facing partner, feedback, and review scope intact. Partner analytics in Story 5.3 remains a read-only partner view, not an admin panel.
  - [x] 6.5 Remove or clearly mark obsolete admin-only docs under `nextjs-app/docs/**` if they no longer describe active runtime or operations.

- [x] **Task 7: Database cleanup handoff file** (AC: #2, #4, #6)
  - [x] 7.1 Inspect available schema/docs for admin-only tables, columns, enum values, functions, policies, or seed data, including names such as `admin_users`, `roles`, `venue_candidates`, `VerificationStatus`, `ReviewNeeded`, `AdminOverride`, admin audit logs, and admin-only RPCs.
  - [x] 7.2 If cleanup is needed, create `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql` with a top comment `-- MANUAL-RUN ONLY: review before executing in Supabase`.
  - [x] 7.3 The SQL file must be idempotent where practical and must separate safe renames/conversions from destructive drops with comments. Do not execute the SQL.
  - [x] 7.4 If the repo does not contain enough schema information to produce safe SQL, create the file with diagnostic queries for Rasmus to run first and document that destructive SQL was intentionally not guessed.
  - [x] 7.5 If no database cleanup is required, do not create a fake SQL file. Instead, document the audit basis in Completion Notes.

- [x] **Task 8: Remove admin tests and strengthen consumer regression coverage** (AC: #5, #7)
  - [x] 8.1 Remove every test whose purpose is admin login, JWT admin auth, admin venue CRUD, admin review queues, admin dashboard, admin building upload, or admin-only validation.
  - [x] 8.2 If no admin-specific tests exist, explicitly state that in Completion Notes with the scan command used.
  - [x] 8.3 Update any tests that imported removed admin/auth/validation helpers.
  - [x] 8.4 Keep or add consumer regression coverage only where code edits could affect public behavior, especially public venue list/detail/search/planner/favourites APIs and the sun/shadow engine.
  - [x] 8.5 Do not add tests that preserve removed admin behavior merely to assert 404s for admin routes unless an existing routing test harness makes that lightweight. The key requirement is that admin functionality is gone, not hidden behind a new guard.

- [x] **Task 9: Final verification and review gate** (AC: all)
  - [x] 9.1 Run `cd nextjs-app && npx tsc --noEmit`.
  - [x] 9.2 Run `cd nextjs-app && npx eslint . --quiet`.
  - [x] 9.3 Run `cd nextjs-app && npx vitest run`.
  - [x] 9.4 Run `cd nextjs-app && npx playwright test` because this story removes cross-cutting runtime/dependency surfaces and must prove the consumer app still works.
  - [x] 9.5 Run `cd nextjs-app && npm run build`.
  - [x] 9.6 Run scoped cleanup scans and record remaining approved matches:
    - `rg -n "\badmin\b|Admin|/api/admin|app/admin|withAdminAuth|requireAuth|verifyAuthToken|JWT_SECRET|jsonwebtoken|bcryptjs" nextjs-app --glob "!docs/design/references/**" --glob "!package-lock.json"`
    - `rg -n "VerificationStatus|verification_status|ReviewNeeded|review_needed|AdminOverride|validateCreateVenue|parseGeoJson|UpdatedBy" nextjs-app --glob "!docs/design/references/**" --glob "!package-lock.json"`
    - `rg --files nextjs-app/test | rg -i "admin|auth|login|jwt|bcrypt|venue.*crud|candidate|review-queue|dashboard|building"`
  - [x] 9.7 If public consumer UI files changed, run relevant visual validation from the Screen ID map in `project-context.md`. If no public consumer UI files changed, document that no visual gate applies.
  - [x] 9.8 Before changing sprint status to `review`, run `.\scripts\run-sh.ps1 scripts/story-review.sh 3-0-remove-admin-surface`. Do not directly edit sprint status to `review`.

## Dev Notes

### Codebase Analysis Snapshot (2026-05-30)

- No live admin page or admin route was found under `nextjs-app/app`; active routes are `[locale]/page.tsx`, `[locale]/favoriter/page.tsx`, `not-found.tsx`, `/api/venues`, and `/api/venues/[slug]`.
- Admin/auth leftovers found in active app code:
  - `nextjs-app/lib/middleware/auth.ts` provides generic JWT bearer verification, roles, and claims for protected routes.
  - `nextjs-app/lib/middleware/admin-auth.ts` wraps handlers with `Admin` / `SuperAdmin` role checks.
  - `nextjs-app/lib/types/api.ts` still defines admin auth DTOs: login, refresh, logout, change password, auth response, refresh response, and `AdminUserInfo`.
  - `nextjs-app/package.json` still includes `bcryptjs`, `jsonwebtoken`, `@types/bcryptjs`, and `@types/jsonwebtoken`. The audit found `jsonwebtoken` imported only by `lib/middleware/auth.ts`; no active `bcryptjs` import was found.
  - `nextjs-app/.env.example`, `nextjs-app/docs/environment-variables.md`, and `nextjs-app/docs/vercel-deployment.md` still document `JWT_SECRET` for admin auth.
- Venue/admin CRUD remnants found in active app code:
  - `nextjs-app/lib/validation/venue.ts` defines `validateCreateVenue` and `slugify` for create/update-style venue validation; no active imports were found at draft time.
  - `nextjs-app/lib/types/venue.ts` includes `VerificationStatus`, `verification_status`, `review_needed`, and the comment `admin-approved`.
  - `nextjs-app/lib/utils/venue-mapping.ts` maps PascalCase DB venue rows and emits `VerificationStatus` and `ReviewNeeded`; no active imports were found at draft time.
  - Public venue API routes are currently fixture-backed and read-only; they should remain public consumer endpoints.
- Building/solar/admin terminology found:
  - `nextjs-app/lib/buildings/import-geojson.ts` appears unused and shaped like admin-operated building upload/import support (`parseGeoJson`, `UpdatedBy`).
  - `nextjs-app/lib/solar/types.ts` includes `HeightSource = 'Surveyed' | 'Osm' | 'Heuristic' | 'AdminOverride'`.
  - `nextjs-app/lib/solar/shadow-geometry.ts` includes a confidence multiplier for `AdminOverride`.
  - `nextjs-app/lib/solar/shadow-calculation-service.ts` imports `supabaseAdmin` from `nextjs-app/lib/supabase/server.ts`; this may be legitimate server-only service-role infrastructure and must not be removed blindly.
- Test audit at draft time found no obvious admin-specific test files under `nextjs-app/test` for `admin|auth|login|jwt|bcrypt|venue.*crud|candidate|review-queue|dashboard|building`. Re-run the scan during implementation because package/test state may have changed.
- Repo-level/planning docs still mention admin scope:
  - `AGENTS.md` stack line mentions JWT admin auth.
  - `project-context.md` mentions Auth (Admin) and the admin operations platform.
  - `_bmad-output/planning-artifacts/prd.md` contains the former Phase 2 admin journey and FR39-FR45.
  - `_bmad-output/planning-artifacts/architecture.md` mentions admin auth, `/api/admin/*`, admin routes, and admin as deferred.
  - `_bmad-output/planning-artifacts/ux-design-specification.md` mentions partner onboarding/configuration through the admin panel.

### Implementation Boundaries

- Do not build a replacement admin UI, hidden admin route, admin-only API, or "temporary" admin script exposed through the app.
- Direct database insert/update queries are the venue-management workflow. If the implementation adds documentation for that workflow, keep it operational and manual, not a runtime feature.
- Service-role Supabase usage is not automatically admin functionality. Keep it if the sun/shadow engine, health checks, cron, or future server-only jobs require it, but prefer neutral naming such as service-role infrastructure.
- Client components must continue to respect `AGENTS.md` API-boundary rules and must not import backend engine modules directly.
- Removing admin scope must not remove consumer feedback/reviews. Story 3.2 still owns sun accuracy and outdoor seating feedback for existing venues; Story 3.3 still owns reviews.
- If future monetization references use signed tokens, keep them future-only and separate from admin auth.

### File Impact

Likely files to modify or delete:

- `nextjs-app/lib/middleware/auth.ts`
- `nextjs-app/lib/middleware/admin-auth.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/types/venue.ts`
- `nextjs-app/lib/validation/venue.ts`
- `nextjs-app/lib/utils/venue-mapping.ts`
- `nextjs-app/lib/buildings/import-geojson.ts`
- `nextjs-app/lib/solar/types.ts`
- `nextjs-app/lib/solar/shadow-geometry.ts`
- `nextjs-app/lib/solar/shadow-calculation-service.ts` if service-role naming changes
- `nextjs-app/lib/supabase/server.ts` if service-role naming changes
- `nextjs-app/lib/supabase/health.ts` if service-role naming changes
- `nextjs-app/package.json`
- `nextjs-app/package-lock.json`
- `nextjs-app/.env.example`
- `nextjs-app/docs/environment-variables.md`
- `nextjs-app/docs/vercel-deployment.md`
- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `nextjs-app/test/**` only where tests cover removed admin/auth/CRUD/building-upload behavior
- `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql` if database cleanup is needed

Avoid unless required by a direct dependency break:

- Public consumer routes and UI unrelated to admin cleanup
- `nextjs-app/lib/solar/**` behavior beyond neutral naming/removing admin-coded source names
- `nextjs-app/lib/weather/**`
- Public venue query hooks and query keys unless their DTO types change
- Reference PNGs or `REBASELINE-LOG.md` unless public UI files changed and visual validation proves a legitimate rebaseline is needed with Rasmus approval

### References

- `AGENTS.md` - repo rules: working directory, API boundary, future monetization quarantine, component architecture, testing/story workflow, and Windows script wrappers.
- `project-context.md` - durable project context and Screen ID -> Route Map for any optional visual sanity checks.
- `_bmad-output/planning-artifacts/epics.md` - Epic 3 and Story 3.0 source ACs/design gate.
- `_bmad-output/planning-artifacts/prd.md` - former admin/data expansion requirements that must be retired/superseded by the 2026-05-30 decision.
- `_bmad-output/planning-artifacts/architecture.md` - current architecture references to admin auth, `/api/admin/*`, service-role/backend boundaries, and active consumer API contracts.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - partner/admin mention that must be corrected without changing consumer partner presentation scope.
- `nextjs-app/docs/design/DESIGN.md` - binding design system if any consumer UI is touched incidentally.
- `_bmad-output/implementation-artifacts/3-1-routing-navigation-to-venue.md` - next Epic 3 story that should wait until this cleanup lands.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Baseline before edits: `cd nextjs-app && npx.cmd tsc --noEmit` (pass); `cd nextjs-app && npx.cmd eslint . --quiet` (pass).
- Pre-delete audit scans run exactly from Task 2.1; matches classified before edits.
- Package cleanup: `cd nextjs-app && npm.cmd uninstall bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken`.
- Verification after cleanup: `npx.cmd tsc --noEmit` (pass); `npx.cmd eslint . --quiet` (pass); `npx.cmd vitest run` (40 files / 356 tests pass); `npx.cmd playwright test` (41 pass / 28 skipped after E2E harness timing fix); `npm.cmd run build` (pass).
- Final scoped cleanup scans from Task 9.6 returned no matches.
- Review gate: initial `.\scripts\run-sh.ps1 ...` was blocked by local PowerShell execution policy; rerun through the same wrapper with `powershell.exe -ExecutionPolicy Bypass -File .\scripts\run-sh.ps1 scripts/story-review.sh 3-0-remove-admin-surface` passed and wrote `_bmad-output/implementation-artifacts/validation/3-0-remove-admin-surface-review-20260530-112439.log`.

### Completion Notes List

- Story drafted by Codex on 2026-05-30.
- Acceptance criteria are preserved verbatim from `_bmad-output/planning-artifacts/epics.md`.
- Draft-time codebase audit found no live `/admin` route but did find orphaned admin auth/types/dependencies/docs, venue create/candidate-review remnants, and admin terminology in building/solar helpers.
- Draft-time test scan found no obvious admin-specific test files; implementation must re-run scans and remove any admin tests that exist at that point.
- No app code was changed by this story draft.
- Draft baseline passed after story creation: `cd nextjs-app && npx.cmd tsc --noEmit`; `cd nextjs-app && npx.cmd eslint . --quiet`.
- Story-file-audit: all 7 checks pass (ACs preserved; no-standalone-visual design gate present; tasks dependency-sequenced; no unmapped scope beyond Rasmus's admin-removal decision; file impact reflects the active audit; references include AGENTS/project context/epics/architecture/UX/DESIGN; test gate matches repo commands and cleanup risk).
- Implementation removed unused admin/JWT runtime surfaces: `lib/middleware/auth.ts`, `lib/middleware/admin-auth.ts`, admin auth DTOs from `lib/types/api.ts`, JWT env docs/examples, and `bcryptjs`/`jsonwebtoken` packages.
- Implementation removed unused venue admin/candidate remnants: create/update venue validation, PascalCase DB venue mapper, `VerificationStatus`, `verification_status`, `review_needed`, and the admin-approved type comment. Public `/api/venues` and `/api/venues/[slug]` remain public read endpoints.
- Implementation removed unused admin-operated building import helper and neutralized retained server infrastructure: `AdminOverride` became `ManualOverride`; `supabaseAdmin`/`getSupabaseAdmin` became `supabaseServiceRole`/`getSupabaseServiceRole`.
- Classification summary: remove = orphaned admin auth/types/packages/env docs, venue CRUD validation/mapper, candidate-review fields, GeoJSON building import helper; rename-to-neutral = service-role Supabase client and manual height override source; keep-as-server-infrastructure = `SUPABASE_SERVICE_ROLE_KEY`, `createHealthClient`, public venue read routes, sun/shadow service-role queries; historical/reference-only = retired planning references and future paid-status JWT language.
- Documentation now states venue onboarding/configuration is manual direct database insert/update work; partner analytics remains read-only partner scope and consumer feedback/reviews remain intact.
- Database cleanup handoff created at `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql`; no destructive SQL was executed. Because the repo has no authoritative Supabase schema/migrations, the file provides diagnostics plus a guarded text-value conversion for `buildings."HeightSource"` from `AdminOverride` to `ManualOverride`.
- Admin-specific test scan returned no test files: `rg --files nextjs-app/test | rg -i "admin|auth|login|jwt|bcrypt|venue.*crud|candidate|review-queue|dashboard|building"`. No admin behavior tests were present to remove.
- E2E harness assertions were hardened for existing consumer flows after the full Playwright matrix exposed timing/strict-locator flakes around onboarding and dynamic map startup; no consumer UI files changed.
- No visual validation applies: no public consumer UI implementation files were intentionally changed.
- Final scoped scans returned no active `nextjs-app` runtime/test admin-auth, candidate-review, `AdminOverride`, JWT, bcrypt, or jsonwebtoken artifacts.
- Review follow-up addressed stale active planning references in `_bmad-output/planning-artifacts/epics.md` and the superseded project brief; Rasmus accepted the adjacent Story 3.1/3.4 tracker updates as intentional non-3.0 work.
- Rasmus approved Story 3.0 after review and requested status -> done.

### File List

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/implementation-artifacts/3-0-admin-db-cleanup.sql`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/3-0-remove-admin-surface.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation/3-0-remove-admin-surface-review-20260530-112439.log`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/brief/project-brief.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `nextjs-app/.env.example`
- `nextjs-app/docs/environment-variables.md`
- `nextjs-app/docs/vercel-deployment.md`
- `nextjs-app/lib/buildings/import-geojson.ts` (deleted)
- `nextjs-app/lib/middleware/admin-auth.ts` (deleted)
- `nextjs-app/lib/middleware/auth.ts` (deleted)
- `nextjs-app/lib/solar/shadow-calculation-service.ts`
- `nextjs-app/lib/solar/shadow-geometry.ts`
- `nextjs-app/lib/solar/types.ts`
- `nextjs-app/lib/supabase/server.ts`
- `nextjs-app/lib/types/api.ts`
- `nextjs-app/lib/types/venue.ts`
- `nextjs-app/lib/utils/venue-mapping.ts` (deleted)
- `nextjs-app/lib/validation/venue.ts` (deleted)
- `nextjs-app/package-lock.json`
- `nextjs-app/package.json`
- `nextjs-app/test/e2e/favourites.spec.ts`
- `nextjs-app/test/e2e/map-primary.spec.ts`
- `nextjs-app/test/e2e/onboarding.spec.ts`
- `nextjs-app/test/e2e/responsive-layout.spec.ts`

## Change Log

| Date       | Author | Note |
|------------|--------|------|
| 2026-05-30 | Codex  | Story drafted from Rasmus's admin-removal decision, current Epic 3 sequencing, and codebase audit of active admin/auth/venue CRUD remnants. Status -> ready-for-dev. |
| 2026-05-30 | Codex  | Draft baseline typecheck/lint passed; story-file-audit completed with all seven checks passing. |
| 2026-05-30 | Amelia | Removed active admin/auth/CRUD/candidate/building-upload surfaces, neutralized service-role/manual override terminology, updated docs/planning context, added manual DB cleanup handoff, hardened E2E timing selectors, and passed review gate. Status -> review. |
| 2026-06-01 | Codex  | Addressed review findings in active planning docs and superseded brief; Rasmus approved accepted adjacent tracker work. Status -> done. |
