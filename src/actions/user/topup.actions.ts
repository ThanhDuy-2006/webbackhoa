'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitTopupRequestAction(data: {
  amount: number
  transfer_content: string
  proof_image_url: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Chưa đăng nhập' }

    if (data.amount <= 0) {
      return { success: false, error: 'Số tiền nạp không hợp lệ' }
    }
    if (!data.transfer_content) {
      return { success: false, error: 'Vui lòng nhập nội dung chuyển khoản' }
    }
    if (!data.proof_image_url) {
      return { success: false, error: 'Vui lòng upload ảnh minh chứng' }
    }

    const { error } = await supabase
      .from('topup_requests')
      .insert({
        user_id: user.id,
        amount: data.amount,
        transfer_content: data.transfer_content,
        proof_image_url: data.proof_image_url,
        status: 'pending'
      })

    if (error) {
      // Check unique constraint violation for transfer_content
      if (error.code === '23505') {
        return { success: false, error: 'Nội dung chuyển khoản này đã được sử dụng. Vui lòng kiểm tra lại.' }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/tai-khoan/nap-tien')
    
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi khi gửi yêu cầu nạp tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}
