import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowUpRight, Bookmark, Check, Heart, ImagePlus, MessageCircle, MoreHorizontal, Pencil, Plus, Search, Send, Share2, Trash2, X } from 'lucide-react'
import { PageTitle } from '../components/PageTitle'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { addPostComment, createPost, deletePost, getPostComments, getPosts, togglePostBookmark, togglePostLike, updatePost } from '../lib/data'
import type { Post, PostComment, ToastMessage } from '../types'

const categories = ['All posts', 'Knowledge', 'Discussion', 'Campus Update', 'Project Showcase', 'Research']

export function FeedPage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user, demoMode } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState('All posts')
  const [search, setSearch] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [category, setCategory] = useState('Knowledge')
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({})
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [editText, setEditText] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)

  useEffect(() => {
    if (!mediaFile) { setMediaPreview(''); return }
    const url = URL.createObjectURL(mediaFile)
    setMediaPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [mediaFile])

  async function refresh() { if (user) setPosts(await getPosts(user.id)) }
  useEffect(() => { void refresh().catch(error => notify('Feed gagal dimuat', error.message, 'error')) }, [user])
  const filtered = useMemo(() => posts.filter(post => (filter === 'All posts' || post.category === filter) && `${post.content} ${post.author_name}`.toLowerCase().includes(search.toLowerCase())), [posts, filter, search])

  async function publish(event: FormEvent) {
    event.preventDefault(); if (!user || (!content.trim() && !mediaFile)) return
    setBusy(true)
    try { await createPost(user, category, content.trim(), mediaFile ?? undefined); setContent(''); setMediaFile(null); setComposeOpen(false); await refresh(); notify('Post published!', 'Idemu sekarang menjadi bagian dari percakapan kampus.', 'success') }
    catch (error) { notify('Post belum terkirim', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
    finally { setBusy(false) }
  }
  async function like(post: Post) {
    if (!user) return
    try { await togglePostLike(post.id, user.id); setPosts(current => current.map(item => item.id === post.id ? { ...item, liked: !item.liked, likes: Math.max(0, item.likes + (item.liked ? -1 : 1)) } : item)) }
    catch (error) { notify('Tidak dapat memberi like', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
  }
  async function openComments(postId: string) {
    if (commentFor === postId) { setCommentFor(null); return }
    setCommentFor(postId); setCommentText('')
    try { const result = await getPostComments(postId); setCommentsByPost(current => ({ ...current, [postId]: result })) }
    catch (error) { notify('Komentar gagal dimuat', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
  }
  async function comment(event: FormEvent) {
    event.preventDefault(); const target = posts.find(post => post.id === commentFor)
    if (!user || !target || !commentText.trim()) return
    try { await addPostComment(target.id, user, commentText.trim()); const updatedComments = await getPostComments(target.id); setCommentsByPost(current => ({ ...current, [target.id]: updatedComments })); setPosts(current => current.map(item => item.id === target.id ? { ...item, comments: item.comments + 1 } : item)); setCommentText(''); notify('Komentar ditambahkan') }
    catch (error) { notify('Komentar gagal dikirim', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
  }
  async function saveEdit(event: FormEvent) {
    event.preventDefault(); if (!user || !editPost || !editText.trim()) return
    try { await updatePost(editPost.id, user.id, editText.trim()); setPosts(current => current.map(item => item.id === editPost.id ? { ...item, content: editText.trim() } : item)); setEditPost(null); notify('Post diperbarui') }
    catch (error) { notify('Tidak dapat mengedit post', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
  }
  async function remove(post: Post) {
    if (!user || !window.confirm('Hapus postingan ini? Tindakan ini tidak dapat dibatalkan.')) return
    try { await deletePost(post.id, user.id); setPosts(current => current.filter(item => item.id !== post.id)); notify('Post dihapus') }
    catch (error) { notify('Tidak dapat menghapus post', error instanceof Error ? error.message : 'Coba lagi.', 'error') }
  }

  return <div className="page-stack">
    <PageTitle eyebrow="CAMPUS SOCIAL NETWORK" title="Community Feed" description="Ruang berbagi ide, karya, pengetahuan, dan cerita dari komunitas kampus." action={<button className="button button-primary" onClick={() => setComposeOpen(true)}><Plus size={17} /> Create post</button>} />
    <div className="feed-layout"><div className="feed-main">
      <button className="composer-trigger" onClick={() => setComposeOpen(true)}><div className="avatar avatar-indigo">{user?.avatar}</div><span>Share something meaningful with your campus...</span><span className="composer-trigger-action"><Plus size={16} /> Create</span></button>
      <div className="feed-toolbar"><div className="filter-tabs">{categories.map(item => <button key={item} className={filter === item ? 'filter-tab filter-active' : 'filter-tab'} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="feed-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts" /></label></div>
      {filtered.length ? <div className="post-list">{filtered.map(post => <article className="post-card" key={post.id}>
        <div className="post-head"><div className="avatar avatar-soft">{post.author_avatar}</div><div className="post-author"><div><strong>{post.author_name}</strong>{post.author_role === 'lecturer' && <span className="verified-mini"><Check size={11} /> Lecturer</span>}</div><span>{new Date(post.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · <b>{post.category}</b></span></div><div className="post-more-wrap"><button className="icon-button" aria-label="Opsi postingan" onClick={() => setMenuFor(menuFor === post.id ? null : post.id)}><MoreHorizontal size={19} /></button>{menuFor === post.id && <div className="post-menu">{post.author_id === user?.id && <><button disabled={!post.content.trim()} onClick={() => { setEditPost(post); setEditText(post.content); setMenuFor(null) }}><Pencil size={14} /> Edit text</button><button className="danger-text" onClick={() => { setMenuFor(null); void remove(post) }}><Trash2 size={14} /> Delete post</button></>}<button onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/community#${post.id}`); setMenuFor(null); notify('Link disalin', 'Bagikan diskusi ini ke temanmu.') }}><Share2 size={14} /> Copy link</button></div>}</div></div>
        {post.content && <p className="post-content">{post.content}</p>}{post.media_url && <div className="post-media-view">{post.media_type === 'video' ? <video src={post.media_url} controls playsInline preload="metadata" /> : <img src={post.media_url} alt={`Media dari ${post.author_name}`} loading="lazy" />}</div>}<div className="post-tags"><span>#{post.category.toLowerCase().replaceAll(' ', '')}</span><span>#kampusverse</span></div>
        <div className="post-metrics"><span>{post.likes} likes</span><span>{post.comments} comments</span></div><div className="post-actions"><button className={post.liked ? 'post-action liked' : 'post-action'} onClick={() => void like(post)}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} /> Like</button><button className="post-action" onClick={() => void openComments(post.id)}><MessageCircle size={17} /> Comment</button><button className="post-action" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/community#${post.id}`); notify('Link disalin') }}><Share2 size={17} /> Share</button><button className={post.bookmarked ? 'post-action post-bookmark liked' : 'post-action post-bookmark'} onClick={async () => { if (!user) return; try { const saved = await togglePostBookmark(post.id, user.id); setPosts(current => current.map(item => item.id === post.id ? { ...item, bookmarked: saved } : item)); notify(saved ? 'Post bookmarked' : 'Bookmark removed') } catch (error) { notify('Bookmark gagal disimpan', error instanceof Error ? error.message : 'Coba lagi.', 'error') } }} aria-label="Bookmark"><Bookmark size={17} fill={post.bookmarked ? 'currentColor' : 'none'} /></button></div>
        {commentFor === post.id && <div className="comment-thread">{(commentsByPost[post.id] ?? []).map(item => <div className="comment-item" key={item.id}><div className="avatar avatar-tiny">{item.author_name.split(' ').map(word => word[0]).slice(0,2).join('')}</div><div><strong>{item.author_name}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</small></div></div>)}{!commentsByPost[post.id]?.length && <div className="no-comments">Belum ada komentar. Jadilah yang pertama berdiskusi.</div>}<form className="comment-composer" onSubmit={comment}><div className="avatar avatar-tiny">{user?.avatar}</div><input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Tulis komentar yang membangun..." autoFocus /><button className="icon-button" aria-label="Kirim komentar" disabled={!commentText.trim()}><Send size={17} /></button></form></div>}
      </article>)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>No posts found</h3><p>Coba kata kunci atau kategori lain.</p><button className="button button-outline" onClick={() => { setFilter('All posts'); setSearch('') }}>Reset filters</button></div>}
    </div><aside className="feed-sidebar"><div className="side-widget trending-widget"><div className="widget-head"><h3>Trending topics</h3></div><div className="trending-item"><span>01</span><div><strong>#ResearchMethod</strong><small>24 conversations</small></div></div><div className="trending-item"><span>02</span><div><strong>#CampusProject</strong><small>18 conversations</small></div></div><div className="trending-item"><span>03</span><div><strong>#TechForGood</strong><small>13 conversations</small></div></div></div><div className="side-widget community-guidelines"><div className="guideline-icon"><Bookmark size={17} /></div><h3>Make this space better.</h3><p>Share thoughtfully, respect different perspectives, and keep discussions helpful for everyone.</p><button onClick={() => notify('Community guidelines', 'Jaga privasi, hindari spam, dan laporkan konten yang melanggar aturan kampus.', 'info')}>Community guidelines <ArrowUpRight size={14} /></button></div><div className="feed-side-footer">KAMPUSVERSE · COMMUNITY GUIDELINES · PRIVACY</div></aside></div>

    {composeOpen && <Modal title="Create a post" onClose={() => setComposeOpen(false)} wide><form className="modal-form" onSubmit={publish}><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{categories.slice(1).map(item => <option key={item}>{item}</option>)}</select></label><label>Your thoughts<textarea rows={5} value={content} onChange={e => setContent(e.target.value)} placeholder="Apa yang ingin kamu bagikan dengan komunitas kampus?" maxLength={2000} /></label>
      <div className="media-picker-row"><label className="media-picker-button"><ImagePlus size={17} /> Tambah foto / video<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/'); if (!isMedia) { notify('Format tidak didukung', 'Pilih JPG, PNG, WebP, MP4, atau WebM.', 'error'); return } const max = 20 * 1024 * 1024; if (file.size > max) { notify('File terlalu besar', 'Ukuran media maksimal 20 MB.', 'error'); return } if (demoMode && file.size > 1024 * 1024) { notify('Mode demo membatasi ukuran media', 'Gunakan file maksimal 1 MB. Mode Supabase mendukung hingga 20 MB.', 'info'); return } setMediaFile(file) }} /></label><span>JPG, PNG, WebP, MP4, WebM · Maks. 20 MB (demo 1 MB)</span></div>
      {mediaFile && <div className="media-preview-card">{mediaFile.type.startsWith('video/') ? <video src={mediaPreview} controls /> : <img src={mediaPreview} alt="Pratinjau media" />}<div><strong>{mediaFile.name}</strong><small>{(mediaFile.size / 1024 / 1024).toFixed(2)} MB · Siap diposting</small></div><button type="button" className="icon-button" aria-label="Hapus media" onClick={() => setMediaFile(null)}><X size={17}/></button></div>}
      <div className="composer-modal-footer"><span>{content.length}/2000 characters · Be kind, be curious.</span><button type="submit" className="button button-primary" disabled={busy || (!content.trim() && !mediaFile)}>{busy ? 'Publishing...' : 'Publish post'} <Send size={15} /></button></div></form></Modal>}
    {editPost && <Modal title="Edit post" onClose={() => setEditPost(null)}><form className="modal-form" onSubmit={saveEdit}><label>Post content<textarea rows={6} value={editText} onChange={e => setEditText(e.target.value)} required maxLength={2000} /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEditPost(null)}>Cancel</button><button className="button button-primary">Save changes</button></div></form></Modal>}
  </div>
}
