-- KAMPUSVERSE learning-material authoring.
-- Lecturers/admins can write lesson text and optionally attach one PDF.
-- Run after migrations 001 and 002.

begin;

alter table public.lessons
  add column if not exists pdf_path text,
  add column if not exists pdf_name text;

create index if not exists lessons_pdf_path_idx
  on public.lessons(pdf_path)
  where pdf_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('learning-materials', 'learning-materials', false, 20971520, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf'];

drop policy if exists learning_materials_read_authorized_lessons on storage.objects;
create policy learning_materials_read_authorized_lessons
on storage.objects for select to authenticated
using (
  bucket_id = 'learning-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.pdf_path = storage.objects.name
      and (c.is_published = true or public.is_staff())
  )
);

drop policy if exists learning_materials_staff_upload on storage.objects;
create policy learning_materials_staff_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'learning-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_staff()
);

drop policy if exists learning_materials_staff_delete on storage.objects;
create policy learning_materials_staff_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'learning-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_staff()
);

commit;
