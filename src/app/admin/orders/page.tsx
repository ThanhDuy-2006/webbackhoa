import { Metadata } from 'next'
import { OrderRepository } from '@/repositories/order.repository'
import { OrderList } from '@/features/admin/orders/components/OrderList'
import { AdminHeader } from '@/components/layout/AdminHeader'

export const metadata: Metadata = {
  title: 'Quản lý đơn hàng | Admin',
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

export default async function AdminOrdersPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const limit = 20
  
  const filter = {
    status: searchParams.status,
    search: searchParams.search,
    page,
    limit,
  }

  const { data: orders, count } = await OrderRepository.getOrders(filter)

  return (
    <div className="space-y-6">
      <AdminHeader 
        title="Quản lý đơn hàng" 
        description="Xem và cập nhật trạng thái các đơn hàng trong hệ thống." 
      />
      
      <OrderList initialData={orders} total={count} />
    </div>
  )
}
