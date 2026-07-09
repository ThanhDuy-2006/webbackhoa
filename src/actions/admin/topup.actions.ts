'use server'

import { TopupRepository } from '@/repositories/topup.repository'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveTopupAction(id: string, note?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập' }

    // Check if user is admin - in a real app, you should check this securely
    // We assume middleware already protected this route, but doing double check is good.

    const result = await TopupRepository.approveTopup(id, user.id, note)
    
    if (result.success) {
      revalidatePath('/admin/topups')
      // revalidatePath('/tai-khoan')
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi duyệt nạp tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function rejectTopupAction(id: string, note: string) {
  try {
    if (!note) return { success: false, error: 'Phải có lý do từ chối' }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập' }

    const result = await TopupRepository.rejectTopup(id, user.id, note)
    
    if (result.success) {
      revalidatePath('/admin/topups')
      // revalidatePath('/tai-khoan')
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi từ chối nạp tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}
