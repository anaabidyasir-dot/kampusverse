import { useEffect, useState, type FormEvent } from 'react'
import { BookOpen, FileText, FolderOpen, Lightbulb, Plus, Save, Search, Sparkles, StickyNote, Trash2 } from 'lucide-react'
import { PageTitle } from '../components/PageTitle'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { deleteNote, getNotes, saveNote } from '../lib/data'
import type { Note, ToastMessage } from '../types'

export function MySpacePage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() { if (user) setNotes(await getNotes(user.id)) }
  useEffect(() => { void refresh().catch(error => notify('Catatan gagal dimuat', error.message, 'error')) }, [user])
  const filtered = notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(search.toLowerCase()))
  function createNote() { setEditing(null); setTitle(''); setBody(''); setOpen(true) }
  function editNote(note: Note) { setEditing(note); setTitle(note.title); setBody(note.body); setOpen(true) }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!user || !title.trim()) return
    setBusy(true)
    try { await saveNote(user.id, { title: title.trim(), body }, editing?.id); await refresh(); setOpen(false); notify(editing ? 'Catatan diperbarui' : 'Catatan disimpan', 'Catatan hanya dapat dilihat oleh akun pemiliknya.', 'success') }
    catch (error) { notify('Catatan gagal disimpan', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
    finally { setBusy(false) }
  }
  async function remove(note: Note) {
    if (!user || !window.confirm(`Hapus catatan “${note.title}”?`)) return
    try { await deleteNote(note.id, user.id); setNotes(current => current.filter(item => item.id !== note.id)); notify('Catatan dihapus') }
    catch (error) { notify('Tidak dapat menghapus catatan', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
  }
  return <div className="page-stack">
    <div className="myspace-hero"><div className="myspace-hero-text"><div className="welcome-kicker"><Sparkles size={14} /> YOUR PERSONAL CORNER</div><h2>Make room for<br /><em>your next idea.</em></h2><p>Tempat yang tenang untuk menyimpan pemikiran, rencana, dan potongan perjalanan belajarmu.</p></div><div className="myspace-hero-art"><div className="myspace-paper paper-one"><span /><span /><span /></div><div className="myspace-paper paper-two"><Lightbulb size={28} /></div><div className="myspace-paper paper-three"><StickyNote size={23} /></div></div></div>
    <PageTitle eyebrow="PERSONAL WORKSPACE" title="My Space" description="A private space to think, plan, and create. Hanya kamu yang dapat melihat catatan ini." action={<button className="button button-primary" onClick={createNote}><Plus size={17} /> New note</button>} />
    <div className="myspace-tools"><label className="search-field"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your notes..." /></label><span><FolderOpen size={15} /> {notes.length} saved notes</span></div>
    {filtered.length ? <div className="notes-grid">{filtered.map((note, index) => <article className={`note-card note-card-${index % 4}`} key={note.id}><div className="note-card-top"><div className="note-type-icon"><FileText size={17} /></div><button className="icon-button note-delete" onClick={() => void remove(note)} aria-label="Hapus catatan"><Trash2 size={15} /></button></div><button className="note-card-content" onClick={() => editNote(note)}><h3>{note.title}</h3><p>{note.body || 'No additional content yet.'}</p></button><div className="note-card-footer"><span>{new Date(note.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span><button className="note-edit-link" onClick={() => editNote(note)}>Open note ↗</button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><StickyNote size={22} /></div><h3>{search ? 'No matching notes' : 'Your space is waiting.'}</h3><p>{search ? 'Coba kata kunci lain.' : 'Buat catatan pertama untuk menyimpan ide atau materi penting.'}</p>{!search && <button className="button button-primary" onClick={createNote}><Plus size={16} /> Create your first note</button>}</div>}
    <div className="privacy-callout"><BookOpen size={19} /><div><strong>Private by default.</strong><p>Catatan pribadi tidak ditampilkan di Community Feed. Fitur berbagi workspace dan unggah file dapat ditambahkan pada tahap berikutnya.</p></div></div>
    {open && <Modal title={editing ? 'Edit note' : 'Create a note'} onClose={() => setOpen(false)} wide><form className="modal-form" onSubmit={submit}><label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Ideas for final project" maxLength={120} required /></label><label>Your note<textarea rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Write anything worth remembering..." maxLength={10000} /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving...' : 'Save note'} <Save size={15} /></button></div></form></Modal>}
  </div>
}
