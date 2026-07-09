import { ProductListClient } from '@/features/products/components/ProductListClient'
import { ProductService } from '@/services/product.service'
import { CategoryService } from '@/services/category.service'

export const revalidate = 0

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  
  const categorySlug = typeof params.category === 'string' && params.category !== 'all' ? params.category : undefined
  const search = typeof params.q === 'string' ? params.q : ''
  const sort = typeof params.sort === 'string' ? params.sort : 'newest'
  
  const { data: categories } = await CategoryService.getPaginatedCategories(1, 100, '')
  
  // Custom fetch for user product list (only active products, with filter/sort)
  // We can reuse getPaginatedProducts but we need sort and category slug.
  // Wait, ProductService.getPaginatedProducts doesn't accept categorySlug or sort.
  // I will add a custom method for user storefront in ProductService or just use getPaginatedProducts and filter later if it's small, 
  // but let's assume we can fetch them via a new service method `getStorefrontProducts`.
  const { data: products } = await ProductService.getStorefrontProducts({
    categorySlug,
    search,
    sort
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sản phẩm</h1>
        <p className="mt-2 text-slate-600">Khám phá các sản phẩm thực phẩm tươi sạch, an toàn mỗi ngày với giá tốt nhất.</p>
      </div>
      
      <ProductListClient initialProducts={products} categories={categories} />
    </div>
  )
}
