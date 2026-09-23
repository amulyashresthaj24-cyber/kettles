-- Private bucket for project logos. Objects live at {user_id}/{project_id}.webp|png.
-- The project row stores that path in data.logoPath; bytes never go in JSONB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-logos',
  'project-logos',
  false,
  524288,
  array['image/webp', 'image/png']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own project logos" on storage.objects;
create policy "Users read own project logos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users upload own project logos" on storage.objects;
create policy "Users upload own project logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own project logos" on storage.objects;
create policy "Users update own project logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'project-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own project logos" on storage.objects;
create policy "Users delete own project logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
