'use server'

import { WithdrawalRepository } from '@/repositories/withdrawal.repository'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitWithdrawalRequestAction(data: {
  amount: number
  bank_name: string
  account_number: string
  account_name: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập' }

    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Số tiền rút không hợp lệ' }
    }
    if (!data.bank_name?.trim()) {
      return { success: false, error: 'Vui lòng chọn hoặc nhập tên ngân hàng' }
    }
    if (!data.account_number?.trim()) {
      return { success: false, error: 'Vui lòng nhập số tài khoản ngân hàng' }
    }
    if (!data.account_name?.trim()) {
      return { success: false, error: 'Vui lòng nhập tên chủ tài khoản' }
    }

    const result = await WithdrawalRepository.submitWithdrawal(data)

    if (result.success) {
      revalidatePath('/tai-khoan/rut-tien')
      revalidatePath('/tai-khoan/nap-tien')
      revalidatePath('/tai-khoan')
      revalidatePath('/tai-khoan/lich-su-giao-dich')
      revalidatePath('/tai-khoan/lich-su-chung')
    }

    return result
  } catch (error: any) {
    console.error('Lỗi khi gửi yêu cầu rút tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function getUserWithdrawalsAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập', data: [] }

    const data = await WithdrawalRepository.getUserWithdrawals(user.id)
    return { success: true, data }
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách rút tiền:', error)
    return { success: false, error: error.message, data: [] }
  }
}
