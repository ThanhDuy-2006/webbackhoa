'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitTopupRequestAction(data: {
  amount: number
  transfer_content: string
  proof_image_url?: string | null
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

    let currentTransferContent = data.transfer_content
    let insertError = null

    for (let i = 0; i < 3; i++) {
      const { error } = await supabase
        .from('topup_requests')
        .insert({
          user_id: user.id,
          amount: data.amount,
          transfer_content: currentTransferContent,
          proof_image_url: data.proof_image_url || null,
          status: 'pending'
        })
      
      insertError = error

      if (!error) {
        break // Success
      }

      if (error.code === '23505') {
        // Duplicate transfer_content, append a short random string to make it unique
        currentTransferContent = `${data.transfer_content} ${Math.floor(Math.random() * 10000)}`
      } else {
        // Other error, stop retrying
        break
      }
    }

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    revalidatePath('/tai-khoan/nap-tien')
    
    return { success: true }
  } catch (error: any) {
    console.error('Lỗi khi gửi yêu cầu nạp tiền:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}
