'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit3, PauseCircle, PlayCircle, Trash2, AlertTriangle, Package, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Product } from '@/types/product.type'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { pauseSellerProductAction, activateSellerProductAction, softDeleteSellerProductAction } from '@/actions/seller-product.actions'
import { SmartImage } from '@/components/ui/smart-image'

interface SellerProductListProps {
  products: Product[]
  totalCount: number
  currentPage: number
  currentSearch: string
  currentStatus: string
}

export function SellerProductList({
  products,
  totalCount,
  currentPage,
  currentSearch,
  currentStatus,
}: SellerProductListProps) {
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentStatus !== 'all') params.set('status', currentStatus)
    params.set('page', '1')
    router.push(`/tai-khoan/san-pham-cua-toi?${params.toString()}`)
  }

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams()
    if (currentSearch) params.set('search', currentSearch)
    if (status !== 'all') params.set('status', status)
    params.set('page', '1')
    router.push(`/tai-khoan/san-pham-cua-toi?${params.toString()}`)
  }

  const totalPages = Math.ceil(totalCount / 10)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams()
    if (currentSearch) params.set('search', currentSearch)
    if (currentStatus !== 'all') params.set('status', currentStatus)
    params.set('page', newPage.toString())
    router.push(`/tai-khoan/san-pham-cua-toi?${params.toString()}`)
  }

  const handleTogglePause = async (product: Product) => {
    setLoadingId(product.id)
    try {
      if (product.listing_status === 'active') {
        const res = await pauseSellerProductAction(product.id)
        if (res.success) toast.success('Đã tạm dừng đăng bán sản phẩm')
        else toast.error(res.error || 'Lỗi khi tạm dừng')
      } else if (product.listing_status === 'paused') {
        const res = await activateSellerProductAction(product.id)
        if (res.success) toast.success('Đã tiếp tục đăng bán sản phẩm')
        else toast.error(res.error || 'Lỗi khi kích hoạt lại')
      }
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}"?`)) return
    setLoadingId(id)
    try {
      const res = await softDeleteSellerProductAction(id)
      if (res.success) {
        toast.success('Đã xóa sản phẩm thành công')
        router.refresh()
      } else {
        toast.error(res.error || 'Không thể xóa sản phẩm')
      }
    } finally {
      setLoadingId(null)
    }
  }

  const getStatusBadge = (status?: string, reason?: string | null) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Đang bán</span>
      case 'paused':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Tạm dừng</span>
      case 'draft':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Nháp</span>
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800" title={reason || 'Vi phạm chính sách'}>
            <AlertTriangle className="w-3 h-3 mr-1" /> Bị tạm khóa
          </span>
        )
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Hoạt động</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sản phẩm của tôi</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý và đăng bán sản phẩm cá nhân công khai tức thì</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tai-khoan/san-pham-cua-toi/import">
            <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
              Nhập từ Excel
            </Button>
          </Link>
          <Link href="/tai-khoan/san-pham-cua-toi/dang-ban">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200">
              <Plus className="w-4 h-4" /> Đăng bán mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên sản phẩm..."
              className="pl-9 rounded-xl border-slate-200"
            />
          </div>
          <Button type="submit" variant="secondary" className="rounded-xl">Tìm kiếm</Button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'active', label: 'Đang bán' },
            { id: 'paused', label: 'Tạm dừng' },
            { id: 'draft', label: 'Bản nháp' },
            { id: 'suspended', label: 'Bị tạm khóa' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentStatus === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">Chưa có sản phẩm nào</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Bạn chưa có sản phẩm nào trong danh mục này. Hãy bắt đầu đăng bán ngay hôm nay!</p>
          <Link href="/tai-khoan/san-pham-cua-toi/dang-ban" className="inline-block mt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Đăng bán sản phẩm đầu tiên
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {products.map((product) => (
            <div key={product.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200">
                  <SmartImage
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 truncate text-sm">{product.name}</h3>
                    {getStatusBadge(product.listing_status, product.suspension_reason)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(product.sale_price || product.price)}</span>
                    {product.sale_price && <span className="line-through text-slate-400">{formatCurrency(product.price)}</span>}
                    <span>• Tồn kho: <strong className={product.stock > 0 ? 'text-slate-800' : 'text-rose-600'}>{product.stock}</strong></span>
                  </div>
                  {product.suspension_reason && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                      <strong>Lý do khóa:</strong> {product.suspension_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {product.listing_status === 'active' && (
                  <Link href={`/san-pham/${product.slug}`} target="_blank" className="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-white" title="Xem trên Web">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}

                {product.listing_status !== 'suspended' && (
                  <>
                    <Link href={`/tai-khoan/san-pham-cua-toi/${product.id}/chinh-sua`}>
                      <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs">
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Sửa
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingId === product.id}
                      onClick={() => handleTogglePause(product)}
                      className="rounded-lg h-9 text-xs"
                    >
                      {product.listing_status === 'active' ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Tạm dừng
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Mở lại
                        </>
                      )}
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loadingId === product.id}
                  onClick={() => handleDelete(product.id, product.name)}
                  className="rounded-lg h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  title="Xóa sản phẩm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 sm:px-6 rounded-b-2xl">
              <p className="text-sm text-slate-700 hidden sm:block">
                Hiển thị <span className="font-semibold">{(currentPage - 1) * 10 + 1}</span> - <span className="font-semibold">{Math.min(currentPage * 10, totalCount)}</span> trong tổng <span className="font-semibold">{totalCount}</span>
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                </Button>
                <span className="text-sm font-medium text-slate-700 mx-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-xl"
                >
                  Sau <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
