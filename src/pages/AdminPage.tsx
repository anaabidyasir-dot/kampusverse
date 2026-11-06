import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Check, Clock3, Eye, ShieldCheck, TrendingUp, X } from 'lucide-react'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import { getOpportunities, reviewOpportunity } from '../lib/data'
import type { Opportunity, ToastMessage } from '../types'

export function AdminPage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  async function refresh() { const data = await getOpportunities(true); setItems(data) }
  useEffect(() => { void refresh().catch(error => notify('Data admin gagal dimuat', error.message, 'error')).finally(() => setLoading(false)) }, [user])
  const pending = items.filter(item => item.status === 'pending')
  const verified = items.filter(item => item.status === 'verified')
  async function decide(item: Opportunity, status: 'verified' | 'rejected') {
    try { await reviewOpportunity(item.id, status, user?.id); setItems(current => current.map(row => row.id === item.id ? { ...row, status } : row)); notify(status === 'verified' ? 'Opportunity verified' : 'Submission rejected', status === 'verified' ? 'Informasi sekarang dapat dilihat mahasiswa.' : 'Pengajuan ditandai rejected.', status === 'verified' ? 'success' : 'info') }
    catch (error) { notify('Tindakan tidak berhasil', error instanceof Error ? error.message : 'Akses tidak diizinkan.', 'error') }
  }
  return <div className="page-stack">
    <div className="admin-hero"><div className="admin-shield"><ShieldCheck size={26} /></div><div><div className="welcome-kicker">CAMPUS OPERATIONS</div><h2>Trust is built<br /><em>through every review.</em></h2><p>Kelola pengajuan dan jaga kualitas informasi yang beredar di ekosistem kampus.</p></div><div className="admin-hero-mark">KV<span>ADMIN CONSOLE</span></div></div>
    <PageTitle eyebrow="ADMINISTRATION" title="Admin Console" description="Ringkasan moderasi dan kontrol kualitas konten KAMPUSVERSE." />
    <div className="stats-grid admin-stats"><div className="stat-card"><div className="stat-top"><span>Pending review</span><div className="stat-icon stat-orange"><Clock3 size={18} /></div></div><div className="stat-value">{pending.length}</div><small>Need your attention</small></div><div className="stat-card"><div className="stat-top"><span>Verified opportunities</span><div className="stat-icon stat-mint"><ShieldCheck size={18} /></div></div><div className="stat-value">{verified.length}</div><small>Published to students</small></div><div className="stat-card"><div className="stat-top"><span>Submissions total</span><div className="stat-icon stat-blue"><Activity size={18} /></div></div><div className="stat-value">{items.length}</div><small>All opportunity records</small></div><div className="stat-card"><div className="stat-top"><span>Review workflow</span><div className="stat-icon stat-violet"><TrendingUp size={18} /></div></div><div className="stat-value">{items.length ? Math.round(verified.length / items.length * 100) : 0}%</div><small>Verified share of submissions</small></div></div>
    <section className="panel admin-review-panel"><div className="panel-heading"><div><div className="eyebrow">CONTENT MODERATION</div><h3>Opportunity submissions</h3></div><span className="pending-counter">{pending.length} pending</span></div>
      {loading ? <div className="empty-inline">Loading submissions...</div> : pending.length ? <div className="review-list">{pending.map(item => <div className="review-item" key={item.id}><div className="review-item-icon"><Eye size={18} /></div><div className="review-item-content"><div className="review-item-meta"><span>{item.category}</span><span>Submitted {new Date(item.created_at).toLocaleDateString('id-ID')}</span></div><h4>{item.title}</h4><p>{item.description}</p><div className="review-detail-line"><strong>{item.organization}</strong><span>{item.level}</span><span>Deadline: {new Date(item.deadline).toLocaleDateString('id-ID')}</span>{item.apply_url && <a href={item.apply_url} target="_blank" rel="noreferrer">Review source <ArrowUpRight size={13} /></a>}</div></div><div className="review-actions"><button className="review-approve" onClick={() => void decide(item, 'verified')}><Check size={15} /> Verify</button><button className="review-reject" onClick={() => void decide(item, 'rejected')}><X size={15} /> Reject</button></div></div>)}</div> : <div className="history-empty"><div className="empty-icon"><Check size={20} /></div><strong>You're all caught up.</strong><p>Tidak ada pengajuan yang menunggu verifikasi.</p></div>}
    </section>
    <section className="panel"><div className="panel-heading"><div><div className="eyebrow">PUBLISHED INFORMATION</div><h3>Verified opportunities</h3></div><span className="verified-label"><ShieldCheck size={14} /> {verified.length} verified</span></div><div className="verified-table">{verified.map(item => <div className="verified-row" key={item.id}><div><strong>{item.title}</strong><span>{item.organization}</span></div><span className="verified-label"><Check size={13} /> Verified</span><small>{new Date(item.deadline).toLocaleDateString('id-ID')}</small></div>)}{!verified.length && <div className="empty-inline">No verified opportunities yet.</div>}</div></section>
    <div className="privacy-callout"><ShieldCheck size={19} /><div><strong>Administrator actions are sensitive.</strong><p>Di backend Supabase, verifikasi hanya dapat dilakukan oleh role admin melalui Row Level Security. Mengubah tampilan role di frontend saja tidak memberikan akses database.</p></div></div>
  </div>
}
