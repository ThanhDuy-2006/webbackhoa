import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { ShoppingBag, CreditCard, Percent } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Lịch sử chung | Bách Hóa',
}

// Ensure the route is dynamically rendered to get fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

type ActivityEvent = {
  id: string
  type: 'order' | 'topup' | 'revenue_share'
  user_name: string
  amount: number
  created_at: string
  item_desc?: string
}

export default async function GlobalHistoryPage() {
  const adminClient = createAdminClient()

  // Fetch recent orders
  const { data: ordersData, error: ordersError } = await adminClient
    .from('orders')
    .select(`
      id,
      created_at,
      total_amount,
      profiles:user_id (full_name, email),
      order_items (product_name, quantity)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch recent topups
  const { data: topupsData, error: topupsError } = await adminClient
    .from('wallet_transactions')
    .select(`
      id,
      created_at,
      amount,
      profiles:user_id (full_name, email)
    `)
    .eq('type', 'topup')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch recent revenue sharing activities
  const { data: sharesData } = await adminClient
    .from('revenue_share_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const events: ActivityEvent[] = []

  if (ordersData) {
    ordersData.forEach(order => {
      const profile = order.profiles as any
      const items = (order.order_items as any[]) || []
      const itemDesc = items.length > 0 
        ? items.map(i => `${i.product_name} (x${i.quantity})`).join(', ')
        : 'sản phẩm'

      events.push({
        id: `order-${order.id}`,
        type: 'order',
        user_name: profile?.full_name || profile?.email || 'Người dùng ẩn danh',
        amount: order.total_amount,
        created_at: order.created_at,
        item_desc: itemDesc,
      })
    })
  }

  if (topupsData) {
    topupsData.forEach(topup => {
      const profile = topup.profiles as any
      events.push({
        id: `topup-${topup.id}`,
        type: 'topup',
        user_name: profile?.full_name || profile?.email || 'Người dùng ẩn danh',
        amount: topup.amount,
        created_at: topup.created_at,
      })
    })
  }

  if (sharesData) {
    sharesData.forEach(share => {
      events.push({
        id: `share-${share.id}`,
        type: 'revenue_share',
        user_name: share.admin_name,
        amount: share.total_amount,
        created_at: share.created_at,
        item_desc: share.description
      })
    })
  }

  // Sort by created_at descending
  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Take top 50 overall
  const recentEvents = events.slice(0, 50)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Lịch sử chung</h1>
        <p className="text-slate-500 mt-2">Cập nhật hoạt động mua hàng và nạp tiền mới nhất trên hệ thống.</p>
      </div>

      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        {recentEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Chưa có hoạt động nào được ghi nhận.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentEvents.map((event) => (
              <div key={event.id} className="p-6 md:p-8 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  event.type === 'order' ? 'bg-blue-50 text-blue-600' :
                  event.type === 'topup' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {event.type === 'order' ? (
                    <ShoppingBag className="w-5 h-5" />
                  ) : event.type === 'topup' ? (
                    <CreditCard className="w-5 h-5" />
                  ) : (
                    <Percent className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-slate-900 text-base">
                    {event.type === 'revenue_share' ? (
                      <span>{event.item_desc}</span>
                    ) : (
                      <>
                        <span className="font-semibold">{event.user_name}</span>
                        {event.type === 'order' ? (
                          <>
                            <span> đã mua </span>
                            <span className="font-medium text-emerald-700">{event.item_desc}</span>
                            <span> với tổng giá </span>
                          </>
                        ) : (
                          <span> vừa nạp thành công </span>
                        )}
                        <span className="font-bold text-slate-900">
                          {event.amount.toLocaleString('vi-VN')} VND
                        </span>
                        {event.type === 'topup' && ' vào ví.'}
                      </>
                    )}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    {new Date(event.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
