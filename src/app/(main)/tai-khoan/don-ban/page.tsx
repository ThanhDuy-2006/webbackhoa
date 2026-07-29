import { getSellerOrdersAction } from '@/actions/seller-order.actions'
import { SellerOrderList } from '@/features/seller/components/SellerOrderList'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Đơn bán của tôi | Quản lý bán hàng C2C',
  description: 'Quản lý danh sách các đơn hàng được mua từ người bán cá nhân',
}

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>
}

export default async function SellerOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const status = params.status || 'all'

  const res = await getSellerOrdersAction(page, 10, status)

  return (
    <div className="space-y-6">
      <SellerOrderList 
        orders={res.data || []} 
        totalCount={res.count || 0}
        currentPage={page}
        currentStatus={status}
      />
    </div>
  )
}
