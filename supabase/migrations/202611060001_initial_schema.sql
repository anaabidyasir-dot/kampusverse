-- KAMPUSVERSE initial schema
-- Run once in Supabase SQL Editor. Never expose the service_role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Campus Member' check (char_length(display_name) between 1 and 80),
  role text not null default 'student' check (role in ('student','lecturer','admin','contributor')),
  major text not null default 'Informatika' check (char_length(major) <= 100),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin','lecturer')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Campus Member'), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow a trusted database owner to bootstrap the first admin from SQL Editor.
  -- API sessions use the authenticator role and must pass the application admin check.
  if new.role is distinct from old.role
     and not public.is_admin()
     and session_user not in ('postgres','supabase_admin') then
    raise exception 'Only an administrator can change account roles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update on public.profiles
for each row execute procedure public.prevent_role_escalation();

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('Knowledge','Discussion','Campus Update','Project Showcase','Research')),
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_likes_once_per_user unique (post_id, user_id)
);

create table if not exists public.post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_bookmarks_once_per_user unique (post_id, user_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 140),
  organization text not null check (char_length(trim(organization)) between 2 and 100),
  category text not null check (char_length(category) <= 50),
  level text not null check (level in ('Nasional','Internasional')),
  deadline date not null,
  description text not null check (char_length(trim(description)) between 10 and 1000),
  apply_url text not null default '' check (apply_url = '' or apply_url ~ '^https://'),
  status text not null default 'pending' check (status in ('pending','verified','rejected','expired')),
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  category text not null,
  level text not null default 'Pemula',
  duration text not null default '1 jam',
  lessons_count integer not null default 1 check (lessons_count > 0),
  description text not null default '',
  instructor text not null default 'Tim KAMPUSVERSE',
  color text not null default 'violet' check (color in ('violet','mint','orange','blue')),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 1,
  unique (course_id, position)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  body text not null default '',
  position integer not null default 1,
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  unique (module_id, position)
);

create table if not exists public.student_progress (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  constraint student_progress_one_per_course unique (course_id, student_id)
);

create table if not exists public.campus_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient text not null check (char_length(recipient) between 2 and 80),
  subject text not null check (char_length(subject) between 2 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  priority text not null default 'normal' check (priority in ('normal','high')),
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 10000),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists comments_post_id_created_idx on public.comments (post_id, created_at);
create index if not exists opportunities_status_deadline_idx on public.opportunities (status, deadline);
create index if not exists notes_owner_updated_idx on public.notes (owner_id, updated_at desc);
create index if not exists messages_sender_created_idx on public.campus_messages (sender_id, created_at desc);
create index if not exists progress_student_idx on public.student_progress (student_id);

-- RLS is enabled on every table exposed through the Supabase API.
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.opportunities enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.student_progress enable row level security;
alter table public.campus_messages enable row level security;
alter table public.notes enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: signed-in campus members can see basic directory identity; only self/admin can update.
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Community posts.
drop policy if exists "posts_read_authenticated" on public.posts;
create policy "posts_read_authenticated" on public.posts for select to authenticated using (true);
drop policy if exists "posts_insert_self" on public.posts;
create policy "posts_insert_self" on public.posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "posts_update_owner_or_admin" on public.posts;
create policy "posts_update_owner_or_admin" on public.posts for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "posts_delete_owner_or_admin" on public.posts;
create policy "posts_delete_owner_or_admin" on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- Comments and likes.
drop policy if exists "comments_read_authenticated" on public.comments;
create policy "comments_read_authenticated" on public.comments for select to authenticated using (true);
drop policy if exists "comments_insert_self" on public.comments;
create policy "comments_insert_self" on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "comments_change_owner_or_admin" on public.comments;
create policy "comments_change_owner_or_admin" on public.comments for all to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "likes_read_authenticated" on public.post_likes;
create policy "likes_read_authenticated" on public.post_likes for select to authenticated using (true);
drop policy if exists "likes_insert_self" on public.post_likes;
create policy "likes_insert_self" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes_delete_self" on public.post_likes;
create policy "likes_delete_self" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Bookmarks are private to the owner.
drop policy if exists "bookmarks_owner_all" on public.post_bookmarks;
create policy "bookmarks_owner_all" on public.post_bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Opportunity submissions are pending by default; only admins can publish or reject.
drop policy if exists "opportunities_read_verified_or_admin" on public.opportunities;
create policy "opportunities_read_verified_or_admin" on public.opportunities for select to authenticated using (status = 'verified' or public.is_admin());
drop policy if exists "opportunities_submit_self_pending" on public.opportunities;
create policy "opportunities_submit_self_pending" on public.opportunities for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending');
drop policy if exists "opportunities_admin_review" on public.opportunities;
create policy "opportunities_admin_review" on public.opportunities for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Course catalog: published content is readable; staff can author and manage courses.
drop policy if exists "courses_read_published_or_staff" on public.courses;
create policy "courses_read_published_or_staff" on public.courses for select to authenticated using (is_published = true or public.is_staff());
drop policy if exists "courses_staff_manage" on public.courses;
create policy "courses_staff_manage" on public.courses for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "modules_read_published_or_staff" on public.course_modules;
create policy "modules_read_published_or_staff" on public.course_modules for select to authenticated using (exists (select 1 from public.courses c where c.id = course_id and (c.is_published = true or public.is_staff())));
drop policy if exists "modules_staff_manage" on public.course_modules;
create policy "modules_staff_manage" on public.course_modules for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "lessons_read_published_or_staff" on public.lessons;
create policy "lessons_read_published_or_staff" on public.lessons for select to authenticated using (exists (select 1 from public.course_modules m join public.courses c on c.id = m.course_id where m.id = module_id and (c.is_published = true or public.is_staff())));
drop policy if exists "lessons_staff_manage" on public.lessons;
create policy "lessons_staff_manage" on public.lessons for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- A student can only read or change their own course progress.
drop policy if exists "progress_owner_read" on public.student_progress;
create policy "progress_owner_read" on public.student_progress for select to authenticated using (student_id = auth.uid() or public.is_admin());
drop policy if exists "progress_owner_insert" on public.student_progress;
create policy "progress_owner_insert" on public.student_progress for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "progress_owner_update" on public.student_progress;
create policy "progress_owner_update" on public.student_progress for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Messages and notes are private to the account that created them.
drop policy if exists "messages_owner_all" on public.campus_messages;
create policy "messages_owner_all" on public.campus_messages for all to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());
drop policy if exists "notes_owner_all" on public.notes;
create policy "notes_owner_all" on public.notes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Reports can be submitted by members; only admins can inspect or moderate.
drop policy if exists "reports_submit_self" on public.reports;
create policy "reports_submit_self" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all" on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs for select to authenticated using (public.is_admin());
drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert" on public.audit_logs for insert to authenticated with check (public.is_admin());

-- Private buckets for later media features. The UI does not upload media in this MVP yet.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-photos', 'profile-photos', false, 3145728, array['image/jpeg','image/png','image/webp']),
  ('post-media', 'post-media', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "profile_photo_owner_manage" on storage.objects;
create policy "profile_photo_owner_manage" on storage.objects for all to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "post_media_member_manage" on storage.objects;
create policy "post_media_member_manage" on storage.objects for all to authenticated
using (bucket_id = 'post-media' and owner_id = auth.uid()::text)
with check (bucket_id = 'post-media' and owner_id = auth.uid()::text);

-- Seeded learning content. The catalogue is marked as platform content, not campus-verified content.
insert into public.courses (id,title,category,level,duration,lessons_count,description,instructor,color,is_published)
values
('b2c9e8d4-1af1-4c50-9c21-111111111111','Fondasi Pemrograman Web','Informatika','Pemula','4 jam',8,'Belajar HTML, CSS, dan JavaScript dari konsep dasar sampai membuat halaman interaktif.','Tim KAMPUSVERSE','violet',true),
('b2c9e8d4-1af1-4c50-9c21-222222222222','Logika & Berpikir Komputasional','Computer Science','Pemula','3 jam',6,'Melatih cara memecah masalah, mengenali pola, dan menyusun algoritma sederhana.','Nadia Putri, M.Kom.','mint',true),
('b2c9e8d4-1af1-4c50-9c21-333333333333','Matematika Diskrit untuk Informatika','Mathematics','Menengah','5 jam',10,'Mengenal himpunan, relasi, fungsi, logika proposisional, dan graf.','Bima Pratama, M.Si.','orange',true),
('b2c9e8d4-1af1-4c50-9c21-444444444444','Academic Writing Essentials','Academic Writing','Pemula','2 jam',5,'Menyusun paragraf akademik, sitasi dasar, dan struktur tulisan ilmiah.','Academic Skills Center','blue',true)
on conflict (id) do nothing;

-- Example role promotion should be done manually by a trusted project owner in SQL editor,
-- after verifying the target account. Never expose a service_role key in frontend code.
-- update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';

insert into public.course_modules (id,course_id,title,position)
values
('c2c9e8d4-1af1-4c50-9c21-111111111111','b2c9e8d4-1af1-4c50-9c21-111111111111','Web Foundations',1),
('c2c9e8d4-1af1-4c50-9c21-222222222222','b2c9e8d4-1af1-4c50-9c21-222222222222','Computational Thinking',1),
('c2c9e8d4-1af1-4c50-9c21-333333333333','b2c9e8d4-1af1-4c50-9c21-333333333333','Discrete Structures',1),
('c2c9e8d4-1af1-4c50-9c21-444444444444','b2c9e8d4-1af1-4c50-9c21-444444444444','Academic Writing Basics',1)
on conflict (id) do nothing;

insert into public.lessons (id,module_id,title,body,position,estimated_minutes)
values
('d2c9e8d4-1af1-4c50-9c21-111111111111','c2c9e8d4-1af1-4c50-9c21-111111111111','How the Web Works','Kenali browser, server, request, response, dan bagaimana sebuah halaman web ditampilkan.',1,15),
('d2c9e8d4-1af1-4c50-9c21-111111111112','c2c9e8d4-1af1-4c50-9c21-111111111111','HTML: Structure Your Content','Pelajari elemen, heading, paragraf, tautan, gambar, dan struktur dokumen HTML yang semantik.',2,25),
('d2c9e8d4-1af1-4c50-9c21-111111111113','c2c9e8d4-1af1-4c50-9c21-111111111111','CSS: Style and Layout','Gunakan selector, box model, flexbox, grid, dan media query untuk membuat halaman responsif.',3,30),
('d2c9e8d4-1af1-4c50-9c21-222222222221','c2c9e8d4-1af1-4c50-9c21-222222222222','Decompose a Problem','Pecah masalah kompleks menjadi bagian kecil yang dapat dipahami dan diselesaikan.',1,15),
('d2c9e8d4-1af1-4c50-9c21-222222222222','c2c9e8d4-1af1-4c50-9c21-222222222222','Recognize Patterns','Temukan kesamaan dan pola agar solusi dapat digunakan ulang.',2,15),
('d2c9e8d4-1af1-4c50-9c21-222222222223','c2c9e8d4-1af1-4c50-9c21-222222222222','Design a Simple Algorithm','Susun langkah logis dan terurut sebelum menulis program.',3,20),
('d2c9e8d4-1af1-4c50-9c21-333333333331','c2c9e8d4-1af1-4c50-9c21-333333333333','Sets and Operations','Pahami himpunan, notasi, anggota, subset, union, dan intersection.',1,20),
('d2c9e8d4-1af1-4c50-9c21-333333333332','c2c9e8d4-1af1-4c50-9c21-333333333333','Logic and Propositions','Pelajari pernyataan, operator logika, tabel kebenaran, dan implikasi.',2,25),
('d2c9e8d4-1af1-4c50-9c21-333333333333','c2c9e8d4-1af1-4c50-9c21-333333333333','Relations and Functions','Kenali relasi, domain, kodomain, range, dan sifat fungsi.',3,25),
('d2c9e8d4-1af1-4c50-9c21-444444444441','c2c9e8d4-1af1-4c50-9c21-444444444444','Build a Clear Paragraph','Susun kalimat topik, penjelas, bukti, dan transisi secara runtut.',1,15),
('d2c9e8d4-1af1-4c50-9c21-444444444442','c2c9e8d4-1af1-4c50-9c21-444444444444','Paraphrase and Cite','Latih parafrasa yang akurat dan pencantuman sumber yang bertanggung jawab.',2,20),
('d2c9e8d4-1af1-4c50-9c21-444444444443','c2c9e8d4-1af1-4c50-9c21-444444444444','Structure a Short Essay','Kenali pendahuluan, isi, kesimpulan, dan alur argumen sederhana.',3,20)
on conflict (id) do nothing;

-- Record privileged opportunity moderation in an append-only audit trail.
create or replace function public.audit_opportunity_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'opportunity_status_changed',
      'opportunity',
      new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status, 'title', new.title)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_opportunity_review_trigger on public.opportunities;
create trigger audit_opportunity_review_trigger
after update of status on public.opportunities
for each row execute procedure public.audit_opportunity_review();
