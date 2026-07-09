'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductCard } from './ProductCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface ProductListClientProps {
  initialProducts: any[]
  categories: any[]
}

export function ProductListClient({ initialProducts, categories }: ProductListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState(initialProducts)

  useEffect(() => {
    setProducts(initialProducts)
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

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0 space-y-8">
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Bộ lọc
          </h3>
          
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-500 uppercase tracking-wider">Danh mục</Label>
              <div className="flex flex-col gap-2">
                <Button 
                  variant={currentCategory === 'all' ? 'default' : 'ghost'} 
                  className={`justify-start ${currentCategory === 'all' ? 'bg-emerald-600' : 'hover:bg-slate-100'}`}
                  onClick={() => updateFilters('category', 'all')}
                >
                  Tất cả sản phẩm
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={currentCategory === cat.slug ? 'default' : 'ghost'}
                    className={`justify-start ${currentCategory === cat.slug ? 'bg-emerald-600' : 'hover:bg-slate-100'}`}
                    onClick={() => updateFilters('category', cat.slug)}
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
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Tìm kiếm sản phẩm..." 
              className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-emerald-600"
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
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200 focus:ring-emerald-600">
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

        {initialProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-slate-200">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Không tìm thấy sản phẩm</h3>
            <p className="text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {initialProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
