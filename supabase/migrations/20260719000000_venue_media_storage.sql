-- Story 12.12: venue photo renditions in Supabase Storage.
-- Public read is required for browser rendering; anon write is denied by
-- omission, and authenticated write is denied by omission. Maintainer uploads use service_role, which
-- bypasses RLS for protected create-only tooling.

insert into storage.buckets (
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit
)
values (
  'venue-media',
  'venue-media',
  true,
  array['image/webp'],
  350 * 1024
)
on conflict (id) do update
set
  public = true,
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;

alter table storage.objects enable row level security;

drop policy if exists "venue media public read" on storage.objects;

create policy "venue media public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'venue-media');
