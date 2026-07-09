import { createClient } from '@/lib/supabase/server'
import { TopupRequest, TopupFilter } from '@/types/topup.type'

export const TopupRepository = {
  async getTopupRequests(filter?: TopupFilter) {
    const supabase = await createClient()
    let query = supabase
      .from('topup_requests')
      .select(`
        *,
        profiles:user_id(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status)
    }

    if (filter?.userId) {
      query = query.eq('user_id', filter.userId)
    }

    if (filter?.search) {
      query = query.or(`transfer_content.ilike.%${filter.search}%`)
      // Note: we can't easily search nested profile names with a simple .or() in Supabase without a custom view or RPC, so we search transfer_content.
    }

    if (filter?.page && filter?.limit) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Lỗi khi lấy danh sách nạp tiền:', error)
      return { data: [], count: 0 }
    }

    return { 
      data: (data as any) as TopupRequest[], 
      count: count || 0 
    }
  },

  async approveTopup(topupId: string, adminId: string, adminNote?: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('approve_topup_request', {
        p_topup_id: topupId,
        p_admin_id: adminId,
        p_admin_note: adminNote || null
      })

    if (error) {
      console.error('Lỗi RPC approve_topup_request:', error)
      return { success: false, error: error.message }
    }

    return (data as any) as { success: boolean, error?: string }
  },

  async rejectTopup(topupId: string, adminId: string, adminNote: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('reject_topup_request', {
        p_topup_id: topupId,
        p_admin_id: adminId,
        p_admin_note: adminNote
      })

    if (error) {
      console.error('Lỗi RPC reject_topup_request:', error)
      return { success: false, error: error.message }
    }

    return (data as any) as { success: boolean, error?: string }
  }
}
