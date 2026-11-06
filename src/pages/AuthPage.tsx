import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react'
import { Brand } from '../components/Brand'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

export function AuthPage({ notify, initialMode = 'login' }: { notify: (title: string, description?: string, tone?: 'success' | 'error' | 'info') => void; initialMode?: 'login' | 'signup' }) {
  const navigate = useNavigate()
  const { signIn, signUp, demoSignIn, demoMode } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (password.length < 8) { setError('Password minimal 8 karakter.'); return }
    setBusy(true)
    try {
      if (mode === 'login') await signIn(email, password)
      else { await signUp(name, email, password); notify('Pendaftaran dikirim', 'Periksa email untuk konfirmasi akun apabila verifikasi email Supabase diaktifkan.', 'success'); setMode('login') }
    } catch (err) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.') }
    finally { setBusy(false) }
  }

  const roles: { value: Role; label: string; icon: typeof GraduationCap }[] = [
    { value: 'student', label: 'Mahasiswa', icon: GraduationCap },
    { value: 'lecturer', label: 'Dosen', icon: BookOpen },
    { value: 'admin', label: 'Admin', icon: ShieldCheck },
  ]

  return <main className="auth-screen">
    <div className="auth-visual">
      <div className="auth-visual-top"><Brand /></div>
      <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
      <div className="auth-visual-content">
        <div className="auth-pill"><Sparkles size={14} /> THE CAMPUS KNOWLEDGE NETWORK</div>
        <h1>Belajar, bertumbuh,<br /><em>dan terhubung.</em></h1>
        <p>Satu ruang untuk berbagi pengetahuan, menemukan peluang, dan membangun masa depan bersama komunitas kampus.</p>
        <div className="auth-feature-list"><span><BookOpen size={17} /> Learning ecosystem</span><span><GraduationCap size={17} /> Campus community</span><span><ShieldCheck size={17} /> Trusted opportunities</span></div>
      </div>
      <div className="auth-visual-footer">© 2026 KAMPUSVERSE · ONE CAMPUS. ONE KNOWLEDGE ECOSYSTEM.</div>
    </div>
    <section className="auth-form-area">
      <div className="auth-form-wrap">
        <div className="mobile-brand"><button className="auth-back-home" type="button" onClick={() => navigate('/')} aria-label="Kembali ke halaman utama">← Beranda</button><Brand /></div>
        <div className="auth-heading"><div className="eyebrow">WELCOME TO YOUR CAMPUSVERSE</div><h2>{mode === 'login' ? 'Selamat datang kembali' : 'Mulai perjalananmu'}</h2><p>{mode === 'login' ? 'Masuk untuk melanjutkan aktivitas akademikmu.' : 'Buat akun dan bergabung dengan komunitas kampus.'}</p></div>
        <form className="form-stack" onSubmit={submit}>
          {mode === 'signup' && <label>Nama lengkap<input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" required autoComplete="name" /></label>}
          <label>Email kampus<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@kampus.ac.id" required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 8 karakter" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? 'Memproses...' : mode === 'login' ? 'Masuk ke KAMPUSVERSE' : 'Buat akun'}<ArrowRight size={17} /></button>
        </form>
        <div className="auth-switch">{mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>{mode === 'login' ? 'Daftar sekarang' : 'Masuk'}</button></div>
        {demoMode && <div className="demo-entry"><div className="demo-divider"><span>ATAU COBA MODE DEMO</span></div><p>Demo memakai data lokal di browser. Bukan akun kampus sungguhan.</p><div className="demo-role-grid">{roles.map(({ value, label, icon: Icon }) => <button key={value} className="demo-role" onClick={() => demoSignIn(value)}><Icon size={17} /><span>{label}</span><ArrowRight size={14} /></button>)}</div></div>}
        {!demoMode && <div className="auth-secure-note"><ShieldCheck size={16} /> Autentikasi dikelola oleh Supabase.</div>}
      </div>
    </section>
  </main>
}
