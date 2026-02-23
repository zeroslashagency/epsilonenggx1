-- Migration: Create scheduler-imports bucket
insert into storage.buckets (id, name, public)
values ('scheduler-imports', 'scheduler-imports', false)
on conflict (id) do nothing;

-- Set up RLS for the bucket objects
create policy "Authenticated users can upload to scheduler-imports"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'scheduler-imports' );

create policy "Authenticated users can read their own uploads in scheduler-imports"
on storage.objects for select
to authenticated
using ( bucket_id = 'scheduler-imports' and auth.uid() = owner);
