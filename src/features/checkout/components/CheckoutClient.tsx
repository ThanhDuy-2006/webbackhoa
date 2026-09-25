'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/useCartStore'
import { processCheckout } from '@/actions/user/checkout.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { SmartImage } from '@/components/ui/smart-image'
import { Loader2, Ticket, MapPin, Phone, User as UserIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface CheckoutClientProps {
  user: any
  profile: any
  settings: any
}

export function CheckoutClient({ user, profile, settings }: CheckoutClientProps) {
  const router = useRouter()
  const { items, clearCart } = useCartStore()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<any>(null)
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false)
  
  const [formData, setFormData] = useState({
    receiver_name: profile?.full_name || '',
    receiver_phone: profile?.phone || '',
    receiver_address: profile?.address || '',
    note: ''
  })

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsCheckingCoupon(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
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
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kiểm tra mã')
    } finally {
      setIsCheckingCoupon(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }

    if (!formData.receiver_name || !formData.receiver_phone || !formData.receiver_address) {
      toast.error('Vui lòng điền đầy đủ thông tin nhận hàng')
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet-balance-changed', {
            detail: { newBalance: (profile?.balance || 0) - finalAmount }
          }))
        }
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

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-lg mx-auto p-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <Ticket className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Giỏ hàng của bạn đang trống</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hãy khám phá các sản phẩm nổi bật và chọn cho mình những món đồ ưng ý nhé.
        </p>
        <Button 
          onClick={() => router.push('/')}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl h-11 px-6 shadow-sm"
        >
          Mua sắm ngay
        </Button>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Form and Info */}
      <div className="lg:col-span-2 space-y-6">
        <form id="checkout-form" onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Thông tin nhận hàng</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiver_name" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  Họ tên người nhận <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="receiver_name" 
                  value={formData.receiver_name}
                  onChange={(e) => setFormData(p => ({ ...p, receiver_name: e.target.value }))}
                  required
                  placeholder="Nguyễn Văn A"
                  className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver_phone" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Số điện thoại <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="receiver_phone" 
                  value={formData.receiver_phone}
                  onChange={(e) => setFormData(p => ({ ...p, receiver_phone: e.target.value }))}
                  required
                  placeholder="0912345678"
                  className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="receiver_address" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Địa chỉ chi tiết <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="receiver_address" 
                value={formData.receiver_address}
                onChange={(e) => setFormData(p => ({ ...p, receiver_address: e.target.value }))}
                required
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ghi chú đơn hàng (Tùy chọn)
              </Label>
              <Textarea 
                id="note" 
                rows={3}
                value={formData.note}
                onChange={(e) => setFormData(p => ({ ...p, note: e.target.value }))}
                placeholder="Ghi chú thêm cho người bán hoặc người giao hàng..."
                className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 resize-none"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Summary Sidebar */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 sticky top-20">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Đơn hàng của bạn</h2>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {items.map(item => (
              <div key={`${item.id}-${item.variantId}`} className="flex gap-3 items-center">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                  <SmartImage productId={item.id} src={item.image} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                  {item.variantName && <p className="text-xs text-slate-500 dark:text-slate-400">{item.variantName}</p>}
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">SL: {item.quantity}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency((item.price * item.quantity))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Mã giảm giá" 
                  className="pl-9 rounded-xl border-slate-200 dark:border-slate-800"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleApplyCoupon} 
                disabled={isCheckingCoupon || !couponCode}
                className="rounded-xl border-slate-200 dark:border-slate-800 font-semibold"
              >
                {isCheckingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Áp dụng'}
              </Button>
            </div>
            
            <div className="space-y-2 text-sm pt-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tạm tính</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                <span>Tổng cộng</span>
                <span className="text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(finalAmount)}</span>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Số dư ví hiện tại:</span>
                <span className={`font-semibold ${(profile?.balance || 0) < finalAmount ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(profile?.balance || 0)}
                </span>
              </div>
              {(profile?.balance || 0) < finalAmount && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Số dư ví không đủ, vui lòng nạp thêm tiền hoặc đơn hàng sẽ bị từ chối.
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              form="checkout-form"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl h-12 shadow-sm shadow-emerald-600/20 cursor-pointer text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý...</>
              ) : (
                'Xác nhận thanh toán'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

