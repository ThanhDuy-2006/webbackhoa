import { getSellerProductsAction } from '@/actions/seller-product.actions'
import { SellerProductList } from '@/features/seller/components/SellerProductList'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sản phẩm của tôi | Quản lý đăng bán',
  description: 'Quản lý danh sách sản phẩm đăng bán cá nhân trên sàn thương mại điện tử',
}

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}

export default async function SellerProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const search = params.search || ''
  const status = params.status || 'all'

  const res = await getSellerProductsAction(page, 10, search, status)

  return (
    <div className="space-y-6">
      <SellerProductList 
        products={res.data || []} 
        totalCount={res.count || 0}
        currentPage={page}
        currentSearch={search}
        currentStatus={status}
      />
    </div>
  )
}
