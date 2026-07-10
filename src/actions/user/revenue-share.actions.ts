'use server'

import { createClient } from '@/lib/supabase/server'

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
