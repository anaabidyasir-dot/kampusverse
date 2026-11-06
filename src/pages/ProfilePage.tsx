import { useState, type FormEvent } from 'react'
import { ArrowLeft, Camera, Save, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import type { ToastMessage } from '../types'

export function ProfilePage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [major, setMajor] = useState(user?.major ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await updateProfile({ name, major, bio }); notify('Profile updated', 'Informasi profil berhasil disimpan.', 'success') }
    catch (error) { notify('Profile gagal diperbarui', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
    finally { setBusy(false) }
  }
  return <div className="page-stack"><Link to="/" className="back-link"><ArrowLeft size={15} /> Back to overview</Link><PageTitle eyebrow="YOUR ACCOUNT" title="Profile settings" description="Kelola identitas dan informasi dasar yang ditampilkan di komunitas." /><div className="profile-settings-grid"><section className="panel profile-preview"><div className="profile-cover" /><div className="profile-avatar-large">{user?.avatar}</div><h3>{user?.name}</h3><span>{user?.role === 'admin' ? 'Administrator' : user?.role === 'lecturer' ? 'Lecturer' : user?.role === 'contributor' ? 'Contributor' : 'Student'}</span><div className="profile-preview-meta"><div><UserRound size={15} /> {user?.major}</div><div><ShieldCheck size={15} /> Campusverse member</div></div><p>{user?.bio || 'Belum ada bio. Tambahkan sedikit tentang dirimu.'}</p></section><section className="panel profile-edit-panel"><div className="panel-heading"><div><div className="eyebrow">PERSONAL INFORMATION</div><h3>Edit your profile</h3></div></div><form className="modal-form" onSubmit={submit}><div className="profile-avatar-upload"><div className="avatar avatar-indigo avatar-xl">{user?.avatar}</div><div><strong>Profile photo</strong><p>Upload foto profil akan ditambahkan bersama konfigurasi Supabase Storage.</p><button type="button" className="button button-outline button-small" onClick={() => notify('Profile photo', 'Fitur upload foto belum diaktifkan pada versi fondasi ini.', 'info')}><Camera size={14} /> Add photo</button></div></div><label>Full name<input value={name} onChange={e => setName(e.target.value)} required maxLength={80} /></label><label>Email address<input value={user?.email ?? ''} disabled /></label><label>Study program / department<input value={major} onChange={e => setMajor(e.target.value)} maxLength={100} /></label><label>About you<textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} maxLength={300} placeholder="A few words about your interests..." /></label><button className="button button-primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'} <Save size={15} /></button></form></section></div></div>
}
