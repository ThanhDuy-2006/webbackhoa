'use server'

import { OrderRepository } from '@/repositories/order.repository'
import { revalidatePath } from 'next/cache'

export async function updateOrderStatusAction(id: string, status: string) {
  try {
    // Ideally we would also check admin role here
    
    // Valid statuses based on DB check constraint:
    // 'pending', 'confirmed', 'shipping', 'completed', 'cancelled', 'refunded'
    const allowedStatuses = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled', 'refunded']
    if (!allowedStatuses.includes(status)) {
      return { success: false, error: 'Trạng thái không hợp lệ' }
    }

    const result = await OrderRepository.updateOrderStatus(id, status)
    
    if (result.success) {
      revalidatePath('/admin/orders')
      // revalidatePath(`/tai-khoan/don-hang`)
    }
    
    return result
  } catch (error: any) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error)
    return { success: false, error: error.message || 'Có lỗi xảy ra' }
  }
}
