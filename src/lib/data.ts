import { demoStore } from './demoStore'
import { supabase, hasSupabaseConfig } from './supabase'
import { getDemoLessonPdf, saveDemoLessonPdf } from './lessonFileStore'
import type { AppUser, CampusContact, CampusConversation, CampusConversationMessage, CampusMessage, Course, CourseLesson, Note, Opportunity, Post, PostComment, Role } from '../types'

const isDemo = () => !hasSupabaseConfig || !supabase

export async function getPosts(userId: string): Promise<Post[]> {
  if (isDemo()) return demoStore.getPosts().map(post => ({ ...post }))
  const { data, error } = await supabase!.from('posts').select('id,author_id,category,content,media_url,media_type,created_at,profiles!posts_author_id_fkey(display_name,role,avatar_url),post_likes(count),comments(count)').order('created_at', { ascending: false }).limit(30)
  if (error) throw error
  const [likesResult, bookmarksResult] = await Promise.all([
    supabase!.from('post_likes').select('post_id').eq('user_id', userId),
    supabase!.from('post_bookmarks').select('post_id').eq('user_id', userId),
  ])
  if (likesResult.error) throw likesResult.error
  if (bookmarksResult.error) throw bookmarksResult.error
  const mediaPaths = [...new Set((data ?? []).map((row: any) => row.media_url).filter((path: unknown): path is string => typeof path === 'string' && path.length > 0))]
  const signedMedia = mediaPaths.length ? await supabase!.storage.from('post-media').createSignedUrls(mediaPaths, 60 * 60) : { data: [], error: null }
  if (signedMedia.error) throw signedMedia.error
  const signedUrlByPath = new Map((signedMedia.data ?? []).map((item: any) => [item.path, item.signedUrl]))
  const likedIds = new Set((likesResult.data ?? []).map((row: any) => row.post_id))
  const bookmarkedIds = new Set((bookmarksResult.data ?? []).map((row: any) => row.post_id))
  return (data ?? []).map((row: any) => ({
    id: row.id, author_id: row.author_id, category: row.category, content: row.content, media_url: row.media_url ? signedUrlByPath.get(row.media_url) ?? null : null, media_type: row.media_type ?? null, created_at: row.created_at,
    author_name: row.profiles?.display_name ?? 'Anggota Kampus', author_role: row.profiles?.role ?? 'student',
    author_avatar: row.profiles?.avatar_url ?? 'KV', likes: row.post_likes?.[0]?.count ?? 0,
    comments: row.comments?.[0]?.count ?? 0, liked: likedIds.has(row.id), bookmarked: bookmarkedIds.has(row.id),
  })) as Post[]
}

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('File tidak dapat dibaca.'))
    reader.onerror = () => reject(new Error('File gagal dibaca.'))
    reader.readAsDataURL(file)
  })
}

export async function createPost(user: AppUser, category: string, content: string, media?: File): Promise<void> {
  let mediaUrl: string | null = null
  let mediaType: 'image' | 'video' | null = null
  if (media) {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
    if (!allowedTypes.has(media.type)) throw new Error('Format media harus JPG, PNG, WebP, MP4, atau WebM.')
    if (media.size > 20 * 1024 * 1024) throw new Error('Ukuran media maksimal 20 MB.')
    mediaType = media.type.startsWith('video/') ? 'video' : 'image'
    if (isDemo()) {
      if (media.size > 1024 * 1024) throw new Error('Mode demo membatasi media hingga 1 MB per post agar penyimpanan browser tidak cepat penuh.')
      mediaUrl = await fileAsDataUrl(media)
    } else {
      const extension = media.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin'
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase!.storage.from('post-media').upload(path, media, { contentType: media.type, upsert: false })
      if (uploadError) throw uploadError
      // Keep the private storage path in the database; getPosts creates short-lived signed URLs.
      mediaUrl = path
    }
  }
  if (isDemo()) {
    const posts = demoStore.getPosts()
    demoStore.setPosts([{ id: crypto.randomUUID(), author_id: user.id, author_name: user.name, author_role: user.role, author_avatar: user.avatar, category, content, media_url: mediaUrl, media_type: mediaType, created_at: new Date().toISOString(), likes: 0, comments: 0 }, ...posts])
    return
  }
  const { error } = await supabase!.from('posts').insert({ author_id: user.id, category, content, media_url: mediaUrl, media_type: mediaType })
  if (error) {
    if (mediaUrl) await supabase!.storage.from('post-media').remove([mediaUrl]).catch(() => undefined)
    throw error
  }
}

export async function togglePostLike(postId: string, userId: string): Promise<void> {
  if (isDemo()) {
    demoStore.setPosts(demoStore.getPosts().map(post => post.id === postId ? { ...post, liked: !post.liked, likes: Math.max(0, post.likes + (post.liked ? -1 : 1)) } : post))
    return
  }
  const { data: existing, error: findError } = await supabase!.from('post_likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle()
  if (findError) throw findError
  const result = existing
    ? await supabase!.from('post_likes').delete().eq('id', existing.id)
    : await supabase!.from('post_likes').insert({ post_id: postId, user_id: userId })
  if (result.error) throw result.error
}

export async function getOpportunities(includePending = false): Promise<Opportunity[]> {
  if (isDemo()) return demoStore.getOpportunities().filter(item => includePending || item.status === 'verified')
  let query = supabase!.from('opportunities').select('*').order('deadline', { ascending: true })
  if (!includePending) query = query.eq('status', 'verified')
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Opportunity[]
}

export async function submitOpportunity(user: AppUser, item: Omit<Opportunity, 'id' | 'status' | 'created_at' | 'submitted_by'>): Promise<void> {
  if (isDemo()) {
    demoStore.setOpportunities([{ ...item, id: crypto.randomUUID(), status: 'pending', created_at: new Date().toISOString(), submitted_by: user.id }, ...demoStore.getOpportunities()])
    return
  }
  const { error } = await supabase!.from('opportunities').insert({ ...item, status: 'pending', submitted_by: user.id })
  if (error) throw error
}

export async function reviewOpportunity(id: string, status: 'verified' | 'rejected', reviewerId?: string): Promise<void> {
  if (isDemo()) {
    demoStore.setOpportunities(demoStore.getOpportunities().map(item => item.id === id ? { ...item, status } : item))
    return
  }
  const { error } = await supabase!.from('opportunities').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId ?? null }).eq('id', id)
  if (error) throw error
}

export async function getCourses(userId: string): Promise<Course[]> {
  if (isDemo()) {
    const progress = demoStore.getProgress()
    return demoStore.getCourses().map(course => ({ ...course, progress: progress[course.id] ?? course.progress }))
  }
  const { data, error } = await supabase!.from('courses').select('id,title,category,level,duration,lessons_count,description,instructor,color,student_progress(progress_percent,student_id)').eq('is_published', true).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((item: any) => ({ id: item.id, title: item.title, category: item.category, level: item.level, duration: item.duration, lessons: item.lessons_count, description: item.description, instructor: item.instructor, color: item.color, progress: item.student_progress?.find((entry: any) => entry.student_id === userId)?.progress_percent ?? 0 })) as Course[]
}

export async function updateCourseProgress(courseId: string, userId: string, progress: number): Promise<void> {
  if (isDemo()) {
    demoStore.setProgress({ ...demoStore.getProgress(), [courseId]: Math.min(100, Math.max(progress, demoStore.getProgress()[courseId] ?? 0)) })
    return
  }
  const { error } = await supabase!.from('student_progress').upsert({ course_id: courseId, student_id: userId, progress_percent: progress, updated_at: new Date().toISOString() }, { onConflict: 'course_id,student_id' })
  if (error) throw error
}

const demoLessonContent: Record<string, Array<{ title: string; minutes: number; body: string }>> = {
  c1: [
    { title: 'Mengenal cara kerja website', minutes: 12, body: `Website berjalan melalui kerja sama browser, server, dan jaringan. Browser meminta halaman melalui HTTP/HTTPS, server mengirim respons, lalu browser menampilkan HTML, CSS, dan JavaScript.\n\nBayangkan HTML sebagai struktur ruangan, CSS sebagai tata letak dan dekorasi, sedangkan JavaScript membuat elemen dapat merespons tindakan pengguna.\n\nTujuan belajar: kenali perbedaan frontend dan backend serta alur sederhana ketika sebuah halaman dibuka.` },
    { title: 'Struktur dokumen HTML', minutes: 18, body: `HTML memberi struktur semantik pada halaman. Dokumen umumnya memiliki deklarasi DOCTYPE, elemen html, head, dan body.\n\nGunakan heading secara berurutan, paragraf untuk teks, dan elemen yang sesuai dengan makna kontennya. Struktur yang jelas membantu aksesibilitas dan mesin pencari.` },
    { title: 'Elemen semantik HTML', minutes: 15, body: `Elemen seperti header, nav, main, section, article, dan footer menjelaskan peran bagian halaman. Hindari memakai div untuk semua hal apabila tersedia elemen yang lebih bermakna.\n\nLatihan: rancang kerangka halaman profil mahasiswa dengan header, navigasi, konten utama, dan footer.` },
    { title: 'Dasar CSS dan selector', minutes: 20, body: `CSS mengatur tampilan melalui aturan selector, property, dan value. Contoh: .card { padding: 16px; border-radius: 12px; }.\n\nPelajari selector elemen, class, id, pseudo-class, inheritance, cascade, dan specificity. Mulai dari aturan kecil lalu amati dampaknya di browser.` },
    { title: 'Box model dan layout', minutes: 22, body: `Setiap elemen memiliki content, padding, border, dan margin. Gunakan box-sizing: border-box agar perhitungan ukuran lebih mudah.\n\nFlexbox cocok untuk menyusun item dalam satu arah. CSS Grid cocok untuk susunan baris dan kolom. Pilih berdasarkan struktur konten, bukan sekadar kebiasaan.` },
    { title: 'Responsive web design', minutes: 20, body: `Desain responsif membuat konten menyesuaikan ruang yang tersedia. Gunakan unit fleksibel, max-width, gambar dengan max-width: 100%, serta media query bila layout perlu berubah.\n\nMulai dari konten yang paling penting. Pastikan tombol mudah disentuh dan tidak ada elemen yang memaksa halaman melebar secara horizontal.` },
    { title: 'JavaScript dan interaksi', minutes: 25, body: `JavaScript menambahkan perilaku pada halaman. Variabel menyimpan data, function mengelompokkan proses, dan event listener merespons aksi pengguna.\n\nContoh penggunaan: validasi form, membuka menu, memperbarui teks, atau mengambil data dari API. Pisahkan logika dari tampilan agar lebih mudah dirawat.` },
    { title: 'Mini project: halaman profil', minutes: 30, body: `Gabungkan HTML, CSS, dan JavaScript untuk membuat halaman profil mahasiswa. Sertakan judul, deskripsi, daftar keahlian, dan tombol yang memberikan feedback saat ditekan.\n\nPeriksa hasil pada lebar ponsel dan desktop. Pastikan navigasi jelas, warna memiliki kontras yang cukup, dan seluruh kontrol dapat digunakan dengan keyboard.` },
  ],
  c2: [
    { title: 'Berpikir komputasional', minutes: 12, body: `Berpikir komputasional adalah pendekatan untuk memecahkan masalah dengan cara yang terstruktur. Empat gagasan pentingnya adalah dekomposisi, pengenalan pola, abstraksi, dan perancangan algoritma.\n\nGunakan pendekatan ini sebelum memilih bahasa pemrograman atau menulis kode.` },
    { title: 'Dekomposisi masalah', minutes: 15, body: `Dekomposisi berarti memecah masalah besar menjadi bagian kecil yang lebih mudah dikelola.\n\nContoh: aplikasi pencatat keuangan dapat dipecah menjadi input transaksi, kategori, daftar transaksi, ringkasan, dan penyimpanan data.` },
    { title: 'Pengenalan pola dan abstraksi', minutes: 18, body: `Pola membantu menemukan kesamaan dari beberapa kasus. Abstraksi memilih informasi penting dan mengabaikan detail yang tidak relevan.\n\nDua teknik ini membantu membuat solusi yang dapat dipakai ulang dan tidak terlalu rumit.` },
    { title: 'Menyusun algoritma', minutes: 20, body: `Algoritma adalah langkah logis yang terurut untuk menyelesaikan masalah. Algoritma dapat ditulis menggunakan pseudocode atau flowchart sebelum diterjemahkan menjadi kode. Periksa apakah setiap langkah memiliki input, proses, dan hasil yang jelas.` },
    { title: 'Percabangan dan perulangan', minutes: 20, body: `Percabangan memilih tindakan berdasarkan kondisi. Perulangan menjalankan proses berulang selama syarat terpenuhi. Keduanya adalah struktur dasar dalam hampir semua bahasa pemrograman. Buat tabel kecil untuk menelusuri perubahan nilai variabel.` },
    { title: 'Menguji solusi', minutes: 15, body: `Uji algoritma menggunakan data normal, data batas, dan data tidak valid. Catat hasil yang diharapkan dan hasil aktual agar kesalahan mudah ditemukan. Perbaiki penyebabnya, lalu ulangi pengujian.` },
  ],
  c3: [
    { title: 'Himpunan dan notasi', minutes: 20, body: `Himpunan adalah kumpulan objek yang terdefinisi dengan jelas. Pelajari anggota, himpunan kosong, himpunan bagian, gabungan, irisan, dan komplemen.\n\nContoh: A = {1,2,3} dan B = {3,4}. Maka A ∩ B = {3} dan A ∪ B = {1,2,3,4}.` },
    { title: 'Operasi himpunan', minutes: 20, body: `Gabungan mengumpulkan anggota dari kedua himpunan, sedangkan irisan mengambil anggota yang sama. Selisih A − B mengambil anggota A yang tidak ada di B.\n\nDiagram Venn dapat membantu memvisualisasikan hubungan antarhimpunan.` },
    { title: 'Relasi', minutes: 25, body: `Relasi menyatakan hubungan antara elemen dua himpunan. Relasi dapat direpresentasikan sebagai pasangan berurutan, matriks, atau diagram panah. Tentukan domain dan kodomain sebelum memeriksa sifat relasi.` },
    { title: 'Sifat relasi', minutes: 25, body: `Sifat yang sering diperiksa antara lain refleksif, simetris, antisimetris, dan transitif. Periksa setiap sifat melalui definisi dan pasangan berurutan. Gunakan contoh kecil untuk memahami definisinya.` },
    { title: 'Fungsi', minutes: 25, body: `Fungsi memasangkan setiap anggota domain ke tepat satu anggota kodomain. Pahami domain, kodomain, range, injektif, surjektif, dan bijektif. Tidak setiap relasi merupakan fungsi.` },
    { title: 'Logika proposisional', minutes: 25, body: `Proposisi adalah pernyataan yang bernilai benar atau salah. Operator dasar meliputi negasi, konjungsi, disjungsi, implikasi, dan biimplikasi. Perhatikan urutan operator dan gunakan tanda kurung.` },
    { title: 'Tabel kebenaran', minutes: 25, body: `Tabel kebenaran menampilkan nilai suatu proposisi majemuk untuk semua kombinasi nilai proposisi penyusunnya. Gunakan tabel untuk memeriksa ekuivalensi logis dan validitas argumen sederhana.` },
    { title: 'Kuantor', minutes: 20, body: `Kuantor universal menyatakan bahwa suatu sifat berlaku untuk semua anggota domain. Kuantor eksistensial menyatakan bahwa setidaknya ada satu anggota yang memenuhi sifat tersebut. Perhatikan negasi dari masing-masing kuantor.` },
    { title: 'Graf dan representasi', minutes: 25, body: `Graf terdiri dari simpul dan sisi. Graf dapat merepresentasikan jaringan jalan, relasi pertemanan, atau koneksi perangkat. Pelajari derajat simpul, lintasan, siklus, dan keterhubungan.` },
    { title: 'Latihan pemodelan diskrit', minutes: 30, body: `Pilih persoalan sederhana di sekitar kampus, tentukan objek dan relasinya, lalu representasikan menggunakan himpunan, fungsi, logika, atau graf. Jelaskan alasan pemilihan model.` },
  ],
  c4: [
    { title: 'Tujuan tulisan akademik', minutes: 15, body: `Tulisan akademik menyampaikan gagasan berdasarkan alasan dan bukti. Tentukan pembaca, tujuan, ruang lingkup, dan pertanyaan utama sebelum mulai menulis.` },
    { title: 'Struktur paragraf', minutes: 20, body: `Paragraf akademik yang baik memiliki gagasan utama, penjelasan, bukti atau contoh, dan kalimat penghubung. Pastikan setiap paragraf mengembangkan satu ide utama.` },
    { title: 'Mencari dan mengevaluasi sumber', minutes: 20, body: `Gunakan sumber yang relevan dan dapat ditelusuri. Periksa penulis, tanggal terbit, penerbit, metode, dan apakah sumber tersebut benar-benar mendukung klaim yang dibuat.` },
    { title: 'Sitasi dan parafrasa', minutes: 20, body: `Sitasi memberi kredit pada sumber ide. Parafrasa harus menyusun ulang gagasan dengan pemahaman sendiri, bukan hanya mengganti beberapa kata. Ikuti gaya sitasi yang diminta kampus.` },
    { title: 'Merevisi tulisan', minutes: 20, body: `Revisi isi terlebih dahulu: alur argumen, bukti, dan struktur. Setelah itu periksa kejelasan kalimat, konsistensi istilah, tata bahasa, dan format akhir.` },
  ],
}

const demoLessonPdfUrls = new Map<string, string>()

async function getDemoLessonPdfUrl(id: string): Promise<string | null> {
  const cached = demoLessonPdfUrls.get(id)
  if (cached) return cached
  const file = await getDemoLessonPdf(id)
  if (!file) return null
  const url = URL.createObjectURL(file)
  demoLessonPdfUrls.set(id, url)
  return url
}

export async function getCourseLessons(courseId: string): Promise<CourseLesson[]> {
  if (isDemo()) {
    const lessons = demoLessonContent[courseId] ?? []
    const seeded = lessons.map((lesson, index) => ({ id: `${courseId}-lesson-${index + 1}`, course_id: courseId, title: lesson.title, body: lesson.body, position: index + 1, estimated_minutes: lesson.minutes }))
    const custom = await Promise.all(demoStore.getCustomLessons().filter(item => item.course_id === courseId).map(async item => ({
      ...item,
      pdf_url: item.pdf_path ? await getDemoLessonPdfUrl(item.id) : null,
    })))
    return [...seeded, ...custom].sort((a, b) => a.position - b.position)
  }
  const { data, error } = await supabase!.from('lessons').select('id,title,body,position,estimated_minutes,pdf_path,pdf_name,course_modules!inner(course_id)').eq('course_modules.course_id', courseId).order('position', { ascending: true })
  if (error) throw error
  const rows = data ?? []
  const paths = rows.map((row: any) => row.pdf_path).filter((path: unknown): path is string => typeof path === 'string' && path.length > 0)
  const signed = paths.length ? await supabase!.storage.from('learning-materials').createSignedUrls(paths, 60 * 60) : { data: [], error: null }
  if (signed.error) throw signed.error
  const urls = new Map((signed.data ?? []).map((item: any) => [item.path, item.signedUrl]))
  return rows.map((row: any) => ({
    id: row.id,
    course_id: courseId,
    title: row.title,
    body: row.body ?? '',
    position: row.position,
    estimated_minutes: row.estimated_minutes,
    pdf_path: row.pdf_path ?? null,
    pdf_name: row.pdf_name ?? null,
    pdf_url: row.pdf_path ? urls.get(row.pdf_path) ?? null : null,
  })) as CourseLesson[]
}

export async function createCourseLesson(
  user: AppUser,
  input: { courseId: string; title: string; body: string; estimatedMinutes: number; pdf?: File | null },
): Promise<CourseLesson> {
  if (user.role !== 'lecturer' && user.role !== 'admin') {
    throw new Error('Hanya dosen dan administrator yang dapat menambahkan materi.')
  }
  const title = input.title.trim()
  const body = input.body.trim()
  if (title.length < 3 || title.length > 140) throw new Error('Judul materi harus terdiri dari 3–140 karakter.')
  if (!body && !input.pdf) throw new Error('Tulis isi materi atau lampirkan PDF terlebih dahulu.')
  if (input.pdf) {
    if (input.pdf.type !== 'application/pdf' && !input.pdf.name.toLowerCase().endsWith('.pdf')) throw new Error('Lampiran harus berupa file PDF.')
    if (input.pdf.size > 20 * 1024 * 1024) throw new Error('Ukuran PDF maksimal 20 MB.')
    const signature = await input.pdf.slice(0, 5).text()
    if (signature !== '%PDF-') throw new Error('Isi file tidak memiliki tanda tangan PDF yang valid.')
  }
  const minutes = Math.min(240, Math.max(1, Math.round(input.estimatedMinutes || 10)))

  if (isDemo()) {
    const existing = await getCourseLessons(input.courseId)
    const id = crypto.randomUUID()
    if (input.pdf) await saveDemoLessonPdf(id, input.pdf)
    const lesson: CourseLesson = {
      id,
      course_id: input.courseId,
      title,
      body,
      position: Math.max(0, ...existing.map(item => item.position)) + 1,
      estimated_minutes: minutes,
      pdf_path: input.pdf ? id : null,
      pdf_name: input.pdf?.name ?? null,
      pdf_url: input.pdf ? await getDemoLessonPdfUrl(id) : null,
    }
    demoStore.setCustomLessons([...demoStore.getCustomLessons(), lesson])
    demoStore.setCourses(demoStore.getCourses().map(course => course.id === input.courseId ? { ...course, lessons: course.lessons + 1 } : course))
    return lesson
  }

  const { data: moduleRows, error: moduleReadError } = await supabase!.from('course_modules').select('id').eq('course_id', input.courseId).order('position', { ascending: true }).limit(1)
  if (moduleReadError) throw moduleReadError
  let moduleId = moduleRows?.[0]?.id as string | undefined
  if (!moduleId) {
    const { data: module, error } = await supabase!.from('course_modules').insert({ course_id: input.courseId, title: 'Materi pembelajaran', position: 1 }).select('id').single()
    if (error) throw error
    moduleId = module.id as string
  }

  const { data: lastRows, error: lastError } = await supabase!.from('lessons').select('position').eq('module_id', moduleId).order('position', { ascending: false }).limit(1)
  if (lastError) throw lastError
  const position = (lastRows?.[0]?.position ?? 0) + 1
  let pdfPath: string | null = null
  if (input.pdf) {
    const extension = 'pdf'
    pdfPath = `${user.id}/${input.courseId}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase!.storage.from('learning-materials').upload(pdfPath, input.pdf, { contentType: 'application/pdf', upsert: false })
    if (error) throw error
  }
  const { data: created, error: createError } = await supabase!.from('lessons').insert({
    module_id: moduleId,
    title,
    body,
    position,
    estimated_minutes: minutes,
    pdf_path: pdfPath,
    pdf_name: input.pdf?.name ?? null,
  }).select('id,title,body,position,estimated_minutes,pdf_path,pdf_name').single()
  if (createError) {
    if (pdfPath) await supabase!.storage.from('learning-materials').remove([pdfPath])
    throw createError
  }
  const { data: moduleIds, error: moduleIdsError } = await supabase!.from('course_modules').select('id').eq('course_id', input.courseId)
  if (!moduleIdsError && moduleIds?.length) {
    const ids = moduleIds.map((item: any) => item.id)
    const { count } = await supabase!.from('lessons').select('id', { count: 'exact', head: true }).in('module_id', ids)
    await supabase!.from('courses').update({ lessons_count: count ?? position }).eq('id', input.courseId)
  }
  let pdfUrl: string | null = null
  if (pdfPath) {
    const { data: signedUrl, error } = await supabase!.storage.from('learning-materials').createSignedUrl(pdfPath, 60 * 60)
    if (error) throw error
    pdfUrl = signedUrl.signedUrl
  }
  return { id: created.id, course_id: input.courseId, title: created.title, body: created.body ?? '', position: created.position, estimated_minutes: created.estimated_minutes, pdf_path: created.pdf_path, pdf_name: created.pdf_name, pdf_url: pdfUrl }
}

export async function getCompletedLessonIds(userId: string, lessonIds: string[]): Promise<string[]> {
  if (!lessonIds.length) return []
  if (isDemo()) {
    const prefix = `${userId}:`
    const done = new Set(demoStore.getLessonProgress().filter(item => item.startsWith(prefix)).map(item => item.slice(prefix.length)))
    return lessonIds.filter(id => done.has(id))
  }
  const { data, error } = await supabase!.from('student_lesson_progress').select('lesson_id').eq('student_id', userId).in('lesson_id', lessonIds)
  if (error) throw error
  return (data ?? []).map((row: any) => row.lesson_id as string)
}

export async function markLessonComplete(userId: string, lessonId: string): Promise<void> {
  if (isDemo()) {
    const key = `${userId}:${lessonId}`
    const items = demoStore.getLessonProgress()
    if (!items.includes(key)) demoStore.setLessonProgress([...items, key])
    return
  }
  const { error } = await supabase!.from('student_lesson_progress').upsert({ student_id: userId, lesson_id: lessonId }, { onConflict: 'student_id,lesson_id' })
  if (error) throw error
}

export async function getNotes(userId: string): Promise<Note[]> {
  if (isDemo()) return demoStore.getNotes().filter(note => note.owner_id === userId)
  const { data, error } = await supabase!.from('notes').select('*').eq('owner_id', userId).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Note[]
}

export async function saveNote(userId: string, note: Pick<Note, 'title' | 'body'>, id?: string): Promise<void> {
  if (isDemo()) {
    const items = demoStore.getNotes()
    const next: Note = { id: id ?? crypto.randomUUID(), owner_id: userId, ...note, updated_at: new Date().toISOString() }
    demoStore.setNotes(id ? items.map(item => item.id === id ? next : item) : [next, ...items])
    return
  }
  const result = id
    ? await supabase!.from('notes').update({ ...note, updated_at: new Date().toISOString() }).eq('id', id).eq('owner_id', userId)
    : await supabase!.from('notes').insert({ ...note, owner_id: userId })
  if (result.error) throw result.error
}

export async function deleteNote(id: string, userId: string): Promise<void> {
  if (isDemo()) { demoStore.setNotes(demoStore.getNotes().filter(item => item.id !== id)); return }
  const { error } = await supabase!.from('notes').delete().eq('id', id).eq('owner_id', userId)
  if (error) throw error
}

const demoCampusContacts: CampusContact[] = [
  { id: 'demo-lecturer', name: 'Nadia Putri', role: 'lecturer', major: 'Informatika · Dosen', avatar: 'NP' },
  { id: 'demo-admin', name: 'Admin Kampus', role: 'admin', major: 'Administrasi kampus', avatar: 'AK' },
]

export async function getCampusContacts(): Promise<CampusContact[]> {
  if (isDemo()) return demoCampusContacts
  const { data, error } = await supabase!.from('profiles').select('id,display_name,role,major,avatar_url').in('role', ['lecturer', 'admin']).order('display_name')
  if (error) throw error
  return (data ?? []).map((row: any) => ({ id: row.id, name: row.display_name ?? 'Petugas Kampus', role: row.role as Role, major: row.major ?? 'Layanan kampus', avatar: row.avatar_url ?? (row.display_name ?? 'KV').split(' ').map((part: string) => part[0]).slice(0, 2).join('') }))
}

export async function getCampusConversations(user: AppUser): Promise<CampusConversation[]> {
  if (isDemo()) {
    return demoStore.getConversations().filter(item => item.created_by === user.id || item.recipient_user_id === user.id || user.role === 'admin').map(item => ({ ...item, messages: demoStore.getConversationMessages().filter(message => message.conversation_id === item.id).sort((a, b) => a.created_at.localeCompare(b.created_at)) })).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
  let query = supabase!.from('campus_conversations').select('*').order('updated_at', { ascending: false })
  if (user.role !== 'admin') query = query.or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`)
  const { data, error } = await query
  if (error) throw error
  const ids = (data ?? []).map((row: any) => row.id)
  if (!ids.length) return []
  const { data: messageRows, error: messageError } = await supabase!.from('campus_conversation_messages').select('id,conversation_id,sender_id,body,created_at,profiles!campus_conversation_messages_sender_id_fkey(display_name,role)').in('conversation_id', ids).order('created_at', { ascending: true })
  if (messageError) throw messageError
  const mappedMessages: CampusConversationMessage[] = (messageRows ?? []).map((row: any) => ({ id: row.id, conversation_id: row.conversation_id, sender_id: row.sender_id, sender_name: row.profiles?.display_name ?? 'Anggota Kampus', sender_role: row.profiles?.role ?? 'student', body: row.body, created_at: row.created_at }))
  return (data ?? []).map((row: any) => ({ id: row.id, created_by: row.created_by, created_by_name: row.created_by_name, created_by_role: row.created_by_role, recipient_user_id: row.recipient_user_id, recipient_name: row.recipient_name, recipient_role: row.recipient_role, subject: row.subject, priority: row.priority, status: row.status, created_at: row.created_at, updated_at: row.updated_at, messages: mappedMessages.filter(message => message.conversation_id === row.id) })) as CampusConversation[]
}

export async function createCampusConversation(user: AppUser, contact: CampusContact, subject: string, body: string, priority: 'normal' | 'high'): Promise<string> {
  const now = new Date().toISOString()
  if (isDemo()) {
    const id = crypto.randomUUID()
    const conversation: CampusConversation = { id, created_by: user.id, created_by_name: user.name, created_by_role: user.role, recipient_user_id: contact.id, recipient_name: contact.name, recipient_role: contact.role, subject, priority, status: 'open', created_at: now, updated_at: now, messages: [] }
    const message: CampusConversationMessage = { id: crypto.randomUUID(), conversation_id: id, sender_id: user.id, sender_name: user.name, sender_role: user.role, body, created_at: now }
    demoStore.setConversations([conversation, ...demoStore.getConversations()])
    demoStore.setConversationMessages([...demoStore.getConversationMessages(), message])
    return id
  }
  const { data, error } = await supabase!.from('campus_conversations').insert({ created_by: user.id, recipient_user_id: contact.id, subject, priority }).select('id').single()
  if (error) throw error
  const { error: messageError } = await supabase!.from('campus_conversation_messages').insert({ conversation_id: data.id, sender_id: user.id, body })
  if (messageError) throw messageError
  return data.id
}

export async function sendCampusReply(user: AppUser, conversation: CampusConversation, body: string): Promise<void> {
  const now = new Date().toISOString()
  if (isDemo()) {
    const message: CampusConversationMessage = { id: crypto.randomUUID(), conversation_id: conversation.id, sender_id: user.id, sender_name: user.name, sender_role: user.role, body, created_at: now }
    demoStore.setConversationMessages([...demoStore.getConversationMessages(), message])
    demoStore.setConversations(demoStore.getConversations().map(item => item.id === conversation.id ? { ...item, status: user.id === item.created_by ? 'open' : 'answered', updated_at: now } : item))
    return
  }
  const { error } = await supabase!.from('campus_conversation_messages').insert({ conversation_id: conversation.id, sender_id: user.id, body })
  if (error) throw error
  const { error: updateError } = await supabase!.from('campus_conversations').update({ status: user.id === conversation.created_by ? 'open' : 'answered', updated_at: now }).eq('id', conversation.id)
  if (updateError) throw updateError
}

export async function getMessages(userId: string): Promise<CampusMessage[]> {
  if (isDemo()) return demoStore.getMessages().filter(message => message.sender_id === userId)
  const { data, error } = await supabase!.from('campus_messages').select('*').eq('sender_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CampusMessage[]
}

export async function sendCampusMessage(user: AppUser, message: Pick<CampusMessage, 'recipient' | 'subject' | 'body' | 'priority'>): Promise<void> {
  if (isDemo()) {
    demoStore.setMessages([{ ...message, id: crypto.randomUUID(), sender_id: user.id, sender_name: user.name, created_at: new Date().toISOString(), read: false }, ...demoStore.getMessages()])
    return
  }
  const { error } = await supabase!.from('campus_messages').insert({ ...message, sender_id: user.id })
  if (error) throw error
}

export async function updatePost(postId: string, userId: string, content: string): Promise<void> {
  if (isDemo()) { demoStore.setPosts(demoStore.getPosts().map(post => post.id === postId && post.author_id === userId ? { ...post, content } : post)); return }
  const { error } = await supabase!.from('posts').update({ content, updated_at: new Date().toISOString() }).eq('id', postId).eq('author_id', userId)
  if (error) throw error
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  if (isDemo()) { demoStore.setPosts(demoStore.getPosts().filter(post => post.id !== postId || post.author_id !== userId)); return }
  const { data: existingPost, error: lookupError } = await supabase!.from('posts').select('media_url').eq('id', postId).eq('author_id', userId).maybeSingle()
  if (lookupError) throw lookupError
  const { error } = await supabase!.from('posts').delete().eq('id', postId).eq('author_id', userId)
  if (error) throw error
  if (existingPost?.media_url && !existingPost.media_url.startsWith('http')) {
    // A failed cleanup leaves an unused object, but must not undo a successful post deletion.
    await supabase!.storage.from('post-media').remove([existingPost.media_url]).catch(() => undefined)
  }
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  if (isDemo()) return demoStore.getComments().filter(comment => comment.post_id === postId)
  const { data, error } = await supabase!.from('comments').select('id,post_id,author_id,body,created_at,profiles!comments_author_id_fkey(display_name)').eq('post_id', postId).order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: any) => ({ id: row.id, post_id: row.post_id, author_id: row.author_id, body: row.body, created_at: row.created_at, author_name: row.profiles?.display_name ?? 'Anggota Kampus' })) as PostComment[]
}

export async function addPostComment(postId: string, user: AppUser, body: string): Promise<void> {
  if (isDemo()) {
    const comment: PostComment = { id: crypto.randomUUID(), post_id: postId, author_id: user.id, author_name: user.name, body, created_at: new Date().toISOString() }
    demoStore.setComments([...demoStore.getComments(), comment])
    demoStore.setPosts(demoStore.getPosts().map(post => post.id === postId ? { ...post, comments: post.comments + 1 } : post))
    return
  }
  const { error } = await supabase!.from('comments').insert({ post_id: postId, author_id: user.id, body })
  if (error) throw error
}

export async function togglePostBookmark(postId: string, userId: string): Promise<boolean> {
  if (isDemo()) {
    const post = demoStore.getPosts().find(item => item.id === postId)
    const next = !(post?.bookmarked ?? false)
    demoStore.setPosts(demoStore.getPosts().map(item => item.id === postId ? { ...item, bookmarked: next } : item))
    return next
  }
  const { data: existing, error: findError } = await supabase!.from('post_bookmarks').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle()
  if (findError) throw findError
  if (existing) {
    const { error } = await supabase!.from('post_bookmarks').delete().eq('id', existing.id)
    if (error) throw error
    return false
  }
  const { error } = await supabase!.from('post_bookmarks').insert({ post_id: postId, user_id: userId })
  if (error) throw error
  return true
}
