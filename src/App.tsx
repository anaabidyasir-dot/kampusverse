import { useCallback, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, ChevronDown, Compass, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, Search, Settings2, ShieldCheck, Sparkles, Sun, UserRound, Users } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { FeedPage } from './pages/FeedPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { LearningPage } from './pages/LearningPage'
import { ConnectPage } from './pages/ConnectPage'
import { MySpacePage } from './pages/MySpacePage'
import { AdminPage } from './pages/AdminPage'
import { ProfilePage } from './pages/ProfilePage'
import { LandingPage } from './pages/LandingPage'
import { ToastViewport } from './components/Toast'
import { Brand } from './components/Brand'
import type { ToastMessage } from './types'
import './styles.css'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/community', label: 'Community Feed', icon: Users },
  { to: '/opportunities', label: 'Opportunity Hub', icon: Compass },
  { to: '/learning', label: 'Learning Center', icon: BookOpen },
  { to: '/connect', label: 'Campus Connect', icon: MessageCircle },
  { to: '/my-space', label: 'My Space', icon: Sparkles },
]

function AppShell({ notify, toastItems, dismissToast }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void; toastItems: ToastMessage[]; dismissToast: (id: number) => void }) {
  const { user, loading, demoMode, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const activeLabel = navItems.find(item => item.to === location.pathname)?.label ?? (location.pathname === '/admin' ? 'Admin Console' : 'Profile')

  if (loading) return <div className="loading-screen"><div className="loading-orbit"><Sparkles size={24} /></div><span>Menyiapkan ruang belajarmu...</span></div>
  if (!user) return <Routes><Route path="/login" element={<AuthPage notify={notify} />} /><Route path="/signup" element={<AuthPage notify={notify} initialMode="signup" />} /><Route path="*" element={<LandingPage />} /></Routes>

  const logout = async () => { try { await signOut(); navigate('/'); notify('Kamu telah keluar', 'Sampai jumpa di KAMPUSVERSE.', 'success') } catch (error) { notify('Gagal keluar', error instanceof Error ? error.message : 'Coba lagi.', 'error') } }

  return <div className={`app-frame ${dark ? 'theme-dark' : ''}`}>
    {mobileOpen && <button className="mobile-scrim" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Brand /></div>
      <div className="workspace-switch"><div className="workspace-logo">K</div><div><strong>Campus Workspace</strong><span>Academic community</span></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="main-nav" aria-label="Navigasi utama">
        {navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="nav-caption nav-caption-bottom">MANAGEMENT</div>
      {user.role === 'admin' && <nav className="main-nav"><NavLink to="/admin" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><ShieldCheck size={18} /><span>Admin Console</span></NavLink></nav>}
      <div className="sidebar-spacer" />
      <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={16} /></div><strong>Keep growing.</strong><p>Small steps today, meaningful progress tomorrow.</p><NavLink to="/learning">Explore learning <span>↗</span></NavLink></div>
      <div className="sidebar-profile"><div className="avatar avatar-indigo">{user.avatar}</div><div className="sidebar-user"><strong>{user.name}</strong><span>{user.role === 'admin' ? 'Administrator' : user.role === 'lecturer' ? 'Lecturer' : user.role === 'contributor' ? 'Contributor' : 'Student'}</span></div><button className="icon-button" onClick={() => setProfileOpen(!profileOpen)} aria-label="Menu akun"><Settings2 size={17} /></button></div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu-button" aria-label="Buka menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeLabel}</strong></div></div>
        <div className="topbar-actions"><div className="search-box"><Search size={16} /><input aria-label="Cari di KAMPUSVERSE" placeholder="Search anything..." onKeyDown={e => { if (e.key === 'Enter') { navigate('/community'); notify('Pencarian komunitas', 'Kamu dapat mencari postingan melalui filter di halaman Community Feed.', 'info') } }} /></div><button className="icon-button topbar-icon" aria-label="Ubah tema" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button topbar-icon notification-button" aria-label="Notifikasi" onClick={() => notify('All caught up!', 'Belum ada notifikasi baru.', 'info')}><Bell size={18} /></button><div className="topbar-divider" /><button className="user-menu-button" onClick={() => setProfileOpen(!profileOpen)}><div className="avatar avatar-indigo avatar-small">{user.avatar}</div><ChevronDown size={15} /></button>
          {profileOpen && <div className="profile-popover"><div className="popover-user"><strong>{user.name}</strong><span>{user.email}</span></div><button onClick={() => { setProfileOpen(false); navigate('/profile') }}><UserRound size={16} /> Edit profile</button><button onClick={logout}><LogOut size={16} /> Sign out</button></div>}
        </div>
      </header>
      {demoMode && <div className="demo-banner"><span className="demo-banner-dot" /> DEMO MODE <span>Data tersimpan di browser ini saja — belum terhubung ke server kampus.</span></div>}
      <main className="content-area">
        <Routes>
          <Route path="/" element={<DashboardPage notify={notify} />} />
          <Route path="/community" element={<FeedPage notify={notify} />} />
          <Route path="/opportunities" element={<OpportunitiesPage notify={notify} />} />
          <Route path="/learning" element={<LearningPage notify={notify} />} />
          <Route path="/connect" element={<ConnectPage notify={notify} />} />
          <Route path="/my-space" element={<MySpacePage notify={notify} />} />
          <Route path="/admin" element={user.role === 'admin' ? <AdminPage notify={notify} /> : <Navigate to="/" replace />} />
          <Route path="/profile" element={<ProfilePage notify={notify} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="app-footer"><span>© 2026 KAMPUSVERSE</span><span>Built for curious minds <span className="footer-heart">✦</span></span><a href="mailto:hello@kampusverse.example">Help & feedback</a></footer>
    </div>
    <ToastViewport items={toastItems} dismiss={dismissToast} />
  </div>
}

function AppRoot() {
  const [items, setItems] = useState<ToastMessage[]>([])
  const notify = useCallback((title: string, description?: string, tone: ToastMessage['tone'] = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems(current => [...current, { id, title, description, tone }])
    window.setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 4200)
  }, [])
  const dismissToast = useCallback((id: number) => setItems(current => current.filter(item => item.id !== id)), [])

  return <AuthProvider><BrowserRouter><AppShell notify={notify} toastItems={items} dismissToast={dismissToast} /></BrowserRouter></AuthProvider>
}

export default AppRoot
