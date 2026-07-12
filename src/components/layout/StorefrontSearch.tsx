'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, ArrowLeft, X, Flame } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { ProductService } from '@/services/product.service'
import { Product } from '@/types/product.type'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export function StorefrontSearch() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  
  const debouncedSearch = useDebounce(searchTerm, 300)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const hotSearches = ['Cá hồi Na Uy', 'Thịt bò Úc', 'Táo Envy', 'Trà xanh Ô Long', 'Hạt Macca']

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
        setSuggestions(data.slice(0, 5))
      } catch (error) {
        console.error('Failed to fetch search suggestions', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [debouncedSearch])

  // Handle clicking outside to close suggestions (desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto focus mobile input when opened
  useEffect(() => {
    if (isMobileOpen) {
      setTimeout(() => {
        mobileInputRef.current?.focus()
      }, 150)
    }
  }, [isMobileOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      setIsFocused(false)
      setIsMobileOpen(false)
      router.push(`/?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const handleHotSearchClick = (keyword: string) => {
    setSearchTerm(keyword)
    setIsMobileOpen(false)
    router.push(`/?q=${encodeURIComponent(keyword)}`)
  }

  return (
    <>
      {/* Desktop Search */}
      <div ref={searchRef} className="relative w-full max-w-md mx-4 hidden md:block z-40">
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

        {/* Suggestions Dropdown (Desktop) */}
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
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 relative">
                        <Image 
                          src={product.image_url || 'https://placehold.co/100x100?text=SP'} 
                          alt={product.name} 
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold text-emerald-600">
                            {(product.sale_price || product.price).toLocaleString('vi-VN')}đ
                          </span>
                          {product.sale_price && (
                            <span className="text-xs text-slate-400 line-through">
                              {product.price.toLocaleString('vi-VN')}đ
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
                    className="w-full p-3 text-center text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-slate-100 cursor-pointer"
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

      {/* Mobile Search Trigger Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 text-slate-700 shrink-0 cursor-pointer"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Mobile Fullscreen Search Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-white z-[999] flex flex-col md:hidden"
          >
            {/* Overlay Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 pt-[calc(12px+env(safe-area-inset-top))]">
              <button
                onClick={() => {
                  setIsMobileOpen(false)
                  setSearchTerm('')
                }}
                className="p-1 rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"
                style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              
              <form onSubmit={handleSubmit} className="flex-1 relative flex items-center bg-slate-100 rounded-full py-1">
                <Search className="absolute left-4 h-4 w-4 text-slate-400" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full bg-transparent border-none py-2 pl-10 pr-10 text-sm text-slate-700 outline-none rounded-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 p-1 rounded-full text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>

            {/* Suggestions & Hot Keywords */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {searchTerm.trim().length >= 2 ? (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Kết quả gợi ý</h4>
                  {loading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {suggestions.map(product => (
                        <Link
                          key={product.id}
                          href={`/san-pham/${product.slug}`}
                          className="flex items-center gap-3 py-3"
                          onClick={() => setIsMobileOpen(false)}
                        >
                          <div className="h-10 w-10 rounded bg-slate-100 overflow-hidden shrink-0 relative">
                            <Image
                              src={product.image_url || 'https://placehold.co/100x100?text=SP'}
                              alt={product.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate flex-1">{product.name}</span>
                        </Link>
                      ))}
                      <button
                        type="submit"
                        onClick={handleSubmit}
                        className="w-full text-center text-sm font-medium text-emerald-600 py-3 block cursor-pointer"
                      >
                        Xem tất cả kết quả
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 py-4 text-center">Không tìm thấy sản phẩm nào</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Hot Searches */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                      Tìm kiếm phổ biến
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {hotSearches.map(keyword => (
                        <button
                          key={keyword}
                          onClick={() => handleHotSearchClick(keyword)}
                          className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-full cursor-pointer border border-slate-100"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
