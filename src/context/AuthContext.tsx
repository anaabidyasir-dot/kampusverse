import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppUser, Role } from '../types'
import { demoStore } from '../lib/demoStore'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  demoMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  demoSignIn: (role: Role) => void
  signOut: () => Promise<void>
  updateProfile: (changes: Partial<Pick<AppUser, 'name' | 'major' | 'bio'>>) => Promise<void>
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function mapProfile(authUser: any, profile: any): AppUser {
  return { id: authUser.id, name: profile?.display_name ?? authUser.user_metadata?.display_name ?? authUser.email?.split('@')[0] ?? 'Mahasiswa', email: authUser.email ?? '', role: profile?.role ?? 'student', major: profile?.major ?? 'Informatika', avatar: profile?.avatar_url ?? 'KV', bio: profile?.bio ?? '' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => hasSupabaseConfig ? null : demoStore.getUser())
  const [loading, setLoading] = useState(hasSupabaseConfig)

  useEffect(() => {
    // Copy the nullable module export into a narrowed local variable. TypeScript
    // keeps this non-null guarantee inside callbacks created below.
    const client = supabase
    if (!client) { setLoading(false); return }

    let active = true
    const loadProfile = async (authUser: any) => {
      if (!authUser) {
        if (active) setUser(null)
        return
      }
      const { data, error } = await client.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
      if (error) throw error
      if (active) setUser(mapProfile(authUser, data))
    }

    client.auth.getSession()
      .then(async ({ data }) => {
        try { await loadProfile(data.session?.user) }
        finally { if (active) setLoading(false) }
      })
      .catch(() => { if (active) setLoading(false) })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user).catch(() => { if (active) setUser(null) })
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Mode demo aktif. Gunakan tombol masuk demo, atau konfigurasi Supabase di file .env.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  const signUp = async (name: string, email: string, password: string) => {
    if (!supabase) throw new Error('Pendaftaran akun asli memerlukan konfigurasi Supabase. Mode demo tidak membuat akun kampus.')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: window.location.origin } })
    if (error) throw error
  }
  const demoSignIn = (role: Role) => {
    const labels: Record<Role, string> = { student: 'Alya Rahma', lecturer: 'Nadia Putri', admin: 'Admin Kampus', contributor: 'Rizky Ananda' }
    const nextUser: AppUser = { id: `demo-${role}`, name: labels[role], email: `${role}@kampusverse.demo`, role, major: 'Informatika', avatar: labels[role].split(' ').map(part => part[0]).slice(0, 2).join(''), bio: 'Bergabung dalam ekosistem belajar KAMPUSVERSE.' }
    setUser(nextUser); demoStore.setUser(nextUser)
  }
  const signOut = async () => {
    if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error }
    setUser(null); demoStore.setUser(null)
  }
  const updateProfile = async (changes: Partial<Pick<AppUser, 'name' | 'major' | 'bio'>>) => {
    if (!user) return
    const next = { ...user, ...changes }
    if (supabase) {
      const { error } = await supabase.from('profiles').update({ display_name: next.name, major: next.major, bio: next.bio }).eq('id', user.id)
      if (error) throw error
    } else demoStore.setUser(next)
    setUser(next)
  }

  return <AuthContext.Provider value={{ user, loading, demoMode: !hasSupabaseConfig, signIn, signUp, demoSignIn, signOut, updateProfile }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return value
}
