import { ProductForm } from '@/features/admin/products/components/ProductForm'
import { CategoryService } from '@/services/category.service'
import { ProductRepository } from '@/repositories/product.repository'
import { notFound } from 'next/navigation'

export const revalidate = 0

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  
  let product
  let categories
  try {
    product = await ProductRepository.getProductById(resolvedParams.id)
    const { data } = await CategoryService.getPaginatedCategories(1, 100, '')
    categories = data
  } catch (error) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <ProductForm initialData={product} categories={categories} />
    </div>
  )
}
