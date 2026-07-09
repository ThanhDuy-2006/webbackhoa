'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { ProductService } from '@/services/product.service'
import { Product } from '@/types/product.type'
import Link from 'next/link'

export function StorefrontSearch() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  
  const debouncedSearch = useDebounce(searchTerm, 300)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearch.trim().length < 2) {
        setSuggestions([])
        return
      }
      setLoading(true)
      try {
        const { data } = await ProductService.getStorefrontProducts({
          search: debouncedSearch,
        })
        // Only show top 5 suggestions
        setSuggestions(data.slice(0, 5))
      } catch (error) {
        console.error('Failed to fetch search suggestions', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [debouncedSearch])

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      setIsFocused(false)
      router.push(`/san-pham?search=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-xl mx-4 hidden md:block">
      <form onSubmit={handleSubmit} className={`relative flex items-center bg-slate-100 rounded-full transition-all duration-300 ${isFocused ? 'ring-2 ring-emerald-500/20 bg-white shadow-sm' : ''}`}>
        <Search className="absolute left-4 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm tươi ngon..."
          className="w-full bg-transparent border-none py-2.5 pl-12 pr-12 text-sm text-slate-700 outline-none placeholder:text-slate-500 rounded-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        {loading && (
          <div className="absolute right-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {isFocused && debouncedSearch.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-50">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map(product => (
                <li key={product.id}>
                  <Link 
                    href={`/san-pham/${product.slug}`}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                    onClick={() => setIsFocused(false)}
                  >
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      <img 
                        src={product.image_url || 'https://placehold.co/100x100?text=SP'} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-emerald-600">
                          {(product.sale_price || product.price).toLocaleString('vi-VN')} VND
                        </span>
                        {product.sale_price && (
                          <span className="text-xs text-slate-400 line-through">
                            {product.price.toLocaleString('vi-VN')} VND
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
              <li>
                <button 
                  onClick={handleSubmit}
                  className="w-full p-3 text-center text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  Xem tất cả kết quả cho "{debouncedSearch}"
                </button>
              </li>
            </ul>
          ) : !loading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Không tìm thấy sản phẩm nào
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
