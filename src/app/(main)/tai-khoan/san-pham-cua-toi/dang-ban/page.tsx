import { CategoryService } from '@/services/category.service'
import { SellerProductForm } from '@/features/seller/components/SellerProductForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Đăng bán sản phẩm mới | Sàn C2C',
  description: 'Tạo niêm yết đăng bán sản phẩm mới công khai tức thì',
}

export default async function CreateSellerProductPage() {
  const { data: categories } = await CategoryService.getPaginatedCategories(1, 100, '')

  return (
    <div className="space-y-6">
      <SellerProductForm categories={categories || []} />
    </div>
  )
}
