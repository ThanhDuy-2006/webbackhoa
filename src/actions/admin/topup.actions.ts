'use server'

import { TopupRepository } from '@/repositories/topup.repository'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/supabase/auth-guard'

export async function approveTopupAction(id: string, note?: string) {
  try {
    const { user } = await assertAdmin()

    const result = await TopupRepository.approveTopup(id, user.id, note)
    
    if (result.success) {
      revalidatePath('/admin/topups')
      revalidatePath('/tai-khoan')
      revalidatePath('/tai-khoan/nap-tien')
      revalidatePath('/tai-khoan/lich-su-giao-dich')
      revalidatePath('/tai-khoan/lich-su-chung')
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
    
    const { user } = await assertAdmin()

    const result = await TopupRepository.rejectTopup(id, user.id, note)
    
    if (result.success) {
      revalidatePath('/admin/topups')
      revalidatePath('/tai-khoan')
      revalidatePath('/tai-khoan/nap-tien')
      revalidatePath('/tai-khoan/lich-su-giao-dich')
      revalidatePath('/tai-khoan/lich-su-chung')
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi từ chối nạp tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

