import { CategoryService } from '@/services/category.service'
import { ProductRepository } from '@/repositories/product.repository'
import { SellerProductForm } from '@/features/seller/components/SellerProductForm'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chỉnh sửa sản phẩm | Sàn C2C',
  description: 'Chỉnh sửa thông tin niêm yết sản phẩm cá nhân',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditSellerProductPage({ params }: PageProps) {
  const { id } = await params

  const [product, { data: categories }] = await Promise.all([
    ProductRepository.getProductById(id),
    CategoryService.getPaginatedCategories(1, 100, ''),
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <SellerProductForm categories={categories || []} initialData={product} />
    </div>
  )
}
