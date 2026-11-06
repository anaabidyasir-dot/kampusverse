import type { AppUser, CampusConversation, CampusConversationMessage, CampusMessage, Course, CourseLesson, Note, Opportunity, Post, PostComment, Role } from '../types'

const keys = {
  posts: 'kv_posts_v1', opportunities: 'kv_opportunities_v1', notes: 'kv_notes_v1',
  messages: 'kv_messages_v1', conversations: 'kv_conversations_v1', conversationMessages: 'kv_conversation_messages_v1', lessonProgress: 'kv_lesson_progress_v1', customLessons: 'kv_custom_lessons_v1', courses: 'kv_courses_v1', comments: 'kv_comments_v1', user: 'kv_demo_user_v1', progress: 'kv_progress_v1',
}

const demoPosts: Post[] = [
  { id: 'p1', author_id: 'u2', author_name: 'Nadia Putri', author_role: 'lecturer', author_avatar: 'NP', category: 'Knowledge', content: 'Sedikit catatan tentang cara memulai riset: jangan buru-buru mencari topik yang “besar”. Mulailah dari masalah kecil yang benar-benar kamu temui, baca 3–5 paper terbaru, lalu catat celah yang belum terjawab. Konsistensi membaca jauh lebih penting daripada menumpuk bookmark.', created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(), likes: 28, comments: 6, liked: false },
  { id: 'p2', author_id: 'u3', author_name: 'Rizky Ananda', author_role: 'student', author_avatar: 'RA', category: 'Project Showcase', content: 'Akhirnya menyelesaikan prototype aplikasi pencatat sampah digital untuk tugas HCI. Insight paling menarik: pengguna lebih nyaman dengan pilihan kategori yang singkat daripada form panjang. Next step: uji coba ke 5 pengguna lagi. Feedback sangat terbuka!', created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), likes: 19, comments: 4, liked: true },
  { id: 'p3', author_id: 'u4', author_name: 'Dimas Fajar', author_role: 'student', author_avatar: 'DF', category: 'Discussion', content: 'Teman-teman Informatika, ada rekomendasi sumber belajar struktur data yang penjelasannya visual dan cocok untuk pemula? Aku sedang mencoba memahami linked list dan tree. Boleh sharing pengalaman belajar kalian 🙌', created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), likes: 12, comments: 9 },
]

const demoOpportunities: Opportunity[] = [
  { id: 'o1', title: 'Gemastik 2027 — Kompetisi TIK Mahasiswa', organization: 'Pusat Prestasi Nasional', category: 'Hackathon', level: 'Nasional', deadline: '2027-02-20', description: 'Kompetisi pengembangan solusi teknologi informasi untuk mahasiswa perguruan tinggi.', apply_url: 'https://puspresnas.kemdikbud.go.id/', status: 'verified', created_at: new Date().toISOString(), submitted_by: 'system' },
  { id: 'o2', title: 'Beasiswa Talenta Digital', organization: 'Program Beasiswa Digital', category: 'Beasiswa', level: 'Nasional', deadline: '2027-01-15', description: 'Dukungan pembelajaran dan pengembangan kompetensi digital bagi mahasiswa aktif.', apply_url: 'https://example.com', status: 'verified', created_at: new Date().toISOString(), submitted_by: 'system' },
  { id: 'o3', title: 'Student Research Paper Challenge', organization: 'Academic Research Network', category: 'Research', level: 'Internasional', deadline: '2027-03-10', description: 'Kesempatan mempresentasikan ide riset mahasiswa dalam forum akademik.', apply_url: 'https://example.com', status: 'pending', created_at: new Date().toISOString(), submitted_by: 'u3' },
]

const demoCourses: Course[] = [
  { id: 'c1', title: 'Fondasi Pemrograman Web', category: 'Informatika', level: 'Pemula', duration: '4 jam', lessons: 8, description: 'Belajar HTML, CSS, dan JavaScript dari konsep dasar sampai membuat halaman interaktif.', instructor: 'Tim KAMPUSVERSE', progress: 62, color: 'violet' },
  { id: 'c2', title: 'Logika & Berpikir Komputasional', category: 'Computer Science', level: 'Pemula', duration: '3 jam', lessons: 6, description: 'Melatih cara memecah masalah, mengenali pola, dan menyusun algoritma sederhana.', instructor: 'Nadia Putri, M.Kom.', progress: 25, color: 'mint' },
  { id: 'c3', title: 'Matematika Diskrit untuk Informatika', category: 'Mathematics', level: 'Menengah', duration: '5 jam', lessons: 10, description: 'Mengenal himpunan, relasi, fungsi, logika proposisional, dan graf.', instructor: 'Bima Pratama, M.Si.', progress: 0, color: 'orange' },
  { id: 'c4', title: 'Academic Writing Essentials', category: 'Academic Writing', level: 'Pemula', duration: '2 jam', lessons: 5, description: 'Menyusun paragraf akademik, sitasi dasar, dan struktur tulisan ilmiah.', instructor: 'Academic Skills Center', progress: 0, color: 'blue' },
]

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}
function write<T>(key: string, value: T): void { localStorage.setItem(key, JSON.stringify(value)) }

export const demoStore = {
  getUser: () => read<AppUser | null>(keys.user, null),
  setUser: (user: AppUser | null) => user ? write(keys.user, user) : localStorage.removeItem(keys.user),
  getPosts: () => read<Post[]>(keys.posts, demoPosts),
  setPosts: (value: Post[]) => write(keys.posts, value),
  getOpportunities: () => read<Opportunity[]>(keys.opportunities, demoOpportunities),
  setOpportunities: (value: Opportunity[]) => write(keys.opportunities, value),
  getCourses: () => read<Course[]>(keys.courses, demoCourses),
  setCourses: (value: Course[]) => write(keys.courses, value),
  getNotes: () => read<Note[]>(keys.notes, []),
  setNotes: (value: Note[]) => write(keys.notes, value),
  getMessages: () => read<CampusMessage[]>(keys.messages, []),
  setMessages: (value: CampusMessage[]) => write(keys.messages, value),
  getConversations: () => read<CampusConversation[]>(keys.conversations, []),
  setConversations: (value: CampusConversation[]) => write(keys.conversations, value),
  getConversationMessages: () => read<CampusConversationMessage[]>(keys.conversationMessages, []),
  setConversationMessages: (value: CampusConversationMessage[]) => write(keys.conversationMessages, value),
  getComments: () => read<PostComment[]>(keys.comments, []),
  setComments: (value: PostComment[]) => write(keys.comments, value),
  getProgress: () => read<Record<string, number>>(keys.progress, {}),
  setProgress: (value: Record<string, number>) => write(keys.progress, value),
  getLessonProgress: () => read<string[]>(keys.lessonProgress, []),
  setLessonProgress: (value: string[]) => write(keys.lessonProgress, value),
  getCustomLessons: () => read<CourseLesson[]>(keys.customLessons, []),
  setCustomLessons: (value: CourseLesson[]) => write(keys.customLessons, value),
}

export const roleLabel: Record<Role, string> = { student: 'Mahasiswa', lecturer: 'Dosen', admin: 'Administrator', contributor: 'Kontributor' }
