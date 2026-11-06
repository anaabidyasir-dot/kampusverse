export type Role = 'student' | 'lecturer' | 'admin' | 'contributor'

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  major: string
  avatar: string
  bio?: string
}

export interface Post {
  id: string
  author_id: string
  author_name: string
  author_role: Role
  author_avatar: string
  category: string
  content: string
  created_at: string
  likes: number
  comments: number
  media_url?: string | null
  media_type?: 'image' | 'video' | null
  liked?: boolean
  bookmarked?: boolean
}

export interface PostComment {
  id: string
  post_id: string
  author_id: string
  author_name: string
  body: string
  created_at: string
}

export interface Opportunity {
  id: string
  title: string
  organization: string
  category: string
  level: string
  deadline: string
  description: string
  apply_url: string
  status: 'pending' | 'verified' | 'rejected' | 'expired'
  created_at: string
  submitted_by: string
}

export interface Course {
  id: string
  title: string
  category: string
  level: string
  duration: string
  lessons: number
  description: string
  instructor: string
  progress: number
  color: string
}

export interface CourseLesson {
  id: string
  course_id: string
  title: string
  body: string
  position: number
  estimated_minutes: number
  pdf_path?: string | null
  pdf_name?: string | null
  pdf_url?: string | null
}

export interface CampusContact {
  id: string
  name: string
  role: Role
  major: string
  avatar: string
}

export interface CampusConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  sender_role: Role
  body: string
  created_at: string
}

export interface CampusConversation {
  id: string
  created_by: string
  created_by_name: string
  created_by_role: Role
  recipient_user_id: string
  recipient_name: string
  recipient_role: Role
  subject: string
  priority: 'normal' | 'high'
  status: 'open' | 'answered' | 'closed'
  created_at: string
  updated_at: string
  messages: CampusConversationMessage[]
}

export interface Note {
  id: string
  title: string
  body: string
  updated_at: string
  owner_id: string
}

export interface CampusMessage {
  id: string
  sender_id: string
  sender_name: string
  recipient: string
  subject: string
  body: string
  priority: 'normal' | 'high'
  created_at: string
  read: boolean
}

export interface ToastMessage {
  id: number
  title: string
  description?: string
  tone: 'success' | 'error' | 'info'
}
