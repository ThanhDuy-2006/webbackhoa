'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

export function AdminRealtimeListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new
          toast.success(`Có đơn hàng mới: ${order.order_code}`, {
            description: `Khách hàng vừa đặt đơn trị giá ${formatCurrency(order.final_amount)}`,
            action: {
              label: 'Xem ngay',
              onClick: () => router.push(`/admin/orders`)
            }
          })
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'topup_requests' },
        (payload) => {
          toast.info(`Có yêu cầu nạp tiền mới`, {
            description: `Một khách hàng vừa tạo yêu cầu nạp ${formatCurrency(payload.new.amount)}`,
            action: {
              label: 'Xem ngay',
              onClick: () => router.push(`/admin/topups`)
            }
          })
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'withdrawal_requests' },
        (payload) => {
          toast.info(`Có yêu cầu rút tiền mới`, {
            description: `Khách hàng vừa tạo yêu cầu rút ${formatCurrency(payload.new.amount)} về ${payload.new.bank_name}`,
            action: {
              label: 'Xem ngay',
              onClick: () => router.push(`/admin/withdrawals`)
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
