'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Plus, Minus, Trash2, Loader2, ArrowRight } from 'lucide-react'
import { SmartImage } from '@/components/ui/smart-image'
import { toast } from 'sonner'
import { useRouter, usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'

interface CartSheetProps {
  user?: User | null
  profile?: Record<string, any> | null
}

export function CartSheet({ user, profile }: CartSheetProps) {
  const { isOpen, setIsOpen, items, updateQuantity, removeItem, clearCart } = useCartStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Always reset loading state when sheet opens, closes, or route changes
  useEffect(() => {
    setIsSubmitting(false)
  }, [isOpen, pathname])

  const totalAmount = items.reduce((sum, item) => {
    const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0
    const qty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1
    return sum + price * qty
  }, 0)

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Giỏ hàng của bạn đang trống')
      return
    }

    if (!user) {
      toast.error('Vui lòng đăng nhập để thanh toán')
      setIsOpen(false)
      router.push('/login?redirect=/thanh-toan')
      return
    }

    setIsSubmitting(true)
    setIsOpen(false)
    router.push('/thanh-toan')

    // Safety timeout to ensure isSubmitting is never permanently stuck
    setTimeout(() => {
      setIsSubmitting(false)
    }, 1500)
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsSubmitting(false)
      setIsOpen(open)
    }}>
      <SheetContent 
        side="bottom" 
        className="w-full !h-[85vh] sm:!h-full sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:w-[440px] sm:max-w-md flex flex-col p-0 rounded-t-[24px] sm:rounded-t-none sm:border-l bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
      >
        {/* Drag handle indicator on mobile bottom sheet */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-3 sm:hidden shrink-0" />

        <SheetHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Giỏ hàng ({items.length})
          </SheetTitle>
          <SheetDescription className="hidden">Giỏ hàng của bạn</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-12">
              <ShoppingBag className="w-16 h-16 text-slate-200 dark:text-slate-800 animate-pulse" />
              <p className="font-medium text-slate-600 dark:text-slate-400">Giỏ hàng đang trống</p>
              <Button onClick={() => setIsOpen(false)} variant="outline" className="rounded-full h-11 px-6">
                Tiếp tục mua sắm
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map(item => (
                <div key={`${item.id}-${item.variantId || 'base'}`} className="flex gap-4 items-start pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                  <div className="relative w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                    <SmartImage
                      productId={item.id}
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </h4>
                    {item.variantName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.variantName}</p>
                    )}
                    <div className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">
                      {formatCurrency(item.price)}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg h-11 sm:h-9 bg-slate-50 dark:bg-slate-950">
                        <button
                          onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)}
                          className="w-11 sm:w-9 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer text-slate-600 dark:text-slate-300"
                          disabled={item.quantity <= 1 || isSubmitting}
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                          className="w-11 sm:w-9 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer text-slate-600 dark:text-slate-300"
                          disabled={item.quantity >= item.stock || isSubmitting}
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id, item.variantId)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
                        disabled={isSubmitting}
                        aria-label="Xóa sản phẩm khỏi giỏ hàng"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4 shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex items-center justify-between font-bold text-lg text-slate-900 dark:text-slate-100">
              <span>Tổng cộng:</span>
              <span className="text-red-600 dark:text-red-400">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => clearCart()} 
                disabled={isSubmitting}
                className="h-12 text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Xóa tất cả
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-12 text-sm font-semibold rounded-xl shadow-sm cursor-pointer" 
                onClick={handleCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Đang xử lý</>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Thanh toán <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
