import { CategoryService } from '@/services/category.service'
import { CategoryList } from '@/features/admin/categories/components/CategoryList'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const revalidate = 0

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : ''
  const limit = 10

  const { data: categories, count } = await CategoryService.getPaginatedCategories(page, limit, search)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý danh mục</h2>
        <p className="text-muted-foreground">
          Thêm, sửa, xóa và quản lý các danh mục sản phẩm của hệ thống.
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-md" />
        </div>
      }>
        <CategoryList
          initialCategories={categories}
          totalCount={count}
          currentPage={page}
          searchTerm={search}
        />
      </Suspense>
    </div>
  )
}
