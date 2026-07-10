'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { toast } from 'sonner'

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
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, setIsOpen } = useCartStore()
  const isOutOfStock = product.stock <= 0
  const finalPrice = product.sale_price || product.price
  const hasDiscount = product.sale_price !== null && product.sale_price < product.price

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.images?.[0] || product.image_url || '',
      quantity: 1,
      stock: product.stock
    })
    toast.success('Đã thêm vào giỏ hàng')
  }

  return (
    <Card className="group overflow-hidden rounded-2xl border-transparent shadow-[0_2px_12px_rgba(0,0,0,0.04)] bg-white transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 flex flex-col h-full">
      <Link href={`/san-pham/${product.slug}`} className="block relative">
        <div className="relative aspect-[4/3] sm:aspect-square overflow-hidden bg-white p-6">
          <Image
            src={product.images?.[0] || product.image_url || 'https://placehold.co/400x400?text=ĐANG+UPDATE'}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            className="object-contain transition-transform duration-500 group-hover:scale-105"
          />
          {hasDiscount && (
            <div className="absolute left-3 top-3 rounded bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
              -{Math.round((1 - finalPrice / product.price) * 100)}%
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
              <span className="bg-slate-900/80 text-white px-3 py-1.5 rounded-full font-medium text-xs backdrop-blur-md">
                Hết hàng
              </span>
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
        <Link href={`/san-pham/${product.slug}`} className="block">
          <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-slate-800 transition-colors group-hover:text-emerald-600 leading-snug min-h-[2.5rem]">
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
            <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-none truncate">
              {Number(finalPrice).toLocaleString('vi-VN')} <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500">VND</span>
            </span>
          </div>
          
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
    </Card>
  )
}
