'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Star, Heart, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/useCartStore'
import { toggleWishlist } from '@/actions/user/wishlist.actions'
import { toast } from 'sonner'

interface ProductDetailClientProps {
  product: any
  variants: any[]
  initialFavorited?: boolean
}

export function ProductDetailClient({ product, variants, initialFavorited = false }: ProductDetailClientProps) {
  const { addItem, setIsOpen } = useCartStore()
  
  const images = product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : [])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Variants handling (assuming basic color/size grouped logic if available, or just single selection)
  const [selectedVariant, setSelectedVariant] = useState<any>(variants.length > 0 ? variants[0] : null)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisting, setIsWishlisting] = useState(false)
  const [isFavorited, setIsFavorited] = useState(initialFavorited) // You could pass initial state from server

  const finalPrice = selectedVariant 
    ? selectedVariant.price || product.sale_price || product.price
    : product.sale_price || product.price
    
  const basePrice = product.price
  const hasDiscount = finalPrice < basePrice

  const maxStock = selectedVariant ? selectedVariant.stock : product.stock
  const isOutOfStock = maxStock <= 0

  const handleAddToCart = () => {
    if (isOutOfStock) return
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: images[0] || '',
      quantity,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      stock: maxStock
    })
    toast.success('Đã thêm vào giỏ hàng')
  }

  const handleToggleWishlist = async () => {
    setIsWishlisting(true)
    const res = await toggleWishlist(product.id)
    if (res.success) {
      setIsFavorited(res.isFavorited || false)
      toast.success(res.isFavorited ? 'Đã thêm vào danh sách yêu thích' : 'Đã xóa khỏi danh sách yêu thích')
    } else {
      toast.error(res.error)
    }
    setIsWishlisting(false)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  return (
    <div className="grid md:grid-cols-2 gap-10">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden group">
          <Image
            src={images[currentImageIndex] || 'https://placehold.co/800x800?text=ĐANG+UPDATE'}
            alt={product.name}
            fill
            className="object-contain"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          {hasDiscount && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold">
              -{Math.round((1 - finalPrice / basePrice) * 100)}%
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={cn(
                  "relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                  currentImageIndex === idx ? "border-emerald-600" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-col">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-emerald-600 font-medium">{product.categories?.name}</span>
            <div className="flex items-center text-amber-400 text-sm">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <span className="text-slate-500 ml-1">(0 đánh giá)</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{product.name}</h1>
          
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-bold text-red-600">
              {Number(finalPrice).toLocaleString('vi-VN')} VND
            </span>
            {hasDiscount && (
              <span className="text-xl text-slate-400 line-through mb-1">
                {Number(basePrice).toLocaleString('vi-VN')} VND
              </span>
            )}
          </div>
          
          <div className="prose prose-sm text-slate-600 mb-8" dangerouslySetInnerHTML={{ __html: product.description || 'Chưa có mô tả' }} />
        </div>

        {/* Variants */}
        {variants.length > 0 && (
          <div className="mb-8 space-y-4">
            <h3 className="font-medium text-slate-900">Tùy chọn:</h3>
            <div className="flex flex-wrap gap-3">
              {variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => {
                    setSelectedVariant(variant)
                    setQuantity(1)
                  }}
                  className={cn(
                    "px-4 py-2 border rounded-xl text-sm font-medium transition-all",
                    selectedVariant?.id === variant.id 
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700" 
                      : "border-slate-200 text-slate-700 hover:border-slate-300",
                    variant.stock <= 0 && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={variant.stock <= 0}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto space-y-6 border-t pt-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden h-12">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-12 h-full flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                disabled={quantity <= 1}
              >
                -
              </button>
              <div className="w-12 h-full flex items-center justify-center font-medium border-x border-slate-200">
                {quantity}
              </div>
              <button 
                onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
                className="w-12 h-full flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                disabled={quantity >= maxStock}
              >
                +
              </button>
            </div>
            <div className="text-sm text-slate-500">
              {maxStock > 0 ? `Còn ${maxStock} sản phẩm` : 'Hết hàng'}
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-14 text-lg rounded-xl"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="mr-2 w-5 h-5" />
              {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className={cn("h-14 w-14 shrink-0 rounded-xl transition-colors", isFavorited && "border-red-500 bg-red-50")}
              onClick={handleToggleWishlist}
              disabled={isWishlisting}
            >
              <Heart className={cn("w-5 h-5", isFavorited ? "text-red-500 fill-red-500" : "text-slate-600")} />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 pt-4">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Giao hàng toàn quốc</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Đổi trả trong 7 ngày</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
