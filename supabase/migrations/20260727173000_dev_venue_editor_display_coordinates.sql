-- Story 12.5: dev-only venue editor support.
-- Public routes may display `display_lat/display_lng`; geometry/weather inputs
-- continue to use `lat/lng` and `seating_area`.

alter table public.venues
  add column if not exists display_lat double precision,
  add column if not exists display_lng double precision;

alter table public.venues
  drop constraint if exists venues_display_coordinate_pair_check,
  drop constraint if exists venues_display_lat_bounds_check,
  drop constraint if exists venues_display_lng_bounds_check;

alter table public.venues
  add constraint venues_display_coordinate_pair_check
    check (
      (display_lat is null and display_lng is null)
      or (display_lat is not null and display_lng is not null)
    ) not valid,
  add constraint venues_display_lat_bounds_check
    check (
      display_lat is null
      or display_lat between 57.6 and 57.8
    ) not valid,
  add constraint venues_display_lng_bounds_check
    check (
      display_lng is null
      or display_lng between 11.8 and 12.1
    ) not valid;

alter table public.venues
  validate constraint venues_display_coordinate_pair_check,
  validate constraint venues_display_lat_bounds_check,
  validate constraint venues_display_lng_bounds_check;

comment on column public.venues.display_lat is
  'Story 12.5 display-only public pin latitude. Null falls back to venues.lat; sun/weather inputs do not use this column.';
comment on column public.venues.display_lng is
  'Story 12.5 display-only public pin longitude. Null falls back to venues.lng; sun/weather inputs do not use this column.';

create or replace function public.apply_dev_venue_editor_patch(
  p_venue_id text,
  p_update_display_coordinates boolean default false,
  p_display_lat double precision default null,
  p_display_lng double precision default null,
  p_update_hidden boolean default false,
  p_hidden boolean default null,
  p_update_seating_area boolean default false,
  p_seating_area jsonb default null,
  p_update_tags boolean default false,
  p_tags text[] default null,
  p_update_description boolean default false,
  p_description text default null,
  p_update_thumbnail boolean default false,
  p_thumbnail jsonb default null,
  p_dirty_reason text default 'dev-venue-editor-seating-area'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_update_display_coordinates and
     ((p_display_lat is null) <> (p_display_lng is null)) then
    raise exception 'display coordinates must be supplied as a pair'
      using errcode = '22023';
  end if;

  if p_update_display_coordinates
     and p_display_lat is not null
     and (
       p_display_lat not between 57.6 and 57.8
       or p_display_lng not between 11.8 and 12.1
     ) then
    raise exception 'display coordinates must stay inside Gothenburg bounds'
      using errcode = '22023';
  end if;

  if p_update_seating_area and (
    p_seating_area is null
    or jsonb_typeof(p_seating_area) <> 'object'
    or p_seating_area ->> 'type' <> 'Polygon'
  ) then
    raise exception 'seating_area must be a GeoJSON Polygon'
      using errcode = '22023';
  end if;

  update public.venues
  set
    display_lat = case when p_update_display_coordinates then p_display_lat else display_lat end,
    display_lng = case when p_update_display_coordinates then p_display_lng else display_lng end,
    hidden = case when p_update_hidden then coalesce(p_hidden, false) else hidden end,
    seating_area = case when p_update_seating_area then p_seating_area else seating_area end,
    tags = case when p_update_tags then coalesce(p_tags, array[]::text[]) else tags end,
    description = case when p_update_description then p_description else description end,
    thumbnail = case when p_update_thumbnail then p_thumbnail else thumbnail end,
    updated_at = clock_timestamp()
  where id = p_venue_id;

  if not found then
    return false;
  end if;

  if p_update_seating_area then
    perform public.mark_venue_geometry_dirty(p_venue_id, p_dirty_reason);
  end if;

  return true;
end;
$$;

revoke all on function public.apply_dev_venue_editor_patch(
  text,
  boolean,
  double precision,
  double precision,
  boolean,
  boolean,
  boolean,
  jsonb,
  boolean,
  text[],
  boolean,
  text,
  boolean,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.apply_dev_venue_editor_patch(
  text,
  boolean,
  double precision,
  double precision,
  boolean,
  boolean,
  boolean,
  jsonb,
  boolean,
  text[],
  boolean,
  text,
  boolean,
  jsonb,
  text
) to service_role;

comment on function public.apply_dev_venue_editor_patch(
  text,
  boolean,
  double precision,
  double precision,
  boolean,
  boolean,
  boolean,
  jsonb,
  boolean,
  text[],
  boolean,
  text,
  boolean,
  jsonb,
  text
) is
  'Story 12.5 service-role-only dev editor mutation. Applies venue editor fields atomically and marks geometry dirty when seating_area changes.';
