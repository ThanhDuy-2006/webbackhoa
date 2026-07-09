'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { ShoppingBag, X, Plus, Minus, Trash2, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { processCheckout } from '@/actions/user/checkout.actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

interface CartSheetProps {
  user?: User | null
  profile?: Record<string, any> | null
}

export function CartSheet({ user, profile }: CartSheetProps) {
  const { isOpen, setIsOpen, items, updateQuantity, removeItem, clearCart } = useCartStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thanh toán')
      setIsOpen(false)
      router.push('/login')
      return
    }

    if (items.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }

    const formData = {
      receiver_name: profile?.full_name || user.email || 'Khách hàng',
      receiver_phone: profile?.phone || '0000000000',
      receiver_address: profile?.address || 'Chưa cập nhật địa chỉ',
      note: ''
    }

    setIsSubmitting(true)
    const result = await processCheckout(
      user.id,
      items,
      formData,
      null,
      totalAmount,
      0,
      totalAmount
    )

    if (result.success) {
      toast.success('Thanh toán thành công!')
      clearCart()
      setIsOpen(false)
      router.push('/tai-khoan/don-hang')
    } else {
      toast.error(result.error || 'Có lỗi xảy ra khi thanh toán')
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent 
        side="bottom" 
        className="w-full h-[85vh] sm:h-full sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:w-[440px] sm:max-w-md flex flex-col p-0 rounded-t-[24px] sm:rounded-t-none sm:border-l bg-white border-t"
      >
        {/* Drag handle indicator on mobile bottom sheet */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 mt-3 sm:hidden shrink-0" />

        <SheetHeader className="p-6 pb-4 border-b shrink-0 flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            Giỏ hàng ({items.length})
          </SheetTitle>
          <SheetDescription className="hidden">Giỏ hàng của bạn</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-12">
              <ShoppingBag className="w-16 h-16 text-slate-200 animate-pulse" />
              <p className="font-medium text-slate-600">Giỏ hàng đang trống</p>
              <Button onClick={() => setIsOpen(false)} variant="outline" className="rounded-full h-11 px-6">
                Tiếp tục mua sắm
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map(item => (
                <div key={`${item.id}-${item.variantId}`} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="relative w-20 h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                    <Image
                      src={item.image || 'https://placehold.co/100x100?text=ĐANG+UPDATE'}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                      {item.name}
                    </h4>
                    {item.variantName && (
                      <p className="text-xs text-slate-500 mt-0.5">{item.variantName}</p>
                    )}
                    <div className="text-sm font-bold text-red-600 mt-1">
                      {item.price.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-200 rounded-lg h-11 sm:h-9">
                        <button
                          onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)}
                          className="w-11 sm:w-9 h-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                          disabled={item.quantity <= 1 || isSubmitting}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-slate-700">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                          className="w-11 sm:w-9 h-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                          disabled={item.quantity >= item.stock || isSubmitting}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id, item.variantId)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-50 rounded-full cursor-pointer"
                        disabled={isSubmitting}
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
          <div className="p-6 border-t bg-slate-50 space-y-4 shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex items-center justify-between font-bold text-lg text-slate-900">
              <span>Tổng cộng:</span>
              <span className="text-red-600">{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => clearCart()} 
                disabled={isSubmitting}
                className="h-12 text-sm font-semibold rounded-xl"
              >
                Xóa tất cả
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 w-full h-12 text-sm font-semibold rounded-xl shadow-sm cursor-pointer" 
                onClick={handleCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Đang xử lý</> : 'Thanh toán'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
