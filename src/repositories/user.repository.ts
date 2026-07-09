import { createClient } from '@/lib/supabase/server'
import { UserProfile, UserFilter } from '@/types/user.type'

export const UserRepository = {
  async getUsers(filter?: UserFilter) {
    const supabase = await createClient()
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filter?.role && filter.role !== 'all') {
      query = query.eq('role', filter.role)
    }

    if (filter?.status && filter.status !== 'all') {
      if (filter.status === 'blocked') query = query.eq('is_blocked', true)
      if (filter.status === 'active') query = query.eq('is_blocked', false)
    }

    if (filter?.search) {
      query = query.or(`full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`)
    }

    if (filter?.page && filter?.limit) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Lỗi khi lấy danh sách user:', error)
      return { data: [], count: 0 }
    }

    return { 
      data: (data as any) as UserProfile[], 
      count: count || 0 
    }
  },

  async updateUserRole(id: string, role: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Lỗi cập nhật quyền user:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data as any) as UserProfile }
  },

  async updateUserBlockStatus(id: string, is_blocked: boolean) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_blocked, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Lỗi cập nhật trạng thái block user:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data as any) as UserProfile }
  }
}
