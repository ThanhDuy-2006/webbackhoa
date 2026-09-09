import { Suspense } from 'react'
import { SellerProductImportClient } from '@/features/seller/components/SellerProductImportClient'
import { CategoryService } from '@/services/category.service'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ scan?: string }>
}

export default async function ImportSellerProductPage({ searchParams }: PageProps) {
  const params = await searchParams
  const initialScan = params?.scan === 'true'
  const { data: categories } = await CategoryService.getPaginatedCategories(1, 100, '')

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <Link href="/tai-khoan/san-pham-cua-toi" className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nhập sản phẩm hàng loạt</h1>
          <p className="text-sm text-slate-500 mt-1">Thêm nhiều sản phẩm cùng lúc bằng file Excel, quét hóa đơn hoặc văn bản (Text/CSV).</p>
        </div>
      </div>
      
      <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang tải biểu mẫu nhập hàng...</div>}>
        <SellerProductImportClient categories={categories || []} initialScan={initialScan} />
      </Suspense>
    </div>
  )
}

