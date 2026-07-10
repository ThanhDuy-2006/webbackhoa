'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Eye } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { toast } from 'sonner'
import { useState } from 'react'
import { QuickViewSheet } from '@/components/products/QuickViewSheet'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    sale_price: number | null
    images: string[]
    image_url?: string | null
    stock: number
    description?: string | null
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore()
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const isOutOfStock = product.stock <= 0
  const finalPrice = product.sale_price || product.price
  const hasDiscount = product.sale_price !== null && product.sale_price < product.price
  const images = product.images || [product.image_url]

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: images[0] || '',
      quantity: 1,
      stock: product.stock
    })
    toast.success('Đã thêm vào giỏ hàng')
  }

  return (
    <>
      <Card className="group overflow-hidden rounded-2xl border-transparent shadow-[0_2px_12px_rgba(0,0,0,0.04)] bg-white dark:bg-slate-900 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 flex flex-col h-full">
        <Link href={`/san-pham/${product.slug}`} className="block relative">
          <div className="relative aspect-[4/3] sm:aspect-square overflow-hidden bg-white dark:bg-slate-950 p-6">
            <ProgressiveImage
              src={images[0] || 'https://placehold.co/400x400?text=ĐANG+UPDATE'}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              className="object-contain transition-transform duration-500 group-hover:scale-105"
            />
            {hasDiscount && (
              <div className="absolute left-3 top-3 rounded bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-sm z-10">
                -{Math.round((1 - finalPrice / product.price) * 100)}%
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                <span className="bg-slate-900/80 text-white px-3 py-1.5 rounded-full font-medium text-xs backdrop-blur-md">
                  Hết hàng
                </span>
              </div>
            )}
            {/* Desktop Quick View Hover Overlay */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center z-25">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/95 text-slate-800 font-bold rounded-full shadow-md hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer h-9 px-4"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsQuickViewOpen(true)
                }}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Xem nhanh
              </Button>
            </div>
          </div>
        </Link>
        
        <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 dark:bg-slate-900">
          <Link href={`/san-pham/${product.slug}`} className="block">
            <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors group-hover:text-emerald-600 leading-snug min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>
          
          <div className="mt-3 flex items-end justify-between gap-1.5">
            <div className="flex flex-col min-w-0">
              {hasDiscount && (
                <span className="text-[10px] sm:text-xs text-slate-400 line-through mb-0.5 truncate">
                  {Number(product.price).toLocaleString('vi-VN')} <span className="text-[8px] sm:text-[9px]">VND</span>
                </span>
              )}
              <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-slate-100 leading-none truncate">
                {Number(finalPrice).toLocaleString('vi-VN')} <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500">VND</span>
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Mobile Quick View Action Button */}
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center md:hidden bg-white dark:bg-slate-950"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsQuickViewOpen(true)
                }}
                style={{ minWidth: '32px', minHeight: '32px' }}
                aria-label="Xem nhanh"
              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
              </Button>

              <Button 
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shrink-0 cursor-pointer" 
                disabled={isOutOfStock}
                aria-label="Thêm vào giỏ hàng"
                onClick={handleAddToCart}
                style={{ minWidth: '32px', minHeight: '32px' }}
              >
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick View Sheet */}
      <QuickViewSheet
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  )
}
