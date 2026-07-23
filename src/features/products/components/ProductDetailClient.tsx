'use client'

import { useState, useEffect } from 'react'
import { SmartImage } from '@/components/ui/smart-image'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Star, Heart, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/useCartStore'
// import { toggleWishlist } from '@/actions/user/wishlist.actions'
import { toast } from 'sonner'
import { addRecentlyViewed } from '@/components/products/RecentlyViewed'
import { createClient } from '@/lib/supabase/client'
import { ProductCard } from './ProductCard'

interface ProductDetailClientProps {
  product: any
  variants: any[]
  initialFavorited?: boolean
}

export function ProductDetailClient({ product, variants, initialFavorited = false }: ProductDetailClientProps) {
  const { addItem, setIsOpen } = useCartStore()
  const [recommended, setRecommended] = useState<any[]>([])

  useEffect(() => {
    addRecentlyViewed(product)
  }, [product])

  useEffect(() => {
    const fetchRecommended = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .eq('is_active', true)
        .limit(4)
      if (data) {
        setRecommended(data)
      }
    }
    fetchRecommended()
  }, [product])
  
  const images = product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : [])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  const [selectedVariant, setSelectedVariant] = useState<any>(variants.length > 0 ? variants[0] : null)
  const [quantity, setQuantity] = useState(1)
  // const [isWishlisting, setIsWishlisting] = useState(false)
  // const [isFavorited, setIsFavorited] = useState(initialFavorited)

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

  // const handleToggleWishlist = async () => {
  //   setIsWishlisting(true)
  //   const res = await toggleWishlist(product.id)
  //   if (res.success) {
  //     setIsFavorited(res.isFavorited || false)
  //     toast.success(res.isFavorited ? 'Đã thêm vào danh sách yêu thích' : 'Đã xóa khỏi danh sách yêu thích')
  //   } else {
  //     toast.error(res.error)
  //   }
  //   setIsWishlisting(false)
  // }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  return (
    <div className="grid md:grid-cols-2 gap-10 pb-20 md:pb-0">
      {/* Product Images */}
      <div className="space-y-4">
        {/* Desktop Image View */}
        <div className="hidden md:block relative aspect-square bg-slate-100 rounded-2xl overflow-hidden group">
          <SmartImage
            productId={product.id}
            src={images[currentImageIndex]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
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

        {/* Mobile Swipe Gallery */}
        <div className="md:hidden relative aspect-square bg-slate-50 rounded-2xl overflow-hidden">
          <div 
            className="flex overflow-x-auto snap-x snap-mandatory h-full w-full scrollbar-none"
            onScroll={(e) => {
              const width = e.currentTarget.clientWidth
              if (width > 0) {
                const index = Math.round(e.currentTarget.scrollLeft / width)
                setCurrentImageIndex(index)
              }
            }}
          >
            {images.map((img: string, idx: number) => (
              <div key={idx} className="flex-shrink-0 w-full h-full snap-start relative">
                <SmartImage productId={product.id} src={img} alt={`${product.name} ${idx + 1}`} fill sizes="100vw" className="object-contain" />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full z-10">
              {currentImageIndex + 1}/{images.length}
            </div>
          )}
          {hasDiscount && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold text-xs z-10">
              -{Math.round((1 - finalPrice / basePrice) * 100)}%
            </div>
          )}
        </div>

        {/* Thumbnails (Desktop Only) */}
        {images.length > 1 && (
          <div className="hidden md:flex gap-4 overflow-x-auto pb-2">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={cn(
                  "relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer",
                  currentImageIndex === idx ? "border-emerald-600" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <SmartImage productId={product.id} src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover animate-fade-in" />
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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{product.name}</h1>
          
          <div className="flex items-end gap-3 mb-6">
            <span className="text-2xl md:text-3xl font-bold text-red-600">
              {Number(finalPrice).toLocaleString('vi-VN')}đ
            </span>
            {hasDiscount && (
              <span className="text-lg md:text-xl text-slate-400 line-through mb-1">
                {Number(basePrice).toLocaleString('vi-VN')}đ
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
                    "px-4 py-2 border rounded-xl text-sm font-medium transition-all cursor-pointer",
                    selectedVariant?.id === variant.id 
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold" 
                      : "border-slate-200 text-slate-700 hover:border-slate-300",
                    variant.stock <= 0 && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={variant.stock <= 0}
                  style={{ minHeight: '44px' }}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions (Desktop Only) */}
        <div className="mt-auto space-y-6 border-t pt-8 hidden md:block">
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden h-12">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-12 h-full flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                disabled={quantity <= 1}
              >
                -
              </button>
              <div className="w-12 h-full flex items-center justify-center font-medium border-x border-slate-200">
                {quantity}
              </div>
              <button 
                onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
                className="w-12 h-full flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-14 text-lg rounded-xl shadow-sm cursor-pointer"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="mr-2 w-5 h-5" />
              {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </Button>
            {/* Removed wishlist button */}
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

      {/* Mobile Sticky Add To Cart / Buy Now Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 md:hidden">
        {/* Removed mobile wishlist button */}
        <Button 
          variant="outline"
          className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-12 text-sm font-semibold rounded-xl cursor-pointer"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          style={{ minHeight: '44px' }}
        >
          Thêm vào giỏ
        </Button>
        <Button 
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12 text-sm font-semibold rounded-xl text-white shadow-sm cursor-pointer"
          onClick={() => {
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
            setIsOpen(true)
          }}
          disabled={isOutOfStock}
          style={{ minHeight: '44px' }}
        >
          Mua ngay
        </Button>
      </div>

      {/* Recommended Products */}
      {recommended.length > 0 && (
        <div className="mt-16 space-y-6 pb-24 md:pb-0">
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 border-b pb-3 border-slate-100 dark:border-slate-800">
            Sản phẩm tương tự
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {recommended.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
