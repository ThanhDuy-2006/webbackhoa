'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function authenticateSeller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này')
  }
  return { user, supabase }
}

export async function getSellerOrdersAction(page: number = 1, limit: number = 10, status?: string) {
  try {
    const { user, supabase } = await authenticateSeller()

    let query = supabase
      .from('seller_orders')
      .select('*, parent_order:orders(order_code, receiver_name, receiver_phone, receiver_address, note), order_items(*)', { count: 'exact' })
      .eq('seller_id', user.id)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)
    return { success: true, data: data || [], count: count || 0 }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message, data: [], count: 0 }
  }
}

export async function updateSellerOrderStatusAction(sellerOrderId: string, newStatus: 'confirmed' | 'shipping') {
  try {
    const { user, supabase } = await authenticateSeller()

    if (newStatus !== 'confirmed' && newStatus !== 'shipping') {
      throw new Error('Người bán chỉ được phép chuyển trạng thái đơn sang "Xác nhận" hoặc "Đang giao hàng"')
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('seller_orders')
      .select('id, status, seller_id')
      .eq('id', sellerOrderId)
      .eq('seller_id', user.id)
      .single()

    if (!existing) {
      throw new Error('Đơn bán không tồn tại hoặc bạn không có quyền cập nhật')
    }

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new Error('Đơn bán đã hoàn thành hoặc hủy, không thể thay đổi trạng thái')
    }

    const { error } = await supabase
      .from('seller_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', sellerOrderId)
      .eq('seller_id', user.id)

    if (error) throw new Error(error.message)

    revalidatePath('/tai-khoan/don-ban')
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}
