# Story 8.4 — Feedback & Review Persistence Enablement: Integration Round-Trip Run Note

**Status: NOT YET RUN — maintainer-run, OPTIONAL.** This live round-trip is **not
required for Story 8.4 `done`** (the offline default-path CI gates satisfy
`done`). It is the access-model proof to run as part of the Story 8.5 production
cutover, or earlier against a throwaway/staging Supabase project. Record the
outcome below when run. **Do not commit secrets or connection strings** —
`.env.local` stays gitignored.

## Preconditions

- The RLS contracts have been applied to the target Supabase project:
  - `_bmad-output/implementation-artifacts/3-3-reviews-contract.sql` (table + the
    Story 8.4 `reviews_public_read` / `reviews_service_write` policies)
  - `_bmad-output/implementation-artifacts/3-2-feedback-contract.sql` (table + the
    Story 8.4 `feedback_service_write` policy; no anon/public policy)
  - Run each file's end-of-file smoke checks and confirm: `reviews` has exactly
    `reviews_public_read` (select, {anon,authenticated}) + `reviews_service_write`
    (insert, {service_role}); `feedback` has only `feedback_service_write`
    (insert, {service_role}); RLS enabled on both; no anon/authenticated
    INSERT/UPDATE/DELETE grant on either table.
- Local env (gitignored `.env.local`, never committed):
  - `SUNNYSEAT_REVIEW_PERSISTENCE=supabase`
  - `SUNNYSEAT_FEEDBACK_PERSISTENCE=supabase`
  - `NEXT_PUBLIC_SUPABASE_URL=<project url>`
  - `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
  - (for step c only) a separate anon key/client outside the app
    (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Procedure

a. **Write path (service role, via the routes).** With the app running against
   the live project, `POST /api/venues/test-venue-sunny/feedback` with a minimal
   valid body, and `POST /api/reviews` with `{ venueId: "1", text: "...", rating }`.
   Expect `201` from both.
b. **Read-back (proves `persistVenueReview` + `getVenueReviewsFromPersistence`).**
   `GET /api/reviews?venueId=1` and confirm the just-posted review is returned
   newest-first and that the in-memory fixture seeds (`review_fixture_1_*`) are
   **absent** (clean swap — the live read returns only DB rows).
c. **RLS proof (anon client, outside the app).** Using the anon key:
   - `select` on `public.reviews` → **succeeds** (public read policy).
   - `select` on `public.feedback` → **returns nothing / denied** (no read policy;
     write-only sink).
   - `insert` into `public.reviews` and `public.feedback` as anon → **both
     denied** (only `service_role` may insert).

## Outcome

_(fill in when run — date, project ref/staging, pass/fail per step; no secrets)_

- a. write path: ⬜
- b. review read-back excludes fixtures: ⬜
- c. reviews anon-SELECTable: ⬜ | feedback NOT anon-readable: ⬜ | neither anon-writable: ⬜

## Notes

- The runtime always reads/writes via the service-role client (which bypasses
  RLS), so the app itself works regardless of these policies. This check proves
  the **access model** an external anon client would see — the public-read
  contract for `reviews` and the write-only-sink guarantee for `feedback`.
- Story 8.5 owns the Supabase security advisor run + `lib/supabase/types.ts`
  regen + production env; do not perform those here.
