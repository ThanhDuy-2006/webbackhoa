'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function AdminRealtimeListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new
          toast.success(`Có đơn hàng mới: ${order.order_code}`, {
            description: `Khách hàng vừa đặt đơn trị giá ${order.final_amount.toLocaleString('vi-VN')}đ`,
            action: {
              label: 'Xem ngay',
              onClick: () => router.push(`/admin/orders`)
            }
          })
          // Revalidate current page to update numbers
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'topup_requests' },
        (payload) => {
          toast.info(`Có yêu cầu nạp tiền mới`, {
            description: `Một khách hàng vừa tạo yêu cầu nạp ${payload.new.amount.toLocaleString('vi-VN')}đ`,
            action: {
              label: 'Xem ngay',
              onClick: () => router.push(`/admin/topups`)
            }
          })
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
