'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Plus, Minus } from 'lucide-react'
import { SmartImage } from '@/components/ui/smart-image'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/useCartStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface QuickViewSheetProps {
  product: any
  isOpen: boolean
  onClose: () => void
}

export function QuickViewSheet({ product, isOpen, onClose }: QuickViewSheetProps) {
  const { addItem, setIsOpen: setCartOpen } = useCartStore()
  const [quantity, setQuantity] = useState(1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!product) return null

  const price = Number(product.price)
  const finalPrice = product.sale_price ? Number(product.sale_price) : price
  const hasDiscount = product.sale_price && price > finalPrice
  const isOutOfStock = product.stock <= 0
  const images = product.images || [product.image_url]

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: images[0] || '',
      quantity: quantity,
      stock: product.stock
    })
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`)
    onClose()
  }

  const handleBuyNow = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: images[0] || '',
      quantity: quantity,
      stock: product.stock
    })
    onClose()
    setCartOpen(true)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] shadow-[0_-8px_32px_rgba(0,0,0,0.15)] flex flex-col pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3.5 shrink-0 cursor-pointer" onClick={onClose} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Xem nhanh sản phẩm</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Images Gallery */}
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <SmartImage
                      productId={product.id}
                      src={images[currentImageIndex]}
                      alt={product.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {images.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={cn(
                            "relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer",
                            currentImageIndex === idx ? "border-emerald-600" : "border-slate-100 dark:border-slate-800"
                          )}
                        >
                          <SmartImage productId={product.id} src={img} alt="" fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta details */}
                <div className="w-full md:w-1/2 space-y-5">
                  <div className="space-y-2">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">{product.name}</h1>
                    <p className="text-xs text-slate-500">Mã sản phẩm: {product.id.slice(0, 8).toUpperCase()}</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    {hasDiscount && (
                      <span className="text-sm text-slate-400 line-through">
                        {price.toLocaleString('vi-VN')} VND
                      </span>
                    )}
                    <span className="text-2xl font-black text-red-600">
                      {finalPrice.toLocaleString('vi-VN')} <span className="text-sm font-semibold">VND</span>
                    </span>
                  </div>

                  {product.description && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mô tả sản phẩm</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">{product.description}</p>
                    </div>
                  )}

                  {/* Quantity Adjustment */}
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-sm font-semibold text-slate-500">Số lượng:</span>
                    <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl h-11 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1 || isOutOfStock}
                        className="w-11 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-50 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center text-sm font-bold text-slate-800 dark:text-slate-200">{quantity}</span>
                      <button
                        onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                        disabled={quantity >= product.stock || isOutOfStock}
                        className="w-11 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-50 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">Còn {product.stock} sản phẩm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-4 shrink-0">
              <Button
                variant="outline"
                className="flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 h-12 text-sm font-bold rounded-xl cursor-pointer"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Thêm vào giỏ
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-sm font-bold rounded-xl shadow-md cursor-pointer"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                Mua ngay
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
