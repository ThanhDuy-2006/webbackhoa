'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePassword(formData: FormData) {
  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!newPassword || !confirmPassword) {
    return { error: 'Vui lòng điền đầy đủ thông tin' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Mật khẩu xác nhận không khớp' }
  }

  if (newPassword.length < 6) {
    return { error: 'Mật khẩu phải có ít nhất 6 ký tự' }
  }

  const supabase = await createClient()

  // Ensure user is logged in
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { error: 'Bạn cần đăng nhập để thực hiện chức năng này' }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tai-khoan/mat-khau')
  return { success: true }
}
