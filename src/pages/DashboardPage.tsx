import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Flame, GraduationCap, Lightbulb, Sparkles, Target, TrendingUp, Trophy, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import { getCourses, getOpportunities, getPosts } from '../lib/data'
import type { Course, Opportunity, Post, ToastMessage } from '../types'

export function DashboardPage({ notify }: { notify: (title: string, description?: string, tone?: ToastMessage['tone']) => void }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([getPosts(user.id), getOpportunities(), getCourses(user.id)]).then(([postData, opportunityData, courseData]) => {
      setPosts(postData); setOpportunities(opportunityData); setCourses(courseData)
    }).catch(error => notify('Data belum dapat dimuat', error instanceof Error ? error.message : 'Periksa koneksi.', 'error')).finally(() => setLoading(false))
  }, [user, notify])

  const averageProgress = courses.length ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length) : 0
  const firstName = user?.name.split(' ')[0] ?? 'Teman'
  const deadlines = opportunities.filter(item => new Date(item.deadline).getTime() > Date.now()).slice(0, 3)

  return <div className="page-stack">
    <div className="welcome-banner"><div className="welcome-decoration welcome-decoration-one" /><div className="welcome-decoration welcome-decoration-two" /><div className="welcome-copy"><div className="welcome-kicker"><Sparkles size={14} /> YOUR CAMPUS, CONNECTED</div><h2>Good afternoon, {firstName}<span className="wave">✦</span></h2><p>Setiap langkah kecil hari ini membangun versi terbaik dirimu.</p><div className="welcome-actions"><Link to="/learning" className="button button-light">Continue learning <ArrowRight size={16} /></Link><Link to="/community" className="welcome-text-link">Explore community <ArrowUpRight size={15} /></Link></div></div><div className="welcome-graphic"><div className="graphic-ring ring-a" /><div className="graphic-ring ring-b" /><div className="graphic-core"><GraduationCap size={42} /></div><div className="graphic-float float-a"><BookOpen size={17} /></div><div className="graphic-float float-b"><Trophy size={17} /></div><div className="graphic-float float-c"><Lightbulb size={17} /></div></div></div>

    <PageTitle eyebrow="YOUR OVERVIEW" title="Campus at a glance" description="Pantau aktivitas, progres belajar, dan peluang terbaru dari satu tempat." action={<div className="today-chip"><CalendarDays size={15} /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</div>} />
    <section className="stats-grid">
      <div className="stat-card"><div className="stat-top"><span>Learning progress</span><div className="stat-icon stat-violet"><BookOpen size={18} /></div></div><div className="stat-value">{loading ? '—' : `${averageProgress}%`}<span className="stat-trend positive"><ArrowUpRight size={13} /> Active</span></div><div className="mini-progress"><i style={{ width: `${averageProgress}%` }} /></div><small>Across {courses.length} learning paths</small></div>
      <div className="stat-card"><div className="stat-top"><span>Community posts</span><div className="stat-icon stat-blue"><Users size={18} /></div></div><div className="stat-value">{loading ? '—' : posts.length}<span className="stat-trend positive"><TrendingUp size={13} /> Live</span></div><div className="stat-sparkline"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><small>Knowledge shared by your campus</small></div>
      <div className="stat-card"><div className="stat-top"><span>Open opportunities</span><div className="stat-icon stat-orange"><Trophy size={18} /></div></div><div className="stat-value">{loading ? '—' : opportunities.length}<span className="stat-trend positive"><ArrowUpRight size={13} /> New</span></div><div className="stat-bottom-label"><span className="tiny-dot dot-orange" /> Explore what's possible</div></div>
      <div className="stat-card"><div className="stat-top"><span>Learning streak</span><div className="stat-icon stat-pink"><Flame size={18} /></div></div><div className="stat-value">4 <span className="stat-unit">days</span><span className="stat-trend"><ArrowDownRight size={13} /> Keep it up</span></div><div className="streak-days">{['M','T','W','T','F','S','S'].map((day, index) => <span key={index} className={index < 4 ? 'streak-done' : ''}>{day}</span>)}</div></div>
    </section>

    <div className="dashboard-grid">
      <section className="panel panel-main"><div className="panel-heading"><div><div className="eyebrow">LEARN SOMETHING NEW</div><h3>Pick up where you left off</h3></div><Link to="/learning" className="subtle-link">All courses <ArrowRight size={15} /></Link></div>
        <div className="course-list-compact">{courses.slice(0, 3).map(course => <div className="compact-course" key={course.id}><div className={`course-mini-icon course-${course.color}`}><BookOpen size={18} /></div><div className="compact-course-info"><div className="compact-course-meta"><span>{course.category}</span><span>{course.duration}</span></div><strong>{course.title}</strong><div className="compact-progress"><span style={{ width: `${course.progress}%` }} /></div><small>{course.progress}% completed</small></div><Link to="/learning" className="round-arrow" aria-label={`Buka ${course.title}`}><ArrowUpRight size={17} /></Link></div>)}</div>
      </section>
      <section className="panel deadlines-panel"><div className="panel-heading"><div><div className="eyebrow">DON'T MISS OUT</div><h3>Upcoming deadlines</h3></div><Link to="/opportunities" className="round-arrow" aria-label="Lihat peluang"><ArrowUpRight size={17} /></Link></div>
        {deadlines.length ? deadlines.map(item => <div className="deadline-item" key={item.id}><div className="deadline-date"><strong>{new Date(item.deadline).getDate()}</strong><span>{new Date(item.deadline).toLocaleDateString('en-US', { month: 'short' })}</span></div><div className="deadline-info"><strong>{item.title}</strong><span>{item.organization}</span></div></div>) : <div className="empty-inline">No upcoming deadlines yet.</div>}
        <Link to="/opportunities" className="panel-bottom-link">Discover opportunities <ArrowRight size={15} /></Link>
      </section>
    </div>

    <div className="dashboard-grid dashboard-grid-bottom">
      <section className="panel"><div className="panel-heading"><div><div className="eyebrow">CAMPUS COMMUNITY</div><h3>Conversations worth a read</h3></div><Link to="/community" className="subtle-link">View feed <ArrowRight size={15} /></Link></div>
        {posts.slice(0, 2).map(post => <div className="activity-post" key={post.id}><div className="avatar avatar-soft">{post.author_avatar}</div><div><div className="activity-author"><strong>{post.author_name}</strong><span>{post.category}</span></div><p>{post.content.slice(0, 125)}{post.content.length > 125 ? '…' : ''}</p><small>{new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {post.likes} likes</small></div></div>)}
      </section>
      <section className="focus-card"><div className="focus-card-shape" /><div className="focus-icon"><Target size={20} /></div><div className="eyebrow">A LITTLE REMINDER</div><h3>Your next idea<br />could change things.</h3><p>Share what you learn. Ask what you don't know. Grow together.</p><Link to="/community" className="focus-link">Start a conversation <ArrowRight size={15} /></Link><div className="focus-bottom-note"><span>01</span><span>MAKE IT COUNT</span><span>✳</span></div></section>
    </div>
  </div>
}
