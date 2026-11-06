import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, FileText, FileUp, GraduationCap, Plus, Search, Sparkles, X } from 'lucide-react'
import { PageTitle } from '../components/PageTitle'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { createCourseLesson, getCompletedLessonIds, getCourseLessons, getCourses, markLessonComplete, updateCourseProgress } from '../lib/data'
import type { Course, CourseLesson, ToastMessage } from '../types'

const learningCategories = ['All topics', 'Informatika', 'Computer Science', 'Mathematics', 'Academic Writing']

type ReaderMobileView = 'list' | 'content'

export function LearningPage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [category, setCategory] = useState('All topics')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [readerMobileView, setReaderMobileView] = useState<ReaderMobileView>('list')

  const canManageMaterials = user?.role === 'lecturer' || user?.role === 'admin'
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorCourseId, setEditorCourseId] = useState('')
  const [editorTitle, setEditorTitle] = useState('')
  const [editorBody, setEditorBody] = useState('')
  const [editorMinutes, setEditorMinutes] = useState('10')
  const [editorPdf, setEditorPdf] = useState<File | null>(null)
  const [savingLesson, setSavingLesson] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    getCourses(user.id).then(result => {
      if (!active) return
      setCourses(result)
      setEditorCourseId(current => current || result[0]?.id || '')
    }).catch(error => notify('Materi gagal dimuat', error.message, 'error'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, notify])

  const filtered = useMemo(() => courses.filter(course => (category === 'All topics' || course.category === category) && `${course.title} ${course.description}`.toLowerCase().includes(search.toLowerCase())), [courses, category, search])
  const totalDone = courses.filter(course => course.progress >= 100).length
  const activeLesson = lessons.find(lesson => lesson.id === activeLessonId) ?? lessons[0] ?? null
  const activeLessonIndex = activeLesson ? lessons.findIndex(lesson => lesson.id === activeLesson.id) : -1
  const previousLesson = activeLessonIndex > 0 ? lessons[activeLessonIndex - 1] : null
  const nextLesson = activeLessonIndex >= 0 ? lessons[activeLessonIndex + 1] ?? null : null

  async function openCourse(course: Course) {
    if (!user) return
    setSelected(course)
    setReaderMobileView('list')
    setLessonLoading(true)
    setLessons([])
    setCompletedLessonIds([])
    setActiveLessonId(null)
    try {
      const items = await getCourseLessons(course.id)
      const completed = await getCompletedLessonIds(user.id, items.map(item => item.id))
      setLessons(items)
      setCompletedLessonIds(completed)
      setActiveLessonId(items[0]?.id ?? null)
    } catch (error) {
      notify('Materi belum dapat dibuka', error instanceof Error ? error.message : 'Coba lagi.', 'error')
    } finally { setLessonLoading(false) }
  }

  async function completeLesson(lesson: CourseLesson) {
    if (!user || !selected) return
    if (completedLessonIds.includes(lesson.id)) { notify('Materi sudah selesai', 'Kamu sudah menandai lesson ini selesai.', 'info'); return }
    try {
      await markLessonComplete(user.id, lesson.id)
      const nextCompleted = [...completedLessonIds, lesson.id]
      setCompletedLessonIds(nextCompleted)
      const next = Math.max(selected.progress, Math.round((nextCompleted.length / Math.max(lessons.length, 1)) * 100))
      await updateCourseProgress(selected.id, user.id, next)
      const updated = { ...selected, progress: next }
      setSelected(updated)
      setCourses(current => current.map(item => item.id === selected.id ? updated : item))
      notify(nextCompleted.length === lessons.length ? 'Course selesai!' : 'Progress belajar tersimpan', `${next}% complete`, 'success')
    } catch (error) {
      notify('Progress gagal disimpan', error instanceof Error ? error.message : 'Coba lagi.', 'error')
    }
  }

  function openMaterialEditor() {
    setEditorCourseId(courses[0]?.id ?? '')
    setEditorTitle('')
    setEditorBody('')
    setEditorMinutes('10')
    setEditorPdf(null)
    setEditorOpen(true)
  }

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !editorCourseId) return
    if (!editorBody.trim() && !editorPdf) {
      notify('Isi materi belum ada', 'Tulis materi atau pilih lampiran PDF terlebih dahulu.', 'error')
      return
    }
    setSavingLesson(true)
    try {
      await createCourseLesson(user, {
        courseId: editorCourseId,
        title: editorTitle,
        body: editorBody,
        estimatedMinutes: Number(editorMinutes) || 10,
        pdf: editorPdf,
      })
      const refreshed = await getCourses(user.id)
      setCourses(refreshed)
      setEditorOpen(false)
      notify('Materi berhasil ditambahkan', 'Mahasiswa dapat membukanya dari course yang dipilih.', 'success')
    } catch (error) {
      notify('Materi gagal disimpan', error instanceof Error ? error.message : 'Periksa koneksi dan coba lagi.', 'error')
    } finally { setSavingLesson(false) }
  }

  function selectLesson(lesson: CourseLesson) {
    setActiveLessonId(lesson.id)
    setReaderMobileView('content')
  }

  return <div className="page-stack">
    <div className="learning-hero">
      <div className="learning-hero-copy">
        <div className="welcome-kicker"><Sparkles size={14} /> KNOWLEDGE NEVER STOPS</div>
        <h2>Learn at your pace.<br /><em>Grow on your terms.</em></h2>
        <p>Bangun skill baru melalui materi terstruktur yang dirancang untuk perjalanan akademikmu.</p>
      </div>
      <div className="learning-hero-stats">
        <div><strong>{courses.length}</strong><span>Learning paths</span></div>
        <div><strong>{totalDone}</strong><span>Completed</span></div>
        <div><strong>{courses.reduce((a, b) => a + b.lessons, 0)}</strong><span>Total lessons</span></div>
      </div>
    </div>

    <PageTitle
      eyebrow="YOUR KNOWLEDGE LIBRARY"
      title="Learning Center"
      description="Pilih course untuk membaca materi dan menyimpan progres belajarmu."
      action={canManageMaterials ? <button className="button button-primary" onClick={openMaterialEditor}><Plus size={16} /> Tambah materi</button> : undefined}
    />

    <div className="learning-toolbar">
      <label className="search-field"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari course atau topik..." /></label>
      <div className="filter-tabs">{learningCategories.map(item => <button key={item} className={category === item ? 'filter-tab filter-active' : 'filter-tab'} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </div>

    {loading && <div className="empty-state"><BookOpen size={22}/><p>Memuat katalog pembelajaran...</p></div>}
    <div className="course-grid">
      {filtered.map(course => <article className="course-card" key={course.id}>
        <div className={`course-card-art course-${course.color}`}><div className="course-card-art-icon"><BookOpen size={25} /></div><span className="course-level">{course.level}</span><div className="course-art-lines" /></div>
        <div className="course-card-body">
          <div className="course-card-meta"><span>{course.category}</span><span><Clock3 size={13} /> {course.duration}</span></div>
          <h3>{course.title}</h3><p>{course.description}</p>
          <div className="course-instructor"><div className="avatar avatar-tiny">{course.instructor.split(' ').slice(0, 2).map(word => word[0]).join('')}</div><span>{course.instructor}</span></div>
          <div className="course-progress-row"><div className="compact-progress"><span style={{ width: `${course.progress}%` }} /></div><strong>{course.progress}%</strong></div>
          <button className="button button-primary button-full" onClick={() => void openCourse(course)}><BookOpen size={16}/> {course.progress === 0 ? 'Buka materi' : course.progress === 100 ? 'Pelajari ulang' : 'Lanjutkan belajar'} <ArrowRight size={15} /></button>
        </div>
      </article>)}
    </div>
    {!filtered.length && !loading && <div className="empty-state"><div className="empty-icon"><BookOpen size={22} /></div><h3>Course tidak ditemukan</h3><p>Ganti kata kunci atau kategori untuk menemukan materi.</p></div>}
    <div className="learning-note"><GraduationCap size={20} /><div><strong>Learning is a journey, not a race.</strong><p>Progress disimpan per akun. Badge penyelesaian merupakan pencapaian belajar, bukan nilai akademik resmi.</p></div></div>

    {selected && <div className="modal-backdrop learning-reader-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}>
      <section className="modal-panel course-detail-modal course-reader-modal" role="dialog" aria-modal="true" aria-label={`Materi ${selected.title}`}>
        <div className="modal-heading">
          <div className="course-reader-heading-copy"><div className="eyebrow">LEARNING PATH · {selected.category.toUpperCase()}</div><h2>{selected.title}</h2><p className="course-reader-subtitle">{selected.progress}% progres tersimpan · {lessons.length} materi tersedia</p></div>
          <button className="icon-button" onClick={() => setSelected(null)} aria-label="Tutup materi"><X size={19}/></button>
        </div>
        {lessonLoading ? <div className="lesson-loading"><span className="loading-orbit"><BookOpen size={20}/></span>Memuat materi pembelajaran...</div> : !lessons.length ? <div className="lesson-empty"><BookOpen size={25}/><h3>Materi belum tersedia</h3><p>Course ini belum memiliki lesson yang dapat dibuka. Dosen dapat menambahkan materi lewat tombol Tambah Materi.</p></div> : <div className={`course-reader-layout ${readerMobileView === 'list' ? 'reader-mobile-list' : 'reader-mobile-content'}`}>
          <aside className="lesson-list-panel">
            <div className="lesson-list-title">DAFTAR MATERI <span>{lessons.length} LESSON</span></div>
            {lessons.map(lesson => <button key={lesson.id} className={`lesson-list-item ${activeLesson?.id === lesson.id ? 'lesson-list-active' : ''}`} onClick={() => selectLesson(lesson)}>
              <span className={`lesson-list-number ${completedLessonIds.includes(lesson.id) ? 'lesson-number-done' : ''}`}>{completedLessonIds.includes(lesson.id) ? <CheckCircle2 size={15}/> : String(lesson.position).padStart(2, '0')}</span>
              <span className="lesson-list-copy"><strong>{lesson.title}</strong><small><Clock3 size={12}/> {lesson.estimated_minutes} menit · {completedLessonIds.includes(lesson.id) ? 'Selesai' : lesson.pdf_name ? 'Ada PDF' : 'Belum selesai'}</small></span>
              <ArrowRight size={16}/>
            </button>)}
          </aside>

          <article className="lesson-reader-content">
            {activeLesson && <>
              <button className="lesson-back-to-list" onClick={() => setReaderMobileView('list')}><ArrowLeft size={15}/> Daftar materi</button>
              <div className="lesson-reader-meta"><span>MATERI {activeLesson.position} DARI {lessons.length}</span><span>{activeLesson.estimated_minutes} MENIT</span></div>
              <h3>{activeLesson.title}</h3>
              <div className="lesson-body">
                {activeLesson.body ? activeLesson.body.split('\n\n').map((paragraph, index) => <p key={`${activeLesson.id}-${index}`}>{paragraph}</p>) : <p>Materi teks belum ditambahkan. Buka lampiran PDF untuk membaca materi lengkap.</p>}
              </div>
              {activeLesson.pdf_url && <div className="lesson-pdf-attachment"><div className="lesson-pdf-icon"><FileText size={20}/></div><div className="lesson-pdf-copy"><strong>{activeLesson.pdf_name || 'Lampiran materi.pdf'}</strong><span>Dokumen PDF · Lampiran dosen</span></div><a className="button button-outline" href={activeLesson.pdf_url} target="_blank" rel="noreferrer">Buka PDF <ArrowRight size={14}/></a></div>}
              <div className="lesson-reader-footer">
                <button className="button button-outline" disabled={!previousLesson} onClick={() => { if (previousLesson) selectLesson(previousLesson) }}><ArrowLeft size={15}/> Sebelumnya</button>
                <button className="button button-primary" disabled={completedLessonIds.includes(activeLesson.id)} onClick={() => void completeLesson(activeLesson)}><CheckCircle2 size={15}/> {completedLessonIds.includes(activeLesson.id) ? 'Materi selesai' : 'Tandai selesai'}</button>
              </div>
              <button className="lesson-next-link" onClick={() => { if (nextLesson) selectLesson(nextLesson) }} disabled={!nextLesson}>Materi berikutnya <ArrowRight size={14}/></button>
            </>}
          </article>
        </div>}
      </section>
    </div>}

    {editorOpen && <Modal title="Tambah materi pembelajaran" onClose={() => setEditorOpen(false)} wide>
      <form className="modal-form lesson-author-form" onSubmit={saveMaterial}>
        <div className="lesson-author-intro"><div className="lesson-author-icon"><GraduationCap size={20}/></div><p>Tulis materi langsung di editor, unggah PDF, atau gunakan keduanya dalam satu lesson.</p></div>
        <label>Course tujuan
          <select value={editorCourseId} onChange={event => setEditorCourseId(event.target.value)} required>
            {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <div className="lesson-author-field-grid">
          <label>Judul materi<input value={editorTitle} onChange={event => setEditorTitle(event.target.value)} minLength={3} maxLength={140} required placeholder="Contoh: Pengenalan React" /></label>
          <label>Estimasi waktu (menit)<input type="number" min="1" max="240" value={editorMinutes} onChange={event => setEditorMinutes(event.target.value)} required /></label>
        </div>
        <label>Isi materi <span className="field-optional">(opsional bila mengunggah PDF)</span>
          <textarea className="lesson-author-textarea" rows={8} value={editorBody} onChange={event => setEditorBody(event.target.value)} maxLength={30000} placeholder="Tulis penjelasan, langkah-langkah, contoh, atau rangkuman materi di sini..." />
          <small className="lesson-editor-hint">Gunakan baris kosong untuk memisahkan paragraf. Maksimal 30.000 karakter.</small>
        </label>
        <div className="lesson-pdf-upload">
          <div><strong><FileUp size={17}/> Lampiran PDF</strong><span>Format PDF saja · maksimal 20 MB</span></div>
          <label className="lesson-pdf-pick">{editorPdf ? 'Ganti PDF' : 'Pilih file PDF'}<input type="file" accept="application/pdf,.pdf" onChange={event => setEditorPdf(event.target.files?.[0] ?? null)} /></label>
          {editorPdf && <div className="lesson-pdf-selected"><FileText size={17}/><span>{editorPdf.name}<small>{(editorPdf.size / (1024 * 1024)).toFixed(2)} MB</small></span><button type="button" className="icon-button" onClick={() => setEditorPdf(null)} aria-label="Hapus lampiran"><X size={16}/></button></div>}
        </div>
        <div className="lesson-author-footer"><span>Materi akan ditambahkan sebagai lesson baru di bagian akhir course.</span><div><button type="button" className="button button-outline" onClick={() => setEditorOpen(false)}>Batal</button><button className="button button-primary" disabled={savingLesson || !editorCourseId || !editorTitle.trim() || (!editorBody.trim() && !editorPdf)}>{savingLesson ? 'Menyimpan...' : 'Simpan materi'} <CheckCircle2 size={15}/></button></div></div>
      </form>
    </Modal>}
  </div>
}
