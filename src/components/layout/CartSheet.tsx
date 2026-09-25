'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2, 
  Wallet,
  Ticket,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { SmartImage } from '@/components/ui/smart-image'
import { toast } from 'sonner'
import { useRouter, usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'
import { processCheckout } from '@/actions/user/checkout.actions'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CartSheetProps {
  user?: User | null
  profile?: Record<string, any> | null
}

export function CartSheet({ user, profile }: CartSheetProps) {
  const { isOpen, setIsOpen, items, updateQuantity, removeItem, clearCart } = useCartStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExtras, setShowExtras] = useState(false)
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<any>(null)
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false)
  const [note, setNote] = useState('')

  // Wallet balance state
  const [balance, setBalance] = useState<number>(Number(profile?.balance || 0))

  const router = useRouter()
  const pathname = usePathname()

  // Synchronize profile balance
  useEffect(() => {
    if (profile) {
      setBalance(Number(profile.balance || 0))
    }
  }, [profile])

  // Listen to custom wallet-balance-changed events across components
  useEffect(() => {
    const handleBalanceChanged = (e: any) => {
      if (e?.detail?.newBalance !== undefined) {
        setBalance(Number(e.detail.newBalance))
      }
    }
    window.addEventListener('wallet-balance-changed', handleBalanceChanged)
    return () => window.removeEventListener('wallet-balance-changed', handleBalanceChanged)
  }, [])

  // Subscribe to realtime balance updates for the current user
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cart:profiles:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new && payload.new.balance !== undefined) {
            setBalance(Number(payload.new.balance))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Reset state when sheet opens or route changes
  useEffect(() => {
    setIsSubmitting(false)
  }, [isOpen, pathname])

  // Calculation of totals
  const totalAmount = items.reduce((sum, item) => {
    const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0
    const qty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1
    return sum + price * qty
  }, 0)

  let discountAmount = 0
  if (coupon) {
    if (coupon.discount_type === 'percent') {
      discountAmount = (totalAmount * (coupon.discount_value || 0)) / 100
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amount)
      }
    } else {
      discountAmount = Number(coupon.discount_value) || 0
    }
  }

  const finalAmount = Math.max(0, totalAmount - discountAmount)
  const isBalanceSufficient = balance >= finalAmount

  // Handle coupon validation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsCheckingCoupon(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .single()
        
      if (error || !data) {
        toast.error('Mã giảm giá không hợp lệ hoặc đã hết hạn')
        setCoupon(null)
        return
      }
      
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        toast.error('Mã giảm giá đã hết lượt sử dụng')
        setCoupon(null)
        return
      }
      
      if (totalAmount < data.min_order_amount) {
        toast.error(`Đơn hàng tối thiểu ${formatCurrency(data.min_order_amount)} để dùng mã này`)
        setCoupon(null)
        return
      }
      
      setCoupon(data)
      toast.success('Đã áp dụng mã giảm giá!')
    } catch {
      toast.error('Có lỗi xảy ra khi kiểm tra mã')
    } finally {
      setIsCheckingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCoupon(null)
    setCouponCode('')
    toast.info('Đã gỡ mã giảm giá')
  }

  // Handle instant 1-click checkout right in the cart
  const handleInstantCheckout = async () => {
    if (items.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }

    if (!user) {
      toast.error('Vui lòng đăng nhập để thanh toán')
      setIsOpen(false)
      router.push('/login?redirect=/')
      return
    }

    if (balance < finalAmount) {
      toast.error(`Số dư ví không đủ. Cần thêm ${formatCurrency(finalAmount - balance)} để thanh toán.`)
      return
    }

    setIsSubmitting(true)
    try {
      const shippingForm = {
        receiver_name: (profile?.full_name as string) || (user?.email?.split('@')[0]) || 'Khách hàng',
        receiver_phone: (profile?.phone as string) || '0000000000',
        receiver_address: (profile?.address as string) || 'Địa chỉ mặc định',
        note: note.trim()
      }

      const result = await processCheckout(
        user.id,
        items,
        shippingForm,
        coupon?.code || null,
        totalAmount,
        discountAmount,
        finalAmount
      )

      if (result.success) {
        toast.success('Thanh toán đơn hàng thành công!')
        clearCart()
        const newBalance = balance - finalAmount
        setBalance(newBalance)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet-balance-changed', {
            detail: { newBalance }
          }))
        }
        setIsOpen(false)
        setCoupon(null)
        setCouponCode('')
        setNote('')
        router.refresh()
        router.push('/tai-khoan/don-hang')
      } else {
        toast.error(result.error || 'Có lỗi xảy ra khi xử lý đặt hàng')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi đặt hàng')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsSubmitting(false)
      setIsOpen(open)
    }}>
      <SheetContent 
        side="bottom" 
        className="w-full !h-[88vh] sm:!h-full sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:w-[460px] sm:max-w-lg flex flex-col p-0 rounded-t-[24px] sm:rounded-t-none sm:border-l bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
      >
        {/* Drag handle indicator on mobile bottom sheet */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-3 sm:hidden shrink-0" />

        {/* Header */}
        <SheetHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Giỏ hàng ({items.length})
          </SheetTitle>
          <SheetDescription className="hidden">Giỏ hàng của bạn</SheetDescription>
        </SheetHeader>

        {/* CART ITEMS BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-16">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200 text-base">Giỏ hàng của bạn đang trống</p>
                <p className="text-xs text-slate-500 max-w-xs">Hãy khám phá các sản phẩm tươi ngon và thêm vào giỏ hàng nhé!</p>
              </div>
              <Button onClick={() => setIsOpen(false)} className="rounded-xl h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer">
                Tiếp tục mua sắm
              </Button>
            </div>
          ) : (
            <>
              {/* Product list */}
              <div className="space-y-3">
                {items.map(item => (
                  <div key={`${item.id}-${item.variantId || 'base'}`} className="flex gap-3.5 items-start p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80">
                    <div className="relative w-16 h-16 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                      <SmartImage
                        productId={item.id}
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {item.name}
                        </h4>
                        {item.variantName && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.variantName}</p>
                        )}
                        <div className="text-sm font-bold text-red-600 dark:text-red-400 mt-0.5">
                          {formatCurrency(item.price)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1.5 pt-1">
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg h-7 bg-white dark:bg-slate-900">
                          <button
                            onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)}
                            className="w-7 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
                            disabled={item.quantity <= 1 || isSubmitting}
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-slate-800 dark:text-slate-200">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                            className="w-7 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
                            disabled={item.quantity >= item.stock || isSubmitting}
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => removeItem(item.id, item.variantId)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                          disabled={isSubmitting}
                          aria-label="Xóa sản phẩm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Optional Coupon & Note Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowExtras(!showExtras)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 py-1.5 px-1 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-amber-500" />
                    {coupon ? `Mã ưu đãi: ${coupon.code}` : 'Thêm mã giảm giá / ghi chú'}
                  </span>
                  {showExtras ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showExtras && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
                    {coupon ? (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-3 py-2 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase">{coupon.code}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">(-{formatCurrency(discountAmount)})</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer transition-colors"
                          title="Gỡ mã"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <Input
                            placeholder="Mã giảm giá..."
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="pl-8 h-9 rounded-lg bg-white dark:bg-slate-900 uppercase text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleApplyCoupon}
                          disabled={isCheckingCoupon || !couponCode.trim()}
                          className="h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                        >
                          {isCheckingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Áp dụng'}
                        </Button>
                      </div>
                    )}

                    <Input
                      placeholder="Ghi chú đơn hàng (nếu có)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-9 rounded-lg bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* BOTTOM ACTION & 1-CLICK INSTANT CHECKOUT */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            {/* Balance & status */}
            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ví của bạn:</span>
                <strong className={balance < finalAmount ? 'text-red-600' : 'text-emerald-600'}>
                  {formatCurrency(balance)}
                </strong>
              </div>

              {!isBalanceSufficient && (
                <Link
                  href="/tai-khoan/nap-tien"
                  target="_blank"
                  className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Nạp thêm <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Total calculation */}
            <div className="space-y-1">
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
                <span className="text-slate-600 dark:text-slate-400 font-normal">Tổng thanh toán:</span>
                <span className="text-red-600 dark:text-red-400 text-lg">{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            {!isBalanceSufficient && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Số dư không đủ. Cần thêm <strong>{formatCurrency(finalAmount - balance)}</strong>.</span>
              </div>
            )}

            {/* Buttons: Clear all & 1-Click Pay */}
            <div className="grid grid-cols-3 gap-2.5">
              <Button 
                variant="outline" 
                onClick={() => clearCart()} 
                disabled={isSubmitting}
                className="h-12 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer col-span-1"
              >
                Xóa tất cả
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-12 text-sm font-bold rounded-xl shadow-md cursor-pointer col-span-2 disabled:opacity-50" 
                onClick={handleInstantCheckout}
                disabled={isSubmitting || (user ? !isBalanceSufficient : false)}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Đang thanh toán...</>
                ) : !isBalanceSufficient && user ? (
                  'Số dư ví không đủ'
                ) : (
                  `Thanh toán ngay (${formatCurrency(finalAmount)})`
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
