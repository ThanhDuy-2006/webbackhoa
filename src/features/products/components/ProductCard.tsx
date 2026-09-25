'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { MorphAddToCartIcon } from '@/components/ui/morph-icon'
import { useCartStore } from '@/store/useCartStore'
import { toast } from 'sonner'
import { useState } from 'react'
import { motion, Variants } from 'framer-motion'
import { QuickViewSheet } from '@/components/products/QuickViewSheet'
import { SmartImage } from '@/components/ui/smart-image'
import { StorefrontProductSummary } from '@/types/product.type'
import { formatCurrency, cn } from '@/lib/utils'
import { ExpiryBadge } from '@/components/products/ExpiryBadge'

interface ProductCardProps {
  product: StorefrontProductSummary
  index?: number
  priority?: boolean
}

const itemVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } }
}

export function ProductCard({ product, index = 0, priority = false }: ProductCardProps) {
  const { addItem } = useCartStore()
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const isOutOfStock = product.stock <= 0
  const isLowStock = product.stock > 0 && product.stock <= 5
  const price = Number(product.price)
  const finalPrice = product.sale_price ? Number(product.sale_price) : price
  const hasDiscount = product.sale_price !== null && Number(product.sale_price) < price
  const displayImage = product.image_url || '/images/product-placeholder.png'

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: displayImage,
      quantity: 1,
      stock: product.stock
    })
    setIsAdded(true)
    toast.success('Đã thêm vào giỏ hàng')
    setTimeout(() => setIsAdded(false), 1600)
  }

  return (
    <>
      <motion.div variants={itemVariants} className="h-full">
        <Card className="group overflow-hidden rounded-2xl border border-slate-100/80 dark:border-slate-850 shadow-xs bg-white dark:bg-slate-900 transition-all duration-300 hover:shadow-md hover:-translate-y-1 flex flex-col h-full relative z-0 hover:z-10">
          
          {/* Top image link */}
          <Link href={`/san-pham/${product.slug}`} className="block relative" aria-label={product.name}>
            <div className="relative aspect-square overflow-hidden bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-5">
              <SmartImage
                productId={product.id}
                src={displayImage}
                alt={product.name}
                fill
                priority={priority}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
              />

              {/* Discount Badge */}
              {hasDiscount && (
                <div className="absolute left-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs z-10">
                  -{Math.round((1 - finalPrice / price) * 100)}%
                </div>
              )}

              {/* Out of stock overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <span className="bg-slate-900/90 text-white px-3 py-1 rounded-full font-bold text-xs shadow-sm">
                    Hết hàng
                  </span>
                </div>
              )}

              {/* Desktop Quick View Hover Overlay */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center z-20">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/95 text-slate-800 font-bold rounded-full shadow-md hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer h-9 px-4 text-xs"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsQuickViewOpen(true)
                  }}
                  aria-label="Xem nhanh sản phẩm"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Xem nhanh
                </Button>
              </div>
            </div>
          </Link>
          
          {/* Card Body */}
          <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 dark:bg-slate-900 gap-2">
            <div>
              <Link href={`/san-pham/${product.slug}`} className="block">
                <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors group-hover:text-emerald-600 leading-snug min-h-[2.25rem]">
                  {product.name}
                </h3>
              </Link>

              {/* Dynamic Badges: Low Stock & Expiry */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {isLowStock && (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/50">
                    Chỉ còn {product.stock}
                  </span>
                )}
                {product.expiry_date && (
                  <ExpiryBadge expiryDate={product.expiry_date} size="sm" />
                )}
              </div>
            </div>
            
            {/* Price & Add to Cart */}
            <div className="pt-2 mt-auto border-t border-slate-100/60 dark:border-slate-800/60 flex items-end justify-between gap-2">
              <div className="flex flex-col min-w-0">
                {hasDiscount && (
                  <span className="text-[11px] text-slate-400 line-through leading-none mb-1 truncate">
                    {formatCurrency(price)}
                  </span>
                )}
                <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 leading-none truncate">
                  {formatCurrency(finalPrice)}
                </span>
              </div>
              
              <Button 
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer",
                  isAdded 
                    ? "bg-emerald-500 text-white scale-105" 
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
                disabled={isOutOfStock}
                aria-label={isAdded ? "Đã thêm vào giỏ" : `Thêm ${product.name} vào giỏ`}
                onClick={handleAddToCart}
                style={{ minWidth: '36px', minHeight: '36px' }}
              >
                <MorphAddToCartIcon isAdded={isAdded} size={16} />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <QuickViewSheet
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  )
}
