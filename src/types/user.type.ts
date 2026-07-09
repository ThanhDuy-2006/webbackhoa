export interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: 'admin' | 'user'
  balance: number
  is_blocked: boolean
  created_at: string
  updated_at: string
}

export interface UserFilter {
  role?: string
  status?: string // 'active' | 'blocked'
  search?: string
  page?: number
  limit?: number
}
