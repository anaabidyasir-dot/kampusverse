import { ArrowRight, ArrowUpRight, BookOpen, GraduationCap, MessageCircle, ShieldCheck, Sparkles, Users, Compass, Layers3, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'

const features = [
  { icon: Users, title: 'Campus Community', text: 'Diskusi, berbagi karya, dan belajar bersama mahasiswa maupun dosen.' },
  { icon: Compass, title: 'Opportunity Hub', text: 'Temukan lomba, beasiswa, magang, dan peluang pengembangan diri.' },
  { icon: BookOpen, title: 'Learning Center', text: 'Akses materi yang terstruktur dan lanjutkan belajar sesuai ritmemu.' },
  { icon: MessageCircle, title: 'Campus Connect', text: 'Bangun komunikasi yang lebih terarah dengan dosen dan layanan kampus.' },
  { icon: Layers3, title: 'My Space', text: 'Simpan catatan serta ide akademikmu dalam ruang pribadi.' },
  { icon: ShieldCheck, title: 'Role-aware access', text: 'Pengalaman berbeda untuk mahasiswa, dosen, dan pengelola kampus.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const goLogin = () => { setMenuOpen(false); navigate('/login') }
  return <main className="landing-page">
    <header className="landing-header">
      <Brand />
      <button className="landing-mobile-menu" aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <nav className={menuOpen ? 'landing-nav landing-nav-open' : 'landing-nav'} aria-label="Navigasi landing page">
        <a href="#ekosistem" onClick={() => setMenuOpen(false)}>Ekosistem</a>
        <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a>
        <a href="#peran" onClick={() => setMenuOpen(false)}>Untuk siapa</a>
        <button className="button button-outline landing-login" onClick={goLogin}>Masuk</button>
        <button className="button button-primary" onClick={goLogin}>Mulai eksplorasi <ArrowRight size={16} /></button>
      </nav>
    </header>

    <section className="landing-hero" id="ekosistem">
      <div className="landing-hero-copy">
        <div className="landing-kicker"><Sparkles size={14} /> ONE CAMPUS. ONE KNOWLEDGE ECOSYSTEM.</div>
        <h1>Kampus bukan sekadar tempat belajar. <em>Ini tempat bertumbuh.</em></h1>
        <p>KAMPUSVERSE menghubungkan komunitas akademik, pembelajaran, peluang, dan ruang berkarya dalam satu ekosistem digital.</p>
        <div className="landing-hero-actions">
          <button className="button button-primary landing-primary-cta" onClick={goLogin}>Masuk ke KAMPUSVERSE <ArrowRight size={17} /></button>
          <a className="landing-text-link" href="#fitur">Kenali fiturnya <ArrowUpRight size={16} /></a>
        </div>
        <div className="landing-trust-row"><span><ShieldCheck size={15} /> Role-based workspace</span><span><GraduationCap size={15} /> Academic-first</span><span><Users size={15} /> Built for campus</span></div>
      </div>
      <div className="landing-preview" aria-label="Ilustrasi dashboard KAMPUSVERSE">
        <div className="preview-window-top"><div className="preview-dots"><i/><i/><i/></div><span>Campus workspace</span><div className="preview-avatar">AR</div></div>
        <div className="preview-window-body">
          <div className="preview-side"><div className="preview-brand-mark">K</div><span className="preview-nav active"/><span className="preview-nav"/><span className="preview-nav"/><span className="preview-nav"/><span className="preview-nav"/></div>
          <div className="preview-content"><div className="preview-greeting"><small>MONDAY, CAMPUS LIFE</small><strong>Good morning, Alya ✦</strong><span>One step closer to your next idea.</span></div>
            <div className="preview-stats"><div><small>Learning progress</small><b>68%</b><i><span/></i></div><div><small>Community points</small><b>1,240</b><em>+12 this week</em></div></div>
            <div className="preview-section-title">Your campus activity</div>
            <div className="preview-post"><div className="preview-person">NP</div><div><b>Research sharing</b><span>Mulai riset dari pertanyaan yang dekat denganmu.</span></div></div>
            <div className="preview-course"><div className="preview-course-icon"><BookOpen size={18}/></div><div><b>Fondasi Pemrograman Web</b><span>Next lesson · HTML semantics</span></div><ArrowRight size={15}/></div>
          </div>
        </div>
        <div className="preview-floating-card"><div className="floating-icon"><MessageCircle size={17}/></div><div><b>Campus Connect</b><span>Komunikasi lebih terarah</span></div><span className="floating-status">●</span></div>
      </div>
      <div className="landing-orbit landing-orbit-one"/><div className="landing-orbit landing-orbit-two"/>
    </section>

    <section className="landing-intro" id="peran"><div><span className="eyebrow">A SHARED CAMPUS SPACE</span><h2>Satu tempat, banyak cara untuk berkembang.</h2></div><p>Dirancang untuk menyatukan kebutuhan mahasiswa dan akademisi tanpa membuat aktivitas kampus terasa semakin rumit.</p></section>

    <section className="landing-features" id="fitur"><div className="landing-section-heading"><span className="eyebrow">EXPLORE THE ECOSYSTEM</span><h2>Semua hal penting, saling terhubung.</h2><p>Mulai dari menemukan teman diskusi hingga membuka materi pembelajaran.</p></div><div className="landing-feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="landing-feature-card" key={title}><div className={`landing-feature-icon landing-feature-${index}`}><Icon size={21}/></div><h3>{title}</h3><p>{text}</p><span className="feature-number">0{index + 1}</span></article>)}</div></section>

    <section className="landing-roles"><div><span className="eyebrow">MADE FOR CAMPUS LIFE</span><h2>Setiap peran punya ruangnya.</h2><p>Pengalaman dan izin akses disesuaikan dengan tanggung jawab pengguna di lingkungan kampus.</p></div><div className="landing-role-list"><div><GraduationCap size={20}/><span><b>Mahasiswa</b><small>Belajar, berdiskusi, mencari peluang, dan mengelola ruang pribadi.</small></span></div><div><BookOpen size={20}/><span><b>Dosen</b><small>Berbagi materi dan menjawab pertanyaan mahasiswa.</small></span></div><div><ShieldCheck size={20}/><span><b>Administrator</b><small>Memoderasi konten dan menjaga kualitas informasi platform.</small></span></div></div></section>

    <section className="landing-cta"><div className="landing-cta-icon"><Sparkles size={22}/></div><div><span className="eyebrow">YOUR CAMPUSVERSE STARTS HERE</span><h2>Temukan ruang untuk ide berikutnya.</h2><p>Masuk untuk menjelajahi ruang belajar dan komunitas KAMPUSVERSE.</p></div><button className="button button-light" onClick={goLogin}>Jelajahi sekarang <ArrowRight size={17}/></button></section>
    <footer className="landing-footer"><Brand/><span>© 2026 KAMPUSVERSE · ONE KNOWLEDGE ECOSYSTEM</span><button onClick={goLogin}>Masuk ke workspace <ArrowUpRight size={14}/></button></footer>
  </main>
}
