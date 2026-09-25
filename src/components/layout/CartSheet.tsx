'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useCartStore } from '@/store/useCartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  Ticket,
  MapPin,
  Phone,
  User as UserIcon,
  Wallet,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink
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
  const [step, setStep] = useState<'cart' | 'checkout'>('cart')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<any>(null)
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false)

  // Wallet balance state
  const [balance, setBalance] = useState<number>(Number(profile?.balance || 0))

  // Shipping details form
  const [formData, setFormData] = useState({
    receiver_name: (profile?.full_name as string) || '',
    receiver_phone: (profile?.phone as string) || '',
    receiver_address: (profile?.address as string) || '',
    note: ''
  })

  const router = useRouter()
  const pathname = usePathname()

  // Synchronize profile balance and default form data when profile arrives or updates
  useEffect(() => {
    if (profile) {
      setBalance(Number(profile.balance || 0))
      setFormData(prev => ({
        receiver_name: prev.receiver_name || (profile.full_name as string) || '',
        receiver_phone: prev.receiver_phone || (profile.phone as string) || '',
        receiver_address: prev.receiver_address || (profile.address as string) || '',
        note: prev.note
      }))
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

  // Proceed from cart item list to checkout form
  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Giỏ hàng của bạn đang trống')
      return
    }

    if (!user) {
      toast.error('Vui lòng đăng nhập để thanh toán')
      setIsOpen(false)
      router.push('/login?redirect=/')
      return
    }

    setStep('checkout')
  }

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

  // Handle direct in-cart checkout submission
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }

    if (!user) {
      toast.error('Vui lòng đăng nhập để thanh toán')
      return
    }

    if (!formData.receiver_name.trim() || !formData.receiver_phone.trim() || !formData.receiver_address.trim()) {
      toast.error('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng')
      return
    }

    if (balance < finalAmount) {
      toast.error('Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await processCheckout(
        user.id,
        items,
        formData,
        coupon?.code || null,
        totalAmount,
        discountAmount,
        finalAmount
      )

      if (result.success) {
        toast.success('Đặt hàng thành công!')
        clearCart()
        const newBalance = balance - finalAmount
        setBalance(newBalance)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet-balance-changed', {
            detail: { newBalance }
          }))
        }
        setIsOpen(false)
        setStep('cart')
        setCoupon(null)
        setCouponCode('')
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
      if (!open) {
        // Reset to cart view when closing
        setTimeout(() => setStep('cart'), 300)
      }
    }}>
      <SheetContent 
        side="bottom" 
        className="w-full !h-[90vh] sm:!h-full sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:w-[480px] sm:max-w-lg flex flex-col p-0 rounded-t-[24px] sm:rounded-t-none sm:border-l bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
      >
        {/* Drag handle indicator on mobile bottom sheet */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-3 sm:hidden shrink-0" />

        {/* Header with back button when in checkout mode */}
        <SheetHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'checkout' && (
              <button
                onClick={() => setStep('cart')}
                disabled={isSubmitting}
                className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                title="Quay lại giỏ hàng"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
              {step === 'cart' ? (
                <>
                  <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Giỏ hàng ({items.length})
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Thanh toán đơn hàng
                </>
              )}
            </SheetTitle>
          </div>
          <SheetDescription className="hidden">
            {step === 'cart' ? 'Giỏ hàng của bạn' : 'Điền thông tin và thanh toán'}
          </SheetDescription>
        </SheetHeader>

        {/* STEP 1: CART ITEMS VIEW */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
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
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={`${item.id}-${item.variantId || 'base'}`} className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80">
                      <div className="relative w-18 h-18 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                        <SmartImage
                          productId={item.id}
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="72px"
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
                          <div className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">
                            {formatCurrency(item.price)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1">
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg h-8 bg-white dark:bg-slate-900">
                            <button
                              onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)}
                              className="w-8 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
                              disabled={item.quantity <= 1 || isSubmitting}
                              aria-label="Giảm số lượng"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-slate-800 dark:text-slate-200">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                              className="w-8 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
                              disabled={item.quantity >= item.stock || isSubmitting}
                              aria-label="Tăng số lượng"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => removeItem(item.id, item.variantId)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                            disabled={isSubmitting}
                            aria-label="Xóa sản phẩm"
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
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
                <div className="flex items-center justify-between font-bold text-base text-slate-900 dark:text-slate-100">
                  <span className="text-slate-600 dark:text-slate-400 font-normal">Tạm tính ({items.length} món):</span>
                  <span className="text-red-600 dark:text-red-400 text-lg">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button 
                    variant="outline" 
                    onClick={() => clearCart()} 
                    disabled={isSubmitting}
                    className="h-11 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    Xóa tất cả
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-11 text-sm font-semibold rounded-xl shadow-sm cursor-pointer" 
                    onClick={handleProceedToCheckout}
                    disabled={isSubmitting}
                  >
                    Thanh toán ngay <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP 2: DIRECT IN-CART CHECKOUT VIEW */}
        {step === 'checkout' && (
          <form onSubmit={handleConfirmOrder} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Order Items Compact Summary */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Sản phẩm thanh toán ({items.length})</span>
                  <button 
                    type="button" 
                    onClick={() => setStep('cart')}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Sửa giỏ hàng
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {items.map(item => (
                    <div key={`${item.id}-${item.variantId || 'base'}`} className="relative w-12 h-12 bg-white dark:bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800" title={`${item.name} x${item.quantity}`}>
                      <SmartImage
                        productId={item.id}
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-contain p-0.5"
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded-tl">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receiver Information Form */}
              <div className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Thông tin nhận hàng
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="space-y-1.5">
                    <Label htmlFor="in_cart_receiver_name" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Họ tên người nhận *
                    </Label>
                    <Input
                      id="in_cart_receiver_name"
                      placeholder="Nguyễn Văn A"
                      value={formData.receiver_name}
                      onChange={(e) => setFormData(p => ({ ...p, receiver_name: e.target.value }))}
                      required
                      className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="in_cart_receiver_phone" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại *
                    </Label>
                    <Input
                      id="in_cart_receiver_phone"
                      placeholder="0987654321"
                      value={formData.receiver_phone}
                      onChange={(e) => setFormData(p => ({ ...p, receiver_phone: e.target.value }))}
                      required
                      className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="in_cart_receiver_address" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Địa chỉ chi tiết nhận hàng *
                    </Label>
                    <Input
                      id="in_cart_receiver_address"
                      placeholder="Số nhà, ngõ/ngách, tên đường, phường/xã..."
                      value={formData.receiver_address}
                      onChange={(e) => setFormData(p => ({ ...p, receiver_address: e.target.value }))}
                      required
                      className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="in_cart_note" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Ghi chú đơn hàng (Tùy chọn)
                    </Label>
                    <Textarea
                      id="in_cart_note"
                      placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                      rows={2}
                      value={formData.note}
                      onChange={(e) => setFormData(p => ({ ...p, note: e.target.value }))}
                      className="rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-xs resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Coupon Code Input */}
              <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-amber-500" /> Mã giảm giá
                </h3>

                {coupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-3.5 py-2.5 rounded-xl text-xs">
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
                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                      title="Gỡ mã"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Nhập mã ưu đãi..."
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="pl-9 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 uppercase text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleApplyCoupon}
                      disabled={isCheckingCoupon || !couponCode.trim()}
                      className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                    >
                      {isCheckingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Áp dụng'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Wallet Balance & Payment Method */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Ví Bách Hóa</p>
                      <p className="text-[11px] text-slate-500">Số dư: <strong className={balance < finalAmount ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(balance)}</strong></p>
                    </div>
                  </div>

                  {!isBalanceSufficient && (
                    <Link
                      href="/tai-khoan/nap-tien"
                      target="_blank"
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
                    >
                      Nạp tiền <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {!isBalanceSufficient && (
                  <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-2.5 rounded-xl text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>Số dư ví không đủ. Cần thêm <strong>{formatCurrency(finalAmount - balance)}</strong> để thanh toán đơn hàng này.</span>
                  </div>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(totalAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Giảm giá mã ưu đãi</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                  <span>Tổng thanh toán:</span>
                  <span className="text-red-600 dark:text-red-400 text-base">{formatCurrency(finalAmount)}</span>
                </div>
              </div>

            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-4">
              <Button
                type="submit"
                disabled={isSubmitting || !isBalanceSufficient || items.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-sm font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý thanh toán...</>
                ) : !isBalanceSufficient ? (
                  `Số dư không đủ (${formatCurrency(finalAmount)})`
                ) : (
                  `Xác nhận thanh toán (${formatCurrency(finalAmount)})`
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}

