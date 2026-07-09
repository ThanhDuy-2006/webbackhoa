'use server'

import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) {
    return { error: 'Vui lòng nhập email hợp lệ' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // The redirect URL when the user clicks the link in their email
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/tai-khoan/mat-khau`
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
