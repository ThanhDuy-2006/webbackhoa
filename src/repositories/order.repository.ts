import { createClient } from '@/lib/supabase/server'
import { Order, OrderFilter } from '@/types/order.type'

export const OrderRepository = {
  async getOrders(filter?: OrderFilter) {
    const supabase = await createClient()
    let query = supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id(full_name, email),
        order_items(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status)
    }

    if (filter?.userId) {
      query = query.eq('user_id', filter.userId)
    }

    if (filter?.search) {
      query = query.or(`order_code.ilike.%${filter.search}%,receiver_name.ilike.%${filter.search}%,receiver_phone.ilike.%${filter.search}%`)
    }

    if (filter?.page && filter?.limit) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Lỗi khi lấy danh sách đơn hàng:', error)
      return { data: [], count: 0 }
    }

    return { 
      data: (data as any) as Order[], 
      count: count || 0 
    }
  },

  async getOrderById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id(full_name, email),
        order_items(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Lỗi khi lấy chi tiết đơn hàng:', error)
      return null
    }

    return (data as any) as Order
  },

  async updateOrderStatus(id: string, status: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data as any) as Order }
  }
}
