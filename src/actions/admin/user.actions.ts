'use server'

import { UserRepository } from '@/repositories/user.repository'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/supabase/auth-guard'

export async function updateUserRoleAction(id: string, role: string) {
  try {
    const { user } = await assertAdmin()

    if (user.id === id) {
      return { success: false, error: 'Không thể tự đổi quyền của chính mình' }
    }

    if (role !== 'admin' && role !== 'user') {
      return { success: false, error: 'Quyền không hợp lệ' }
    }

    const result = await UserRepository.updateUserRole(id, role)
    
    if (result.success) {
      revalidatePath('/admin/users')
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi đổi quyền user:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

export async function updateUserBlockStatusAction(id: string, is_blocked: boolean) {
  try {
    const { user } = await assertAdmin()

    if (user.id === id) {
      return { success: false, error: 'Không thể tự khóa chính mình' }
    }

    const result = await UserRepository.updateUserBlockStatus(id, is_blocked)
    
    if (result.success) {
      revalidatePath('/admin/users')
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi khóa user:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}

