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
    <div className="container mx-auto px-4 pt-8 pb-24 lg:pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sản phẩm</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Khám phá các sản phẩm thực phẩm tươi sạch, an toàn mỗi ngày với giá tốt nhất.</p>
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
