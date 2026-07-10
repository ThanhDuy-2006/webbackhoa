import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrderRepository } from '@/repositories/order.repository'
import { UserOrderList } from '@/features/profile/components/UserOrderList'
import { getUserRevenueSharesAction } from '@/actions/user/revenue-share.actions'

export const metadata: Metadata = {
  title: 'Lịch sử đơn hàng',
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    page?: string
  }>
}

export default async function UserOrdersPage(props: PageProps) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const limit = 50 // Increased limit to show more items since we are merging
  
  const filter = {
    userId: user.id,
    status: searchParams.status,
    page,
    limit,
  }

  const { data: orders, count } = await OrderRepository.getOrders(filter)
  
  // Fetch shares to interweave
  const sharesRes = await getUserRevenueSharesAction()
  const shares = sharesRes.success ? (sharesRes.data || []) : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Lịch sử đơn hàng</h1>
      <p className="text-slate-500">Xem và theo dõi các đơn hàng bạn đã đặt mua và các khoản khấu trừ chi phí.</p>
      
      <UserOrderList initialData={orders} total={count} shares={shares} />
    </div>
  )
}

