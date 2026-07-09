import { ProductImportClient } from '@/features/admin/products/components/ProductImportClient'
import { CategoryService } from '@/services/category.service'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 0

export default async function ImportProductPage() {
  const { data: categories } = await CategoryService.getPaginatedCategories(1, 100, '')

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/admin/products" className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nhập sản phẩm hàng loạt</h1>
          <p className="text-slate-500">Thêm nhiều sản phẩm cùng lúc bằng file Excel hoặc văn bản (Text/CSV).</p>
        </div>
      </div>
      
      <ProductImportClient categories={categories} />
    </div>
  )
}
