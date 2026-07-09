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
    <Card className="group overflow-hidden rounded-2xl border-transparent shadow-[0_2px_12px_rgba(0,0,0,0.04)] bg-white transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
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
      
      <div className="p-4 sm:p-5 flex flex-col justify-between">
        <Link href={`/san-pham/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm sm:text-base font-medium text-slate-800 transition-colors group-hover:text-emerald-600 mb-1 leading-snug">
            {product.name}
          </h3>
        </Link>
        
        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-xs sm:text-sm text-slate-400 line-through mb-0.5">
                {Number(product.price).toLocaleString('vi-VN')} VND
              </span>
            )}
            <span className="text-base sm:text-lg font-bold text-slate-900">
              {Number(finalPrice).toLocaleString('vi-VN')} VND
            </span>
          </div>
          
          <Button 
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shrink-0" 
            disabled={isOutOfStock}
            aria-label="Thêm vào giỏ hàng"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
