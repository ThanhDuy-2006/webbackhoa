import { ProductForm } from '@/features/admin/products/components/ProductForm'
import { CategoryService } from '@/services/category.service'

export const revalidate = 0

export default async function CreateProductPage() {
  const { data: categories } = await CategoryService.getPaginatedCategories(1, 100, '') // Fetch up to 100 categories for the dropdown

  return (
    <div className="max-w-4xl mx-auto py-6">
      <ProductForm categories={categories} />
    </div>
  )
}
