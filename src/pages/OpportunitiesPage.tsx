import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Filter, Plus, Search, ShieldCheck, Trophy } from 'lucide-react'
import { PageTitle } from '../components/PageTitle'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { getOpportunities, submitOpportunity } from '../lib/data'
import type { Opportunity, ToastMessage } from '../types'

const opportunityCategories = ['All categories', 'Hackathon', 'Beasiswa', 'Research', 'Business Plan', 'Essay', 'Internship', 'Exchange']

export function OpportunitiesPage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Opportunity[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All categories')
  const [level, setLevel] = useState('All levels')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [form, setForm] = useState({ title: '', organization: '', category: 'Hackathon', level: 'Nasional', deadline: '', description: '', apply_url: '' })
  const [busy, setBusy] = useState(false)

  async function refresh() { setItems(await getOpportunities(false)) }
  useEffect(() => { void refresh().catch(error => notify('Opportunity Hub gagal dimuat', error.message, 'error')) }, [user])
  const filtered = useMemo(() => items.filter(item => (category === 'All categories' || item.category === category) && (level === 'All levels' || item.level === level) && `${item.title} ${item.organization} ${item.description}`.toLowerCase().includes(search.toLowerCase())), [items, search, category, level])
  const daysLeft = (date: string) => Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000)

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!user) return
    if (form.apply_url && !/^https:\/\//i.test(form.apply_url)) { notify('Tautan belum valid', 'Gunakan alamat yang diawali https://', 'error'); return }
    setBusy(true)
    try { await submitOpportunity(user, form); setSubmitOpen(false); setForm({ title: '', organization: '', category: 'Hackathon', level: 'Nasional', deadline: '', description: '', apply_url: '' }); await refresh(); notify('Informasi dikirim untuk verifikasi', 'Informasi baru akan tampil setelah ditinjau administrator.', 'success') }
    catch (error) { notify('Pengajuan gagal', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
    finally { setBusy(false) }
  }

  return <div className="page-stack">
    <div className="opportunity-hero"><div><div className="welcome-kicker"><Trophy size={14} /> YOUR NEXT BIG OPPORTUNITY</div><h2>Make your ambition<br /><em>happen here.</em></h2><p>Temukan kompetisi, beasiswa, dan program yang membantumu melangkah lebih jauh.</p><button className="button button-light" onClick={() => setSubmitOpen(true)}><Plus size={16} /> Submit opportunity</button></div><div className="opportunity-hero-art"><div className="opportunity-orbit" /><div className="opportunity-trophy"><Trophy size={48} /></div><span className="opportunity-spark spark-one">✦</span><span className="opportunity-spark spark-two">✳</span></div></div>
    <PageTitle eyebrow="DISCOVER & GROW" title="Opportunity Hub" description="Peluang terkurasi untuk mengembangkan potensi akademik dan profesionalmu." action={<div className="verified-legend"><ShieldCheck size={16} /> Verified by Campus</div>} />
    <div className="opportunity-controls"><label className="search-field"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities..." /></label><label className="select-field"><Filter size={15} /><select value={category} onChange={e => setCategory(e.target.value)}>{opportunityCategories.map(item => <option key={item}>{item}</option>)}</select></label><label className="select-field"><select value={level} onChange={e => setLevel(e.target.value)}><option>All levels</option><option>Nasional</option><option>Internasional</option></select></label></div>
    <div className="opportunity-section-heading"><div><h3>Explore opportunities <span>{filtered.length}</span></h3><p>Only information reviewed by campus administrators is shown here.</p></div><button className="subtle-link" onClick={() => { setCategory('All categories'); setLevel('All levels'); setSearch('') }}>Clear filters</button></div>
    {filtered.length ? <div className="opportunity-grid">{filtered.map(item => { const left = daysLeft(item.deadline); return <article className="opportunity-card" key={item.id}><div className="opportunity-card-top"><span className="opportunity-type">{item.category}</span><span className={`deadline-status ${left <= 14 ? 'deadline-soon' : ''}`}><Clock3 size={13} /> {left > 0 ? `${left} days left` : 'Deadline passed'}</span></div><div className="opportunity-logo"><Trophy size={22} /></div><div className="opportunity-card-content"><span className="opportunity-org">{item.organization}</span><h3>{item.title}</h3><p>{item.description}</p></div><div className="opportunity-card-meta"><span><CalendarDays size={14} /> Deadline {new Date(item.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>{item.level}</span></div><div className="opportunity-card-footer"><span className="verified-label"><CheckCircle2 size={14} /> Verified by Campus</span>{item.apply_url && <a href={item.apply_url} target="_blank" rel="noreferrer" className="opportunity-apply">View details <ExternalLink size={14} /></a>}</div></article> })}</div> : <div className="empty-state"><div className="empty-icon"><Trophy size={22} /></div><h3>No opportunity found</h3><p>Belum ada peluang yang cocok dengan filter ini.</p><button className="button button-outline" onClick={() => { setCategory('All categories'); setLevel('All levels'); setSearch('') }}>Reset filters</button></div>}
    <div className="verification-note"><ShieldCheck size={18} /><div><strong>Trust, but verify.</strong><p>Badge “Verified by Campus” berarti informasi telah diperiksa oleh administrator. Selalu tinjau syarat dan tautan resmi penyelenggara sebelum mendaftar.</p></div></div>
    {submitOpen && <Modal title="Submit an opportunity" onClose={() => setSubmitOpen(false)} wide><form className="modal-form" onSubmit={submit}><div className="form-grid-two"><label>Opportunity title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nama lomba atau beasiswa" maxLength={140} /></label><label>Organizer<input required value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} placeholder="Nama penyelenggara" maxLength={100} /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{opportunityCategories.slice(1).map(item => <option key={item}>{item}</option>)}</select></label><label>Level<select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}><option>Nasional</option><option>Internasional</option></select></label><label>Deadline<input type="date" required min={new Date().toISOString().slice(0, 10)} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></label><label>Official URL<input type="url" value={form.apply_url} onChange={e => setForm({ ...form, apply_url: e.target.value })} placeholder="https://..." /></label></div><label>Description<textarea rows={4} required maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ringkasan syarat, manfaat, atau informasi penting..." /></label><div className="verification-note verification-note-small"><ShieldCheck size={17} /><p>Pengajuan berstatus <b>Pending</b> sampai administrator menyelesaikan verifikasi. Badge verified tidak diberikan otomatis.</p></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setSubmitOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Submitting...' : 'Submit for review'}</button></div></form></Modal>}
  </div>
}
