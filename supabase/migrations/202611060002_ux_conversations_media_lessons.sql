-- KAMPUSVERSE UX and interaction upgrade (additive migration).
begin;

-- Feed media is deliberately public because users choose to publish it to the campus feed.
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;
alter table public.posts drop constraint if exists posts_content_check;
alter table public.posts drop constraint if exists posts_content_or_media_check;
alter table public.posts add constraint posts_content_or_media_check check (char_length(trim(content)) between 0 and 2000 and (char_length(trim(content)) > 0 or media_url is not null));
alter table public.posts add constraint posts_media_type_check check (media_type is null or media_type in ('image','video'));

-- Conversation threads: students initiate, the addressed lecturer/admin replies in the same thread.
create table if not exists public.campus_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_by_name text not null,
  created_by_role text not null check (created_by_role in ('student','lecturer','admin','contributor')),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null,
  recipient_role text not null check (recipient_role in ('lecturer','admin')),
  subject text not null check (char_length(trim(subject)) between 2 and 120),
  priority text not null default 'normal' check (priority in ('normal','high')),
  status text not null default 'open' check (status in ('open','answered','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_conversation_not_self check (created_by <> recipient_user_id)
);
create table if not exists public.campus_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.campus_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists campus_conversations_created_idx on public.campus_conversations(created_by, updated_at desc);
create index if not exists campus_conversations_recipient_idx on public.campus_conversations(recipient_user_id, updated_at desc);
create index if not exists campus_conversation_messages_thread_idx on public.campus_conversation_messages(conversation_id, created_at);
alter table public.campus_conversations enable row level security;
alter table public.campus_conversation_messages enable row level security;
drop policy if exists campus_conversations_participant_read on public.campus_conversations;
create policy campus_conversations_participant_read on public.campus_conversations for select to authenticated using (created_by = auth.uid() or recipient_user_id = auth.uid() or public.is_admin());
drop policy if exists campus_conversations_student_create on public.campus_conversations;
create policy campus_conversations_student_create on public.campus_conversations for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.profiles p where p.id = recipient_user_id and p.role = recipient_role and p.role in ('lecturer','admin')));
drop policy if exists campus_conversations_participant_update on public.campus_conversations;
create policy campus_conversations_participant_update on public.campus_conversations for update to authenticated using (created_by = auth.uid() or recipient_user_id = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or recipient_user_id = auth.uid() or public.is_admin());
drop policy if exists campus_conversation_messages_participant_read on public.campus_conversation_messages;
create policy campus_conversation_messages_participant_read on public.campus_conversation_messages for select to authenticated using (exists (select 1 from public.campus_conversations c where c.id = conversation_id and (c.created_by = auth.uid() or c.recipient_user_id = auth.uid() or public.is_admin())));
drop policy if exists campus_conversation_messages_participant_send on public.campus_conversation_messages;
create policy campus_conversation_messages_participant_send on public.campus_conversation_messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.campus_conversations c where c.id = conversation_id and (c.created_by = auth.uid() or c.recipient_user_id = auth.uid() or public.is_admin())));

create or replace function public.guard_campus_conversation_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_status text;
begin
  if new.sender_id <> auth.uid() then
    raise exception 'A message must be sent by the signed-in account';
  end if;
  select status into thread_status from public.campus_conversations where id = new.conversation_id;
  if thread_status is null then
    raise exception 'Conversation does not exist';
  end if;
  if thread_status = 'closed' then
    raise exception 'This conversation is closed';
  end if;
  return new;
end;
$$;

drop trigger if exists campus_conversation_message_insert_guard on public.campus_conversation_messages;
create trigger campus_conversation_message_insert_guard
before insert on public.campus_conversation_messages
for each row execute function public.guard_campus_conversation_message_insert();



-- Participant names and roles are snapshots derived from trusted profile rows, not client input.
create or replace function public.prepare_campus_conversation_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_profile public.profiles%rowtype;
  recipient_profile public.profiles%rowtype;
begin
  select * into sender_profile from public.profiles where id = new.created_by;
  select * into recipient_profile from public.profiles where id = new.recipient_user_id;

  if sender_profile.id is null or sender_profile.role not in ('student','contributor') then
    raise exception 'Only students or verified contributors can initiate campus conversations';
  end if;
  if recipient_profile.id is null or recipient_profile.role not in ('lecturer','admin') then
    raise exception 'Conversation recipient must be a lecturer or campus administrator';
  end if;
  if new.created_by = new.recipient_user_id then
    raise exception 'A conversation cannot be addressed to its sender';
  end if;

  new.created_by_name := sender_profile.display_name;
  new.created_by_role := sender_profile.role;
  new.recipient_name := recipient_profile.display_name;
  new.recipient_role := recipient_profile.role;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists campus_conversation_participant_snapshots on public.campus_conversations;
create trigger campus_conversation_participant_snapshots
before insert on public.campus_conversations
for each row execute function public.prepare_campus_conversation_participants();

-- Thread identity, subject and priority cannot be rewritten by a participant after creation.
create or replace function public.guard_campus_conversation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.created_by is distinct from old.created_by
     or new.created_by_name is distinct from old.created_by_name
     or new.created_by_role is distinct from old.created_by_role
     or new.recipient_user_id is distinct from old.recipient_user_id
     or new.recipient_name is distinct from old.recipient_name
     or new.recipient_role is distinct from old.recipient_role
     or new.subject is distinct from old.subject
     or new.priority is distinct from old.priority
     or new.created_at is distinct from old.created_at then
    raise exception 'Conversation identity and metadata cannot be changed';
  end if;
  if old.status = 'closed' and new.status <> 'closed' then
    raise exception 'Closed conversations cannot be reopened';
  end if;
  if auth.uid() = old.created_by then
    if new.status not in ('open','closed') then
      raise exception 'The conversation sender may only reopen or close their own request';
    end if;
  elsif auth.uid() = old.recipient_user_id or public.is_admin() then
    if new.status not in ('answered','closed') then
      raise exception 'Campus staff may answer or close a conversation';
    end if;
  else
    raise exception 'Only conversation participants may update this thread';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists campus_conversation_update_guard on public.campus_conversations;
create trigger campus_conversation_update_guard
before update on public.campus_conversations
for each row execute function public.guard_campus_conversation_update();

-- Explicit grants are still constrained by the row-level security policies above.
grant select, insert, update on public.campus_conversations to authenticated;
grant select, insert on public.campus_conversation_messages to authenticated;

-- Shared feed media: read by authenticated campus members, upload/delete only in the user's own folder.
update storage.buckets set public = false, file_size_limit = 20971520, allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm'] where id = 'post-media';
drop policy if exists post_media_member_manage on storage.objects;
drop policy if exists post_media_authenticated_read on storage.objects;
drop policy if exists post_media_owner_insert on storage.objects;
drop policy if exists post_media_owner_delete on storage.objects;
create policy post_media_authenticated_read on storage.objects for select to authenticated using (bucket_id = 'post-media');
create policy post_media_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy post_media_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.student_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  constraint student_lesson_progress_unique unique (student_id, lesson_id)
);
create index if not exists student_lesson_progress_owner_idx on public.student_lesson_progress(student_id, lesson_id);
alter table public.student_lesson_progress enable row level security;
drop policy if exists student_lesson_progress_owner_read on public.student_lesson_progress;
create policy student_lesson_progress_owner_read on public.student_lesson_progress for select to authenticated using (student_id = auth.uid() or public.is_admin());
drop policy if exists student_lesson_progress_owner_insert on public.student_lesson_progress;
create policy student_lesson_progress_owner_insert on public.student_lesson_progress for insert to authenticated with check (student_id = auth.uid());
drop policy if exists student_lesson_progress_owner_update on public.student_lesson_progress;
create policy student_lesson_progress_owner_update on public.student_lesson_progress for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
grant select, insert, update on public.student_lesson_progress to authenticated;

-- Seed modules for the published course catalogue.
insert into public.course_modules (id, course_id, title, position) values
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'b2c9e8d4-1af1-4c50-9c21-111111111111', 'Fondasi Web: Dasar hingga Mini Project', 1),
('c2c9e8d4-1af1-4c50-9c21-222222222222', 'b2c9e8d4-1af1-4c50-9c21-222222222222', 'Berpikir Komputasional', 1),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'b2c9e8d4-1af1-4c50-9c21-333333333333', 'Konsep Matematika Diskrit', 1),
('c2c9e8d4-1af1-4c50-9c21-444444444444', 'b2c9e8d4-1af1-4c50-9c21-444444444444', 'Academic Writing', 1)
on conflict (id) do update set title = excluded.title;

-- Seed readable lesson content. Upsert by module and position so reruns are safe.
insert into public.lessons (module_id, title, body, position, estimated_minutes) values
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'Mengenal cara kerja website', 'Website berjalan melalui kerja sama browser, server, dan jaringan. Browser meminta halaman melalui HTTP/HTTPS, server mengirim respons, lalu browser menampilkan HTML, CSS, dan JavaScript. HTML membentuk struktur, CSS mengatur tampilan, dan JavaScript menambahkan interaksi. Tujuan belajar: kenali perbedaan frontend dan backend serta alur sederhana ketika halaman dibuka.', 1, 12),
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'Struktur dokumen HTML', 'HTML memberi struktur semantik pada halaman. Dokumen umumnya memiliki deklarasi DOCTYPE, elemen html, head, dan body. Gunakan heading secara berurutan, paragraf untuk teks, dan elemen yang sesuai dengan makna kontennya. Struktur yang jelas membantu aksesibilitas dan mesin pencari.', 2, 18),
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'Elemen semantik HTML', 'Elemen seperti header, nav, main, section, article, dan footer menjelaskan peran bagian halaman. Hindari memakai div untuk semua hal apabila tersedia elemen yang lebih bermakna. Latihan: rancang kerangka halaman profil mahasiswa dengan header, navigasi, konten utama, dan footer.', 3, 15),
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'Dasar CSS dan selector', 'CSS mengatur tampilan melalui aturan selector, property, dan value. Contoh: .card { padding: 16px; border-radius: 12px; }. Pelajari selector elemen, class, id, pseudo-class, inheritance, cascade, dan specificity. Mulai dari aturan kecil lalu amati dampaknya di browser.', 4, 20),
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'Box model dan layout', 'Setiap elemen memiliki content, padding, border, dan margin. Gunakan box-sizing: border-box agar perhitungan ukuran lebih mudah. Flexbox cocok untuk menyusun item dalam satu arah. CSS Grid cocok untuk susunan baris dan kolom. Pilih berdasarkan struktur konten.', 5, 22),
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'Responsive web design', 'Desain responsif membuat konten menyesuaikan ruang yang tersedia. Gunakan unit fleksibel, max-width, gambar dengan max-width: 100%, serta media query bila layout perlu berubah. Mulai dari konten yang penting. Pastikan tombol mudah disentuh dan tidak ada elemen yang memaksa halaman melebar horizontal.', 6, 20),
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'JavaScript dan interaksi', 'JavaScript menambahkan perilaku pada halaman. Variabel menyimpan data, function mengelompokkan proses, dan event listener merespons aksi pengguna. Contoh penggunaan: validasi form, membuka menu, memperbarui teks, atau mengambil data dari API. Pisahkan logika dari tampilan agar lebih mudah dirawat.', 7, 25),
('c2c9e8d4-1af1-4c50-9c21-111111111111', 'Mini project: halaman profil', 'Gabungkan HTML, CSS, dan JavaScript untuk membuat halaman profil mahasiswa. Sertakan judul, deskripsi, daftar keahlian, dan tombol yang memberikan feedback saat ditekan. Periksa hasil pada lebar ponsel dan desktop. Pastikan navigasi jelas, kontras cukup, dan kontrol dapat digunakan dengan keyboard.', 8, 30),
('c2c9e8d4-1af1-4c50-9c21-222222222222', 'Berpikir komputasional', 'Berpikir komputasional adalah pendekatan untuk memecahkan masalah dengan cara terstruktur. Empat gagasan pentingnya adalah dekomposisi, pengenalan pola, abstraksi, dan perancangan algoritma. Gunakan pendekatan ini sebelum memilih bahasa pemrograman atau menulis kode.', 1, 12),
('c2c9e8d4-1af1-4c50-9c21-222222222222', 'Dekomposisi masalah', 'Dekomposisi berarti memecah masalah besar menjadi bagian kecil yang lebih mudah dikelola. Contoh: aplikasi pencatat keuangan dapat dipecah menjadi input transaksi, kategori, daftar transaksi, ringkasan, dan penyimpanan data.', 2, 15),
('c2c9e8d4-1af1-4c50-9c21-222222222222', 'Pengenalan pola dan abstraksi', 'Pola membantu menemukan kesamaan dari beberapa kasus. Abstraksi memilih informasi penting dan mengabaikan detail yang tidak relevan. Dua teknik ini membantu membuat solusi yang dapat dipakai ulang dan tidak terlalu rumit.', 3, 18),
('c2c9e8d4-1af1-4c50-9c21-222222222222', 'Menyusun algoritma', 'Algoritma adalah langkah logis yang terurut untuk menyelesaikan masalah. Algoritma dapat ditulis menggunakan pseudocode atau flowchart sebelum diterjemahkan menjadi kode. Periksa apakah setiap langkah memiliki input, proses, dan hasil yang jelas.', 4, 20),
('c2c9e8d4-1af1-4c50-9c21-222222222222', 'Percabangan dan perulangan', 'Percabangan memilih tindakan berdasarkan kondisi. Perulangan menjalankan proses berulang selama syarat terpenuhi. Keduanya adalah struktur dasar dalam hampir semua bahasa pemrograman. Buat tabel kecil untuk menelusuri perubahan nilai variabel.', 5, 20),
('c2c9e8d4-1af1-4c50-9c21-222222222222', 'Menguji solusi', 'Uji algoritma menggunakan data normal, data batas, dan data tidak valid. Catat hasil yang diharapkan dan hasil aktual agar kesalahan mudah ditemukan. Perbaiki penyebabnya, lalu ulangi pengujian.', 6, 15),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Himpunan dan notasi', 'Himpunan adalah kumpulan objek yang terdefinisi dengan jelas. Pelajari anggota, himpunan kosong, himpunan bagian, gabungan, irisan, dan komplemen. Contoh: A = {1,2,3} dan B = {3,4}; maka A ∩ B = {3}.', 1, 20),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Operasi himpunan', 'Gabungan mengumpulkan anggota dari kedua himpunan, sedangkan irisan mengambil anggota yang sama. Selisih A − B mengambil anggota A yang tidak ada di B. Diagram Venn membantu memvisualisasikan hubungan antarhimpunan.', 2, 20),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Relasi', 'Relasi menyatakan hubungan antara elemen dua himpunan. Relasi dapat direpresentasikan sebagai pasangan berurutan, matriks, atau diagram panah. Tentukan domain dan kodomain sebelum memeriksa sifat relasi.', 3, 25),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Sifat relasi', 'Sifat yang sering diperiksa antara lain refleksif, simetris, antisimetris, dan transitif. Periksa setiap sifat melalui definisi dan pasangan berurutan. Gunakan contoh kecil untuk memahami definisinya.', 4, 25),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Fungsi', 'Fungsi memasangkan setiap anggota domain ke tepat satu anggota kodomain. Pahami domain, kodomain, range, injektif, surjektif, dan bijektif. Tidak setiap relasi merupakan fungsi.', 5, 25),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Logika proposisional', 'Proposisi adalah pernyataan yang bernilai benar atau salah. Operator dasar meliputi negasi, konjungsi, disjungsi, implikasi, dan biimplikasi. Perhatikan urutan operator dan gunakan tanda kurung.', 6, 25),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Tabel kebenaran', 'Tabel kebenaran menampilkan nilai suatu proposisi majemuk untuk semua kombinasi nilai proposisi penyusunnya. Gunakan tabel untuk memeriksa ekuivalensi logis dan validitas argumen sederhana.', 7, 25),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Kuantor', 'Kuantor universal menyatakan bahwa suatu sifat berlaku untuk semua anggota domain. Kuantor eksistensial menyatakan bahwa setidaknya ada satu anggota yang memenuhi sifat tersebut. Perhatikan negasi dari masing-masing kuantor.', 8, 20),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Graf dan representasi', 'Graf terdiri dari simpul dan sisi. Graf dapat merepresentasikan jaringan jalan, relasi pertemanan, atau koneksi perangkat. Pelajari derajat simpul, lintasan, siklus, dan keterhubungan.', 9, 25),
('c2c9e8d4-1af1-4c50-9c21-333333333333', 'Latihan pemodelan diskrit', 'Pilih persoalan sederhana di sekitar kampus, tentukan objek dan relasinya, lalu representasikan menggunakan himpunan, fungsi, logika, atau graf. Jelaskan alasan pemilihan model.', 10, 30),
('c2c9e8d4-1af1-4c50-9c21-444444444444', 'Tujuan tulisan akademik', 'Tulisan akademik menyampaikan gagasan berdasarkan alasan dan bukti. Tentukan pembaca, tujuan, ruang lingkup, dan pertanyaan utama sebelum mulai menulis.', 1, 15),
('c2c9e8d4-1af1-4c50-9c21-444444444444', 'Struktur paragraf', 'Paragraf akademik yang baik memiliki gagasan utama, penjelasan, bukti atau contoh, dan kalimat penghubung. Pastikan setiap paragraf mengembangkan satu ide utama.', 2, 20),
('c2c9e8d4-1af1-4c50-9c21-444444444444', 'Mencari dan mengevaluasi sumber', 'Gunakan sumber yang relevan dan dapat ditelusuri. Periksa penulis, tanggal terbit, penerbit, metode, dan apakah sumber tersebut benar-benar mendukung klaim yang dibuat.', 3, 20),
('c2c9e8d4-1af1-4c50-9c21-444444444444', 'Sitasi dan parafrasa', 'Sitasi memberi kredit pada sumber ide. Parafrasa harus menyusun ulang gagasan dengan pemahaman sendiri, bukan hanya mengganti beberapa kata. Ikuti gaya sitasi yang diminta kampus.', 4, 20),
('c2c9e8d4-1af1-4c50-9c21-444444444444', 'Merevisi tulisan', 'Revisi isi terlebih dahulu: alur argumen, bukti, dan struktur. Setelah itu periksa kejelasan kalimat, konsistensi istilah, tata bahasa, dan format akhir.', 5, 20)
on conflict (module_id, position) do update set title = excluded.title, body = excluded.body, estimated_minutes = excluded.estimated_minutes;

commit;
