-- Story 12.1 review hardening: canonical public schedules require a verified
-- evidence state. Unknown/manual/failed remediation states remain representable
-- only with whole-field unknown hours.

alter table public.venues
  drop constraint if exists venues_hours_state_coherence_check;

alter table public.venues
  add constraint venues_hours_state_coherence_check
    check (
      (
        opening_hours is null
        or (
          hours_source_type is not null
          and hours_source_reference is not null
          and hours_review_status = 'verified'
          and hours_reviewed_at is not null
          and hours_next_review_at is not null
        )
      )
      and (hours_review_status <> 'unknown' or opening_hours is null)
      and (
        hours_review_status <> 'manual_review'
        or (opening_hours is null and hours_review_reason is not null)
      )
      and (
        hours_review_status <> 'failed'
        or (opening_hours is null and hours_last_error_class is not null)
      )
      and (
        hours_review_status <> 'verified'
        or (
          opening_hours is not null
          and hours_review_reason is null
          and hours_last_error_class is null
        )
      )
    ) not valid;
