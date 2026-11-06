# KAMPUSVERSE

**One Campus. One Knowledge Ecosystem.**

KAMPUSVERSE adalah fondasi platform sosial-akademik kampus berbasis React + TypeScript. Website dimulai dari halaman publik (landing page), lalu pengguna memilih masuk atau mencoba Demo Mode. Fitur inti seperti feed media, materi belajar yang dapat dibuka, dan percakapan dua arah dibuat interaktif. Fitur besar seperti ruang belajar 3D tetap menjadi tahap pengembangan berikutnya.

## 1. Fitur yang tersedia pada versi fondasi

| Area | Yang sudah dapat dicoba |
|---|---|
| Authentication | Masuk/daftar Supabase ketika konfigurasi tersedia; pilihan role simulasi pada Demo Mode |
| Dashboard | Ringkasan course, feed, peluang, dan deadline |
| Community Feed | Buat, edit teks, hapus post sendiri; unggah foto/video, filter, pencarian, like, komentar, bookmark, salin tautan |
| Opportunity Hub | Lihat peluang terverifikasi, filter/pencarian, ajukan peluang untuk ditinjau |
| Admin Console | Memeriksa, menyetujui, atau menolak pengajuan peluang (role admin) |
| Learning Center | Katalog course, pembaca lesson responsif, progres per lesson, serta editor materi dosen/admin untuk teks dan lampiran PDF |
| Campus Connect | Direktori dosen/admin, thread chat mahasiswa, inbox dosen/admin, dan balasan dua arah dalam thread yang sama |
| My Space | Catatan pribadi: buat, edit, cari, dan hapus |
| Profile | Edit nama, program studi, dan bio |
| UI | Layout desktop/mobile, tema gelap/terang, notifikasi, empty states dan form feedback |

## 2. Batasan versi saat ini

Ini adalah MVP/fondasi awal, belum seluruh visi produk selesai.

- Autentikasi dan database asli aktif setelah Supabase dibuat, migration dijalankan, dan `.env` dikonfigurasi.
- Demo Mode menyimpan percakapan, catatan, progres, serta post di `localStorage` browser yang sama. Untuk mencoba balasan, masuk sebagai Mahasiswa, kirim chat ke Nadia Putri, keluar, lalu masuk sebagai Dosen.
- Pada mode Supabase, bucket `post-media` dibuat privat; tampilan feed menggunakan signed URL sementara untuk foto/video.
- Campus Connect menyediakan thread dua arah untuk percakapan mahasiswa dengan dosen/admin. Pada desktop, daftar inbox dan ruang chat tampil berdampingan. Pada ponsel, alurnya menjadi daftar inbox → ruang chat penuh dengan tombol kembali. Inbox diperbarui otomatis berkala saat halaman terbuka; Supabase Realtime, email, dan push notification belum diaktifkan.
- Dosen dan admin dapat menambahkan lesson ke course yang tersedia melalui tombol **Tambah materi**. Isi materi dapat ditulis langsung, dilampiri PDF, atau keduanya. PDF disimpan di IndexedDB pada Demo Mode dan di bucket privat `learning-materials` pada Supabase Mode. Quiz/assessment penuh dan sertifikat masih tahap lanjutan.
- Upload foto profil, rich text editor, lampiran chat, file workspace, follow, report UI, pusat notifikasi, dan virtual learning 3D belum aktif.
- Tidak ada klaim website ini 100% aman. Sistem tetap perlu konfigurasi, pengujian, pemantauan, dan review sebelum digunakan untuk data kampus sungguhan.

## 3. Teknologi

- React 19 + TypeScript
- Vite 7
- React Router
- Lucide React
- CSS design tokens (tanpa framework CSS tambahan supaya struktur styling awal mudah dipelajari)
- Supabase Auth + PostgreSQL + Storage + Row Level Security
- Netlify untuk hosting frontend

## 4. Struktur folder

```text
kampusverse/
├── public/                  # favicon dan aset publik
├── src/
│   ├── components/          # komponen bersama (modal, toast, page title)
│   ├── context/             # state autentikasi pengguna
│   ├── lib/                 # koneksi Supabase, data service, demo store
│   ├── pages/               # satu file untuk setiap halaman
│   ├── App.tsx              # routing dan kerangka aplikasi
│   ├── main.tsx             # titik masuk React
│   ├── styles.css           # design system dan responsive CSS
│   └── types.ts             # tipe data TypeScript
├── supabase/migrations/     # skema PostgreSQL, trigger, dan RLS
├── .env.example             # contoh konfigurasi environment
├── .gitignore
├── netlify.toml
├── package.json
└── README.md
```

## 5. Menjalankan di Windows

### STEP 1 — Pasang software

Pasang:

1. **Node.js LTS** (disarankan Node 22 atau versi baru yang memenuhi syarat Vite).
2. **Visual Studio Code**.
3. **Git** (dibutuhkan untuk GitHub).
4. Browser modern seperti Chrome atau Edge.

Tutup lalu buka kembali terminal setelah instalasi Node.js. Cek versi:

```powershell
node -v
npm -v
```

### STEP 2 — Ekstrak project

Ekstrak ZIP project. Contoh lokasi folder:

```text
C:\Users\NamaKamu\Documents\kampusverse
```

### STEP 3 — Buka di Visual Studio Code

Di VS Code pilih **File → Open Folder**, lalu pilih folder `kampusverse` (folder yang berisi `package.json`, bukan folder `src`).

Buka terminal melalui **Terminal → New Terminal**.

### STEP 4 — Instal dependencies

Pastikan terminal sedang berada di folder project. Jalankan:

```powershell
npm install
```

`npm install` membaca `package.json` dan mengunduh library yang dibutuhkan ke folder `node_modules`. Jika gagal karena jaringan, periksa koneksi internet dan coba kembali. Jangan menghapus `package.json`.

### STEP 5 — Coba Demo Mode terlebih dahulu

Tanpa mengisi Supabase, aplikasi otomatis membuka Demo Mode. Setelah dependencies selesai terpasang, jalankan:

```powershell
npm run dev
```

Buka alamat yang dicetak terminal, biasanya `http://localhost:5173`. Klik salah satu role demo di halaman masuk. Data demo tersimpan di browser yang sama.

Untuk menghentikan server lokal, tekan `Ctrl + C` di terminal.

## 6. Menghubungkan Supabase (backend sungguhan)

### STEP 6 — Buat project Supabase

1. Buat project baru pada [Supabase](https://supabase.com/dashboard).
2. Simpan password database di password manager pribadi; jangan commit ke GitHub.
3. Buka **Project Settings → API**.
4. Catat Project URL dan key yang memang ditujukan untuk browser, yaitu publishable key atau anon key.

### STEP 7 — Buat database

Buka **Supabase → SQL Editor → New query**. Jalankan isi migration satu per satu, dengan urutan berikut:

1. `supabase/migrations/202611060001_initial_schema.sql`
2. `supabase/migrations/202611060002_ux_conversations_media_lessons.sql`
3. `supabase/migrations/202611060003_learning_material_authoring.sql`

Untuk setiap file: buka di VS Code, salin seluruh isi (`Ctrl+A`, `Ctrl+C`), tempel ke SQL Editor, lalu klik **Run**. Pastikan satu migration berhasil sebelum menjalankan file berikutnya.

Migration 001 membuat tabel dasar, relasi, trigger role, course awal, bucket, dan kebijakan RLS. Migration 002 menambahkan media feed, thread percakapan, kebijakan balasan, lesson lengkap, dan progres per lesson. Migration 003 menambahkan metadata lampiran PDF, bucket privat `learning-materials`, serta policy upload dan baca PDF. Untuk project Supabase baru, jalankan 001 → 002 → 003. Jika 001 dan 002 sudah sukses di project yang sama, jalankan hanya 003. Jika ketiganya sudah sukses, jangan jalankan ulang; migration yang pernah dijalankan tidak perlu diulang.

### STEP 8 — Isi environment variables

Di folder utama project, duplikat `.env.example` dan ubah nama salinannya menjadi `.env` (tanpa nama tambahan). Isi:

```env
VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Ganti nilai contoh dengan nilai milik project Supabase-mu. Jangan pernah memakai `service_role` key di sini. Semua variabel dengan awalan `VITE_` akan masuk ke kode frontend dan dapat dilihat pengunjung website. Keamanan database harus bergantung pada RLS, bukan menyembunyikan key browser.

Setelah `.env` diubah, restart server `npm run dev`.

### STEP 9 — Coba autentikasi Supabase

Setelah Supabase terhubung, halaman masuk menggunakan Supabase Auth. Pendaftaran membuat akun dengan role awal `student`. Apabila konfirmasi email aktif, ikuti email konfirmasi sebelum masuk.

### STEP 10 — Menetapkan administrator pertama

Jangan membuat tombol “jadikan saya admin” di frontend. Untuk menetapkan admin pertama:

1. Daftarkan akun pemilik/pengelola kampus melalui aplikasi.
2. Buka Supabase **Authentication → Users**, salin UUID akun yang sudah diverifikasi.
3. Buka SQL Editor dan jalankan query khusus project ini:

```sql
update public.profiles
set role = 'admin'
where id = 'GANTI_DENGAN_UUID_AKUN';
```

Hanya pemilik database yang tepercaya yang boleh melakukan tindakan ini. Role biasa tidak dapat menaikkan role-nya sendiri melalui update API karena trigger dan RLS.

## 7. Periksa project sebelum deploy

Di terminal jalankan:

```powershell
npm run typecheck
npm run build
```

- `typecheck` memeriksa tipe TypeScript.
- `build` membuat versi produksi di folder `dist`.

Uji versi hasil build secara lokal:

```powershell
npm run preview
```

Jangan deploy jika ada error build. Jalankan juga checklist pengujian manual di bagian 10.

## 8. Deploy ke GitHub dan Netlify

### STEP 11 — Buat repository GitHub

1. Buat repository baru di GitHub, misalnya `kampusverse`.
2. Di terminal VS Code, pastikan folder aktif adalah root project.
3. Jalankan:

```powershell
git init
git add .
git commit -m "Initial KAMPUSVERSE foundation"
git branch -M main
git remote add origin https://github.com/USERNAME/kampusverse.git
git push -u origin main
```

Ganti `USERNAME` sesuai akun GitHub-mu. File `.env` sudah masuk `.gitignore`; jangan pernah menghapus perlindungan ini atau mengunggah secret ke repository.

### STEP 12 — Hubungkan ke Netlify

1. Masuk ke [Netlify](https://app.netlify.com/).
2. Pilih **Add new site → Import an existing project**.
3. Pilih GitHub, lalu repository `kampusverse`.
4. Pengaturan build sudah ditulis di `netlify.toml`:

```text
Build command: npm run build
Publish directory: dist
```

### STEP 13 — Environment variables Netlify

Di pengaturan site Netlify, buka **Site configuration → Environment variables** dan tambahkan:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Isi dengan nilai dari Supabase yang sama seperti `.env` lokal. Jalankan deploy ulang setelah menambahkan atau mengubah environment variables.

### STEP 14 — Atur URL Auth Supabase

Setelah mendapat domain Netlify:

1. Buka Supabase **Authentication → URL Configuration**.
2. Set **Site URL** ke domain Netlify.
3. Tambahkan domain tersebut ke daftar **Redirect URLs** yang diizinkan.
4. Lakukan deploy ulang jika ada perubahan frontend.

Netlify rewrite SPA sudah disiapkan pada `netlify.toml` agar URL route seperti `/community` tidak menghasilkan 404 saat halaman di-refresh.

### STEP 15 — Bagikan link

Setelah Netlify menyatakan deploy berhasil, gunakan domain `https://...netlify.app` milik site-mu untuk mengajak teman mencoba. Gunakan akun Supabase masing-masing saat backend sudah tersambung. Jangan bagikan akses admin atau data internal kepada publik.

## 9. Memperbarui website setelah deploy

Setelah mengubah file di VS Code:

```powershell
npm run typecheck
npm run build
git add .
git commit -m "Update KAMPUSVERSE"
git push
```

Netlify akan mendeteksi push ke branch yang terhubung dan menjalankan deploy baru. Untuk perubahan database, buat migration SQL baru, tinjau isinya, lalu jalankan pada Supabase sebelum frontend bergantung pada kolom/tabel baru.

## 10. Checklist pengujian manual

- [ ] Demo Mode dapat masuk sebagai mahasiswa, dosen, dan admin.
- [ ] Dashboard memuat ringkasan.
- [ ] Pengunjung baru melihat landing page sebelum memilih masuk atau Demo Mode.
- [ ] Community Feed dapat membuat post teks, foto, dan video (Demo Mode maksimal 1 MB per file).
- [ ] Pemilik post dapat edit dan delete.
- [ ] Like, komentar, bookmark, filter, dan pencarian bekerja.
- [ ] Pengajuan opportunity berstatus pending.
- [ ] Admin dapat verify/reject; pengguna mahasiswa tidak melihat panel Admin.
- [ ] Course dapat dibuka; daftar lesson dapat diklik dan isi materi terbaca.
- [ ] Selesaikan lesson; progres tersimpan dan tidak bertambah ganda.
- [ ] Mahasiswa mengirim chat kepada dosen; dosen membalas pada thread yang sama.
- [ ] Admin dapat melihat inbox percakapan dan membalas sesuai kewenangannya.
- [ ] Sidebar dapat discroll pada desktop dan ponsel; teks panjang tidak menimbulkan horizontal overflow.
- [ ] My Space dapat membuat, mengedit, mencari, dan menghapus catatan.
- [ ] Profil dapat diperbarui.
- [ ] Data demo tetap ada setelah refresh pada browser yang sama.
- [ ] Tampilan diuji pada ukuran desktop, tablet, dan ponsel.
- [ ] Dengan Supabase, pastikan pengguna A tidak dapat membaca/mengubah notes pengguna B.
- [ ] Dengan Supabase, pastikan mahasiswa tidak dapat mengubah role atau memverifikasi opportunity melalui API.
- [ ] Build produksi berhasil.

## 11. Troubleshooting

**`npm` is not recognized**  
Node.js belum terpasang dengan benar atau terminal belum dibuka ulang. Coba tutup VS Code, buka lagi, lalu cek `node -v`.

**`npm install` gagal**  
Periksa jaringan dan firewall. Pastikan terminal berada di folder project yang memiliki `package.json`.

**Halaman tetap Demo Mode**  
Periksa nama file `.env`, nama variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, lalu restart Vite.

**Supabase `Invalid API key` / `Failed to fetch`**  
Pastikan Project URL dan browser key berasal dari project yang sama. Jangan isi dengan database password atau service role key.

**Data tidak tampil pada Supabase**  
Pastikan SQL migration berhasil, akun sudah login, tabel yang diminta memiliki RLS policy, dan course ditandai `is_published = true`.

**Refresh route Netlify menghasilkan 404**  
Pastikan `netlify.toml` ikut terunggah dan Publish directory adalah `dist`.

**Perubahan `.env` tidak terbaca**  
Hentikan server dengan `Ctrl + C`, jalankan `npm run dev` lagi. Pada Netlify, lakukan deploy ulang setelah mengubah environment variables.

## 12. Prinsip keamanan

1. Jangan pernah memasukkan `service_role` key, database password, atau secret ke frontend, Git, screenshot publik, atau chat terbuka.
2. Jangan mengandalkan role dari localStorage untuk memberi akses data asli.
3. RLS harus aktif dan diuji menggunakan akun dengan role berbeda.
4. Batasi ukuran dan tipe MIME upload ketika fitur media diaktifkan.
5. Validasi URL dan input di sisi database/server, bukan hanya form browser.
6. Terapkan rate limiting, moderation, audit logging, backup, dan monitoring saat aplikasi mulai dipakai luas.
7. Jalankan review keamanan independen sebelum memasukkan data pribadi mahasiswa.

---

**Status versi:** MVP foundation / development demo. Belum siap dianggap sebagai sistem informasi resmi kampus tanpa konfigurasi Supabase, pengujian keamanan, dan pengembangan modul yang masih tercantum sebagai batasan.


## 11. Troubleshooting build dan Campus Connect

Sebelum deploy, jalankan:

```powershell
npm run typecheck
npm run build
```

Jika `npm install` bermasalah, pastikan Node.js memenuhi `engines` pada `package.json`, internet aktif, kemudian jalankan kembali `npm install`. Jika registry npm sedang tidak dapat diakses, build tidak dapat dijalankan sampai dependencies berhasil diunduh.

Perbaikan penting pada rilis ini:

- `AuthContext.tsx`: koneksi Supabase disalin ke variabel lokal yang sudah dipastikan tidak `null` sebelum dipakai oleh callback autentikasi.
- `ConnectPage.tsx`: ikon role kontak sekarang benar-benar ditampilkan sehingga tidak memicu `noUnusedLocals`.
- Campus Connect mobile: inbox dan chat tidak lagi dijejerkan pada layar sempit. Pilih percakapan untuk membuka tampilan chat, gunakan panah kembali untuk kembali ke daftar.
- Inbox: tersedia pencarian berdasarkan nama, subjek, atau pesan terakhir; daftar pesan otomatis bergeser ke pesan terbaru.

Jika build masih menampilkan error, salin seluruh output baru (bukan hanya baris terakhir) agar file dan baris yang bermasalah bisa ditelusuri.
