'use server'

import { WithdrawalRepository } from '@/repositories/withdrawal.repository'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/supabase/auth-guard'

export async function approveWithdrawalAction(id: string, note?: string) {
  try {
    const { user } = await assertAdmin()

    const result = await WithdrawalRepository.approveWithdrawal(id, user.id, note)
    
    if (result.success) {
      revalidatePath('/admin/withdrawals')
      revalidatePath('/tai-khoan')
      revalidatePath('/tai-khoan/rut-tien')
      revalidatePath('/tai-khoan/nap-tien')
      revalidatePath('/tai-khoan/lich-su-giao-dich')
      revalidatePath('/tai-khoan/lich-su-chung')
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi duyệt rút tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function rejectWithdrawalAction(id: string, note: string) {
  try {
    if (!note?.trim()) return { success: false, error: 'Vui lòng cung cấp lý do từ chối yêu cầu rút tiền' }
    
    const { user } = await assertAdmin()

    const result = await WithdrawalRepository.rejectWithdrawal(id, user.id, note)
    
    if (result.success) {
      revalidatePath('/admin/withdrawals')
      revalidatePath('/tai-khoan')
      revalidatePath('/tai-khoan/rut-tien')
      revalidatePath('/tai-khoan/nap-tien')
      revalidatePath('/tai-khoan/lich-su-giao-dich')
      revalidatePath('/tai-khoan/lich-su-chung')
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi từ chối rút tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

