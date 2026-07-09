import { ProductService } from '@/services/product.service'
import { ProductList } from '@/features/admin/products/components/ProductList'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const revalidate = 0

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : ''
  const limit = 10

  const { data: products, count } = await ProductService.getPaginatedProducts(page, limit, search)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý sản phẩm</h2>
        <p className="text-muted-foreground">
          Thêm, sửa, xóa, quản lý phân loại và kho hàng.
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-md" />
        </div>
      }>
        <ProductList
          initialProducts={products}
          totalCount={count}
          currentPage={page}
          searchTerm={search}
        />
      </Suspense>
    </div>
  )
}
