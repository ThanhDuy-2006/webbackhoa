'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getUserRevenueSharesAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' }
    }

    const { data, error } = await supabase
      .from('product_revenue_shares')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Compute stats for user
    let totalReceived = 0
    data?.forEach(s => {
      totalReceived += Number(s.amount)
    })

    return { 
      success: true, 
      data, 
      stats: {
        totalReceived
      }
    }
  } catch (error: any) {
    console.error('Lỗi lấy lịch sử chia tiền user:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

// Fetch detailed recipient distribution list for a specific share transaction (drill-down detail report)
export async function getRevenueShareDetailAction(orderItemId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Chưa đăng nhập')

    // Use admin client to bypass user RLS and fetch all co-recipients for the same item
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('product_revenue_shares')
      .select('*')
      .eq('order_item_id', orderItemId)

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Lỗi lấy chi tiết chia tiền đơn hàng:', error)
    return { success: false, error: error.message }
  }
}

// Fetch general wallet transactions for user with source type filtering
export async function getUserWalletTransactionsAction(type?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Chưa đăng nhập')

    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Lỗi lấy lịch sử biến động số dư:', error)
    return { success: false, error: error.message }
  }
}
