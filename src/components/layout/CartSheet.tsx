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

    // Default form data from profile if available, else empty string
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
      null, // No coupon applied directly from cart sidebar
      totalAmount,
      0, // No discount
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
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Giỏ hàng của bạn ({items.length})
          </SheetTitle>
          <SheetDescription className="hidden">Cart items</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <ShoppingBag className="w-16 h-16 text-slate-200" />
              <p>Giỏ hàng đang trống</p>
              <Button onClick={() => setIsOpen(false)} variant="outline">
                Tiếp tục mua sắm
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map(item => (
                <div key={`${item.id}-${item.variantId}`} className="flex gap-4">
                  <div className="relative w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={item.image || 'https://placehold.co/100x100?text=ĐANG+UPDATE'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 truncate">
                      {item.name}
                    </h4>
                    {item.variantName && (
                      <p className="text-xs text-slate-500 mt-1">{item.variantName}</p>
                    )}
                    <div className="text-sm font-bold text-red-600 mt-1">
                      {item.price.toLocaleString('vi-VN')} VND
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border rounded-md h-8">
                        <button
                          onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)}
                          className="w-8 h-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-50"
                          disabled={item.quantity <= 1 || isSubmitting}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                          className="w-8 h-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-50"
                          disabled={item.quantity >= item.stock || isSubmitting}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id, item.variantId)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        disabled={isSubmitting}
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
          <div className="p-6 border-t bg-slate-50 space-y-4">
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Tổng cộng:</span>
              <span className="text-red-600">{totalAmount.toLocaleString('vi-VN')} VND</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => clearCart()} disabled={isSubmitting}>
                Xóa tất cả
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 w-full" 
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
