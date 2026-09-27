import { ProductListClient } from '@/features/products/components/ProductListClient'
import { ProductService } from '@/services/product.service'
import { CategoryService } from '@/services/category.service'

export const revalidate = 30

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const categorySlug = typeof params.category === 'string' && params.category !== 'all' ? params.category : undefined
  const search = typeof params.q === 'string' ? params.q : ''
  const sort = typeof params.sort === 'string' ? params.sort : 'newest'
  
  const rawPage = parseInt(typeof params.page === 'string' ? params.page : '1', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const pageSize = 12

  // Parallelize category and product queries for maximum speed
  const [categories, { data: products, count: totalCount }] = await Promise.all([
    CategoryService.getStorefrontCategories(),
    ProductService.getStorefrontProducts({
      categorySlug,
      search,
      sort,
      page,
      pageSize
    })
  ])

  return (
    <div className="container mx-auto px-4 pt-6 pb-24 lg:pb-12 max-w-7xl">
      {/* Header Banner - Subtle, product-focused */}
      <div className="mb-6 md:mb-8 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-transparent p-5 md:p-6 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/40">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Tủ đồ & Sản phẩm Bách Hóa
        </h1>
        <p className="mt-1 text-xs md:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Quản lý thực phẩm tươi sạch, kiểm tra số lượng tồn kho và hạn sử dụng gia đình mỗi ngày.
        </p>
      </div>
      
      <ProductListClient 
        initialProducts={products} 
        categories={categories} 
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
      />
    </div>
  )
}
