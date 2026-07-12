'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductCard } from './ProductCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, SlidersHorizontal } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { ProductSkeleton } from '@/components/ui/ProductSkeleton'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

interface ProductListClientProps {
  initialProducts: any[]
  categories: any[]
}

export function ProductListClient({ initialProducts, categories }: ProductListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [products, setProducts] = useState(initialProducts)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialProducts.length >= 8)
  const loaderRef = useRef<HTMLDivElement>(null)

  // Reset list when server-side initialProducts changes (due to filter changes)
  useEffect(() => {
    setProducts(initialProducts)
    setHasMore(initialProducts.length >= 8)
  }, [initialProducts])

  const currentCategory = searchParams.get('category') || 'all'
  const currentSort = searchParams.get('sort') || 'newest'

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  // Cursor-based pagination fetch
  const fetchMoreProducts = async () => {
    if (isLoadingMore || !hasMore || products.length === 0) return
    setIsLoadingMore(true)

    const lastItem = products[products.length - 1]
    const supabase = createClient()

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)

    // Category filter
    if (currentCategory !== 'all') {
      const cat = categories.find(c => c.slug === currentCategory)
      if (cat) {
        query = query.eq('category_id', cat.id)
      }
    }

    // Search query filter
    const searchVal = searchParams.get('q')
    if (searchVal) {
      query = query.ilike('name', `%${searchVal}%`)
    }

    // Cursor pagination depending on Sort order
    if (currentSort === 'price_asc') {
      query = query
        .or(`price.gt.${lastItem.price},and(price.eq.${lastItem.price},id.gt.${lastItem.id})`)
        .order('price', { ascending: true })
        .order('id', { ascending: true })
    } else if (currentSort === 'price_desc') {
      query = query
        .or(`price.lt.${lastItem.price},and(price.eq.${lastItem.price},id.lt.${lastItem.id})`)
        .order('price', { ascending: false })
        .order('id', { ascending: false })
    } else if (currentSort === 'name_asc') {
      query = query
        .or(`name.gt.${lastItem.name},and(name.eq.${lastItem.name},id.gt.${lastItem.id})`)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
    } else {
      // default: newest (created_at desc)
      query = query
        .or(`created_at.lt.${lastItem.created_at},and(created_at.eq.${lastItem.created_at},id.lt.${lastItem.id})`)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    }

    // Limit to page size
    const PAGE_SIZE = 8
    query = query.limit(PAGE_SIZE)

    try {
      const { data, error } = await query
      if (error) throw error

      if (data) {
        if (data.length < PAGE_SIZE) {
          setHasMore(false)
        }
        setProducts(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(p => p.id))
          const newItems = data.filter(p => !existingIds.has(p.id))
          return [...prev, ...newItems]
        })
      }
    } catch (err) {
      console.error('Error fetching more products:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Pull to refresh callback
  const handleRefresh = async () => {
    router.refresh()
    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  // IntersectionObserver trigger
  useEffect(() => {
    if (!hasMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreProducts()
        }
      },
      { threshold: 0.2, rootMargin: '100px' }
    )

    const currentLoader = loaderRef.current
    if (currentLoader) {
      observer.observe(currentLoader)
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader)
      }
    }
  }, [hasMore, isLoadingMore, products])

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
                    variant={currentCategory === 'all' ? 'default' : 'ghost'} 
                    className={`justify-start shrink-0 snap-start h-10 md:h-9 rounded-full md:rounded-xl border md:border-transparent text-xs md:text-sm font-semibold cursor-pointer ${
                      currentCategory === 'all' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                    onClick={() => updateFilters('category', 'all')}
                    style={{ minHeight: '44px' }}
                  >
                    Tất cả sản phẩm
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
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Tìm kiếm sản phẩm..." 
                className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-600"
                defaultValue={searchParams.get('q') || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateFilters('q', e.currentTarget.value)
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Label className="shrink-0 text-sm font-medium text-slate-500">Sắp xếp:</Label>
              <Select value={currentSort} onValueChange={(val) => updateFilters('sort', val)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-emerald-600">
                  <SelectValue placeholder="Mới nhất">
                    {currentSort === 'newest' && 'Mới nhất'}
                    {currentSort === 'price_asc' && 'Giá: Thấp đến cao'}
                    {currentSort === 'price_desc' && 'Giá: Cao đến thấp'}
                    {currentSort === 'name_asc' && 'Tên: A-Z'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="price_asc">Giá: Thấp đến cao</SelectItem>
                  <SelectItem value="price_desc">Giá: Cao đến thấp</SelectItem>
                  <SelectItem value="name_asc">Tên: A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Không tìm thấy sản phẩm</h3>
              <p className="text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6"
            >
              {products.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} priority={idx < 4} />
              ))}
            </motion.div>
          )}

          {/* Loading Indicator for Infinite Scroll */}
          {hasMore && (
            <div ref={loaderRef} className="pt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              <ProductSkeleton count={4} />
            </div>
          )}
        </main>
      </div>
    </PullToRefresh>
  )
}
