import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, GraduationCap, Mail, MessageCircle, Plus, Search, Send, ShieldCheck } from 'lucide-react'
import { PageTitle } from '../components/PageTitle'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { createCampusConversation, getCampusContacts, getCampusConversations, sendCampusReply } from '../lib/data'
import type { CampusContact, CampusConversation, ToastMessage } from '../types'

const contactIcon = (role: string) => role === 'lecturer' ? GraduationCap : ShieldCheck
const roleTitle = (role: string) => role === 'lecturer' ? 'Dosen' : role === 'admin' ? 'Administrator kampus' : 'Anggota kampus'

export function ConnectPage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<CampusContact[]>([])
  const [conversations, setConversations] = useState<CampusConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newContact, setNewContact] = useState<CampusContact | null>(null)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newPriority, setNewPriority] = useState<'normal' | 'high'>('normal')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [conversationQuery, setConversationQuery] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const conversationListRef = useRef<HTMLElement>(null)

  async function refresh() {
    if (!user) return
    const [threadItems, people] = await Promise.all([getCampusConversations(user), getCampusContacts()])
    setConversations(threadItems)
    setContacts(people)
    setSelectedId(current => current && threadItems.some(item => item.id === current) ? current : threadItems[0]?.id ?? null)
  }

  useEffect(() => {
    let active = true
    if (user) Promise.all([getCampusConversations(user), getCampusContacts()])
      .then(([threadItems, people]) => { if (active) { setConversations(threadItems); setContacts(people); setSelectedId(threadItems[0]?.id ?? null) } })
      .catch(error => notify('Campus Connect gagal dimuat', error instanceof Error ? error.message : 'Coba lagi.', 'error'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, notify])

  // Poll the inbox while this view is open so replies from another role appear without a manual reload.
  useEffect(() => {
    if (!user) return
    const interval = window.setInterval(() => {
      void getCampusConversations(user).then(setConversations).catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(interval)
  }, [user])

  const isStaff = user?.role === 'lecturer' || user?.role === 'admin'
  const title = isStaff ? (user?.role === 'admin' ? 'Campus Support Inbox' : 'Student Messages') : 'Campus Connect'
  const selectedConversation = useMemo(() => conversations.find(item => item.id === selectedId) ?? null, [conversations, selectedId])
  const visibleConversations = useMemo(() => {
    const query = conversationQuery.trim().toLocaleLowerCase('id-ID')
    if (!query) return conversations
    return conversations.filter(item => {
      const participant = isStaff ? item.created_by_name : item.recipient_name
      const lastMessage = item.messages[item.messages.length - 1]?.body ?? ''
      return [participant, item.subject, lastMessage].some(value => value.toLocaleLowerCase('id-ID').includes(query))
    })
  }, [conversations, conversationQuery, isStaff])

  useEffect(() => {
    const messageList = messagesRef.current
    if (messageList) messageList.scrollTop = messageList.scrollHeight
  }, [selectedConversation?.id, selectedConversation?.messages.length])

  function backToInbox() {
    setMobileChatOpen(false)
    window.requestAnimationFrame(() => {
      conversationListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function startConversation(contact: CampusContact) {
    setNewContact(contact)
    setNewSubject('')
    setNewBody('')
    setNewPriority('normal')
  }

  async function createThread(event: FormEvent) {
    event.preventDefault()
    if (!user || !newContact || !newSubject.trim() || !newBody.trim()) return
    setBusy(true)
    try {
      const id = await createCampusConversation(user, newContact, newSubject.trim(), newBody.trim(), newPriority)
      await refresh()
      setSelectedId(id)
      setReply('')
      setMobileChatOpen(true)
      setNewContact(null)
      notify('Percakapan dibuat', `Pesan terkirim ke ${newContact.name}. Balasan akan muncul dalam thread yang sama.`, 'success')
    } catch (error) {
      notify('Pesan belum terkirim', error instanceof Error ? error.message : 'Coba lagi.', 'error')
    } finally { setBusy(false) }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault()
    if (!user || !selectedConversation || !reply.trim()) return
    setBusy(true)
    try {
      await sendCampusReply(user, selectedConversation, reply.trim())
      setReply('')
      await refresh()
      setSelectedId(selectedConversation.id)
      notify('Balasan terkirim', 'Pesan ditambahkan ke percakapan ini.', 'success')
    } catch (error) {
      notify('Balasan gagal dikirim', error instanceof Error ? error.message : 'Coba lagi.', 'error')
    } finally { setBusy(false) }
  }

  return <div className={`page-stack connect-page ${mobileChatOpen ? 'connect-page--chat-open' : ''}`}>
    <div className="connect-hero"><div className="connect-hero-icon"><MessageCircle size={27} /></div><div><div className="welcome-kicker">CAMPUS, WITH YOU</div><h2>{isStaff ? <>A better campus<br/><em>starts with listening.</em></> : <>Good communication<br/><em>opens every door.</em></>}</h2><p>{isStaff ? 'Baca pesan mahasiswa dan berikan jawaban dalam percakapan yang sama.' : 'Hubungi dosen atau pengelola kampus, lalu lanjutkan diskusi melalui chat.'}</p></div><div className="connect-hero-art"><div className="connect-bubble bubble-a"><Mail size={18} /></div><div className="connect-bubble bubble-b"><MessageCircle size={18} /></div><div className="connect-bubble bubble-c"><CheckCircle2 size={18} /></div></div></div>

    <PageTitle eyebrow="CAMPUS CONNECT" title={title} description={isStaff ? 'Kelola pesan masuk dan balas mahasiswa secara langsung.' : 'Pilih dosen atau administrator kampus untuk memulai percakapan pribadi.'} action={!isStaff ? <span className="today-chip"><ShieldCheck size={14}/> Percakapan privat</span> : undefined}/>

    {!isStaff && <section className="contact-directory-section"><div className="section-heading-inline"><div><div className="eyebrow">CAMPUS DIRECTORY</div><h3>Hubungi siapa?</h3><p>Pilih penerima untuk membuat percakapan baru.</p></div><span>{contacts.length} kontak tersedia</span></div><div className="contact-directory-grid">{contacts.map(contact => { const Icon = contactIcon(contact.role); return <article className="contact-person-card" key={contact.id}><div className="contact-person-avatar">{contact.avatar || contact.name.slice(0, 2).toUpperCase()}</div><div className="contact-person-info"><strong>{contact.name}</strong><span><Icon size={13} aria-hidden="true"/> {roleTitle(contact.role)}</span><small>{contact.major}</small></div><button className="button button-outline button-small" onClick={() => startConversation(contact)}><MessageCircle size={14}/> Chat</button></article> })}{!contacts.length && !loading && <div className="contact-empty">Belum ada dosen atau administrator terdaftar. Hubungi pengelola kampus untuk menambahkan kontak.</div>}</div></section>}

    <section className={`conversation-workspace ${mobileChatOpen ? 'conversation-workspace--chat-open' : ''}`}>
      <aside className="conversation-list-panel" ref={conversationListRef}>
        <div className="conversation-list-heading"><div><span className="eyebrow">{isStaff ? 'INCOMING MESSAGES' : 'YOUR MESSAGES'}</span><h3>{isStaff ? 'Inbox' : 'Percakapan'}</h3></div><span className="conversation-total">{conversations.length}</span></div>
        <label className="conversation-search"><Search size={15}/><input aria-label="Cari percakapan" value={conversationQuery} onChange={event => setConversationQuery(event.target.value)} placeholder="Cari nama, subjek, atau pesan..."/></label>
        {loading ? <div className="conversation-list-empty">Memuat percakapan...</div> : visibleConversations.length ? visibleConversations.map(conversation => {
          const participant = isStaff ? conversation.created_by_name : conversation.recipient_name
          const lastMessage = conversation.messages[conversation.messages.length - 1]
          return <button key={conversation.id} className={`conversation-list-item ${selectedId === conversation.id ? 'conversation-list-active' : ''}`} onClick={() => { setSelectedId(conversation.id); setReply(''); setMobileChatOpen(true) }}>
            <div className="conversation-avatar">{participant.split(' ').map(part => part[0]).slice(0, 2).join('')}</div>
            <span className="conversation-list-copy"><strong>{participant}</strong><small>{conversation.subject}</small><em>{lastMessage?.body ?? 'Belum ada pesan'}</em></span>
            <span className={`conversation-status conversation-status-${conversation.status}`}>{conversation.status === 'answered' ? 'Dibalas' : conversation.status === 'closed' ? 'Selesai' : 'Aktif'}</span>
          </button>
        }) : <div className="conversation-list-empty"><MessageCircle size={20}/><strong>{conversations.length ? 'Percakapan tidak ditemukan' : 'Belum ada percakapan'}</strong><span>{conversations.length ? 'Coba kata kunci lain.' : isStaff ? 'Pesan mahasiswa yang ditujukan kepadamu akan muncul di sini.' : 'Mulai chat dengan dosen atau administrator kampus.'}</span></div>}
      </aside>

      <section className="conversation-chat-panel">
        {selectedConversation ? <>
          <header className="conversation-chat-header"><button type="button" className="chat-back-button" aria-label="Kembali ke daftar percakapan" onClick={backToInbox}><ArrowLeft size={19}/></button><div className="conversation-chat-heading-copy"><span className="eyebrow">{isStaff ? 'FROM STUDENT' : 'CAMPUS CONTACT'}</span><h3>{isStaff ? selectedConversation.created_by_name : selectedConversation.recipient_name}</h3><p>{selectedConversation.subject}</p></div><span className="conversation-priority">{selectedConversation.priority === 'high' ? 'Prioritas tinggi' : 'Normal'}</span></header>
          <div className="conversation-messages" ref={messagesRef} aria-live="polite">{selectedConversation.messages.map(message => <article key={message.id} className={`chat-message ${message.sender_id === user?.id ? 'chat-message-own' : ''}`}><div className="chat-message-avatar">{message.sender_name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div><div className="chat-message-main"><div className="chat-message-meta"><strong>{message.sender_id === user?.id ? 'Kamu' : message.sender_name}</strong><span>{new Date(message.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><p>{message.body}</p></div></article>)}{!selectedConversation.messages.length && <div className="conversation-list-empty">Belum ada pesan pada thread ini.</div>}</div>
          {selectedConversation.status === 'closed' ? <div className="conversation-closed-note">Percakapan ini sudah ditandai selesai.</div> : <form className="chat-reply-form" onSubmit={sendReply}><textarea aria-label={isStaff ? 'Balasan untuk mahasiswa' : 'Pesan lanjutan'} rows={2} value={reply} onChange={event => setReply(event.target.value)} placeholder={isStaff ? 'Tulis balasan untuk mahasiswa...' : 'Tulis pesan lanjutan...'} maxLength={2000}/><div><small>Jaga komunikasi tetap sopan. Jangan kirim password atau OTP.</small><button className="button button-primary" disabled={busy || !reply.trim()}>{busy ? 'Mengirim...' : 'Kirim balasan'} <Send size={15}/></button></div></form>}
        </> : <div className="conversation-chat-empty"><div className="conversation-empty-icon"><MessageCircle size={25}/></div><h3>Pilih percakapan</h3><p>{isStaff ? 'Pilih pesan dari inbox untuk membaca pertanyaan mahasiswa dan membalasnya.' : 'Pilih chat yang sudah ada, atau mulai percakapan baru dari direktori di atas.'}</p>{!isStaff && <button className="button button-primary" onClick={() => document.querySelector('.contact-directory-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Plus size={15}/> Mulai chat</button>}</div>}
      </section>
    </section>

    <div className="privacy-callout"><ShieldCheck size={19}/><div><strong>Pesanmu bersifat privat.</strong><p>Hanya pengirim, penerima yang dituju, dan administrator berwenang yang dapat membaca percakapan. Pada Demo Mode, pesan disimpan di browser ini dan role demo dapat dipakai bergantian untuk mencoba alur balasan.</p></div></div>

    {newContact && <Modal title={`Chat dengan ${newContact.name}`} onClose={() => setNewContact(null)} wide><form className="modal-form" onSubmit={createThread}><div className="new-chat-recipient"><div className="contact-person-avatar">{newContact.avatar}</div><div><strong>{newContact.name}</strong><span>{roleTitle(newContact.role)} · {newContact.major}</span></div></div><label>Subjek<input value={newSubject} onChange={event => setNewSubject(event.target.value)} required maxLength={120} placeholder="Contoh: Konsultasi rencana studi"/></label><label>Pesan pertama<textarea rows={5} value={newBody} onChange={event => setNewBody(event.target.value)} required maxLength={2000} placeholder="Ceritakan kebutuhanmu dengan jelas dan sopan..."/></label><label>Prioritas<select value={newPriority} onChange={event => setNewPriority(event.target.value as 'normal' | 'high')}><option value="normal">Normal</option><option value="high">Tinggi — butuh perhatian segera</option></select></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setNewContact(null)}>Batal</button><button className="button button-primary" disabled={busy || !newSubject.trim() || !newBody.trim()}>{busy ? 'Mengirim...' : 'Kirim pesan'} <Send size={15}/></button></div></form></Modal>}
  </div>
}
