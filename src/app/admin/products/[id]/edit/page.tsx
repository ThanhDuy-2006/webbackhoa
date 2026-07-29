import { ProductForm } from '@/features/admin/products/components/ProductForm'
import { CategoryService } from '@/services/category.service'
import { ProductRepository } from '@/repositories/product.repository'
import { notFound } from 'next/navigation'

export const revalidate = 0

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  
  const [product, categoriesRes] = await Promise.all([
    ProductRepository.getProductById(resolvedParams.id),
    CategoryService.getPaginatedCategories(1, 100, '').catch(() => ({ data: [], count: 0 }))
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <ProductForm initialData={product} categories={categoriesRes.data || []} />
    </div>
  )
}
