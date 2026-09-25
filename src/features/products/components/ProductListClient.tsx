'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductCard } from './ProductCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, AlertTriangle, Sparkles, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { motion } from 'framer-motion'
import { StorefrontProductSummary } from '@/types/product.type'
import { StorefrontCategorySummary } from '@/types/category.type'
import { getExpiryInfo } from '@/lib/expiry-utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

interface ProductListClientProps {
  initialProducts: StorefrontProductSummary[]
  categories: StorefrontCategorySummary[]
  page?: number
  pageSize?: number
  totalCount?: number
}

export function ProductListClient({ 
  initialProducts, 
  categories,
  page = 1,
  pageSize = 12,
  totalCount = 0
}: ProductListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<StorefrontProductSummary[]>(initialProducts)
  const [showExpiringOnly, setShowExpiringOnly] = useState(false)

  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  const displayedProducts = showExpiringOnly
    ? products.filter(p => p.expiry_date && getExpiryInfo(p.expiry_date).isUrgent)
    : products

  const currentCategory = searchParams.get('category') || 'all'
  const currentSort = searchParams.get('sort') || 'newest'
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // Reset page to 1 whenever a non-page filter changes
    if (key !== 'page') {
      params.set('page', '1')
    }

    router.push(`?${params.toString()}`)
  }

  const goToPage = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages))
    updateFilters('page', String(clamped))
  }

  const handleRefresh = async () => {
    router.refresh()
    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0 space-y-4 md:space-y-8">
          <div>
            <h3 className="font-semibold text-lg mb-4 hidden md:flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <SlidersHorizontal className="h-5 w-5" />
              Bộ lọc
            </h3>
            
            <div className="space-y-4 md:space-y-6">
              {/* Category Filter */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:block">Danh mục</Label>
                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none snap-x">
                  <Button 
                    variant={!showExpiringOnly && currentCategory === 'all' ? 'default' : 'ghost'} 
                    className={`justify-start shrink-0 snap-start h-10 md:h-9 rounded-full md:rounded-xl border md:border-transparent text-xs md:text-sm font-semibold cursor-pointer ${
                      !showExpiringOnly && currentCategory === 'all' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                    onClick={() => { setShowExpiringOnly(false); updateFilters('category', 'all'); }}
                    style={{ minHeight: '44px' }}
                  >
                    Tất cả sản phẩm
                  </Button>

                  {/* Urgent / Expiring Soon FIFO Filter */}
                  <Button 
                    variant={showExpiringOnly ? 'default' : 'ghost'} 
                    className={`justify-start shrink-0 snap-start h-10 md:h-9 rounded-full md:rounded-xl border text-xs md:text-sm font-semibold cursor-pointer transition-all ${
                      showExpiringOnly 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm' 
                        : 'hover:bg-amber-50 text-amber-800 border-amber-200 bg-amber-50/50'
                    }`}
                    onClick={() => setShowExpiringOnly(prev => !prev)}
                    style={{ minHeight: '44px' }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600 shrink-0" />
                    Cần dùng gấp (Cận date)
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat.id}
                      variant={currentCategory === cat.slug ? 'default' : 'ghost'}
                      className={`justify-start shrink-0 snap-start h-10 md:h-9 rounded-full md:rounded-xl border md:border-transparent text-xs md:text-sm font-semibold cursor-pointer ${
                        currentCategory === cat.slug 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                      onClick={() => updateFilters('category', cat.slug)}
                      style={{ minHeight: '44px' }}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {searchParams.get('q') && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold">
                  <span>Tìm kiếm: "{searchParams.get('q')}"</span>
                  <button 
                    onClick={() => updateFilters('q', null)}
                    className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-full p-0.5 cursor-pointer"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <span className="text-xs text-slate-500 font-medium">
                Tìm thấy <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalCount || displayedProducts.length}</strong> sản phẩm
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Label className="shrink-0 text-xs font-semibold text-slate-500">Sắp xếp:</Label>
              <Select value={currentSort} onValueChange={(val) => updateFilters('sort', val)}>
                <SelectTrigger className="w-full sm:w-[170px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-emerald-600 rounded-xl text-xs font-semibold h-9">
                  <SelectValue placeholder="Mới nhất">
                    {currentSort === 'newest' && 'Mới nhất'}
                    {currentSort === 'price_asc' && 'Giá: Thấp đến cao'}
                    {currentSort === 'price_desc' && 'Giá: Cao đến thấp'}
                    {currentSort === 'name_asc' && 'Tên: A-Z'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="price_asc">Giá: Thấp đến cao</SelectItem>
                  <SelectItem value="price_desc">Giá: Cao đến thấp</SelectItem>
                  <SelectItem value="name_asc">Tên: A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                {showExpiringOnly ? 'Không có sản phẩm cận date' : 'Không tìm thấy sản phẩm'}
              </h3>
              <p className="text-slate-500">
                {showExpiringOnly ? 'Tất cả sản phẩm trong kho đều còn hạn sử dụng an toàn!' : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'}
              </p>
            </div>
          ) : (
            <>
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6"
              >
                {displayedProducts.map((product, idx) => (
                  <ProductCard key={product.id} product={product} index={idx} priority={idx === 0} />
                ))}
              </motion.div>

              {/* Working Server-Side Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mb-24 md:mb-0 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Trang <strong className="text-slate-900 dark:text-slate-100">{page}</strong> / <strong>{totalPages}</strong> ({totalCount} sản phẩm)
                  </span>

                  <div className="flex items-center justify-center flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                      className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Trước
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .map((p, idx, arr) => {
                          const showEllipsis = idx > 0 && p - arr[idx - 1] > 1
                          return (
                            <div key={p} className="flex items-center gap-1">
                              {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                              <Button
                                variant={p === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(p)}
                                className={`h-9 w-9 rounded-xl font-bold cursor-pointer ${
                                  p === page 
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                    : "border-slate-200 dark:border-slate-800"
                                }`}
                              >
                                {p}
                              </Button>
                            </div>
                          )
                        })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages}
                      className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer disabled:opacity-50"
                    >
                      Sau
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </PullToRefresh>
  )
}
