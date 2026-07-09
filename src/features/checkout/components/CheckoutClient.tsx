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
import Image from 'next/image'
import { Loader2, Ticket, MapPin, Phone, User as UserIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
    receiver_name: profile.full_name || '',
    receiver_phone: profile.phone || '',
    receiver_address: profile.address || '',
    note: ''
  })

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  
  let discountAmount = 0
  if (coupon) {
    if (coupon.discount_type === 'percent') {
      discountAmount = (totalAmount * coupon.discount_value) / 100
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amount)
      }
    } else {
      discountAmount = coupon.discount_value
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
        toast.error(`Đơn hàng tối thiểu ${data.min_order_amount.toLocaleString('vi-VN')} VND để dùng mã này`)
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
      router.push(`/tai-khoan/don-hang`)
    } else {
      toast.error(result.error)
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border">
        <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
        <Button onClick={() => router.push('/san-pham')}>Mua sắm ngay</Button>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Form and Info */}
      <div className="lg:col-span-2 space-y-6">
        <form id="checkout-form" onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b pb-4">Thông tin nhận hàng</h2>
          
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiver_name" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  Họ tên người nhận
                </Label>
                <Input 
                  id="receiver_name" 
                  value={formData.receiver_name}
                  onChange={(e) => setFormData(p => ({ ...p, receiver_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver_phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  Số điện thoại
                </Label>
                <Input 
                  id="receiver_phone" 
                  value={formData.receiver_phone}
                  onChange={(e) => setFormData(p => ({ ...p, receiver_phone: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="receiver_address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                Địa chỉ chi tiết
              </Label>
              <Input 
                id="receiver_address" 
                value={formData.receiver_address}
                onChange={(e) => setFormData(p => ({ ...p, receiver_address: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú đơn hàng (Tùy chọn)</Label>
              <Textarea 
                id="note" 
                rows={3}
                value={formData.note}
                onChange={(e) => setFormData(p => ({ ...p, note: e.target.value }))}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Summary Sidebar */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 sticky top-24">
          <h2 className="text-xl font-bold text-slate-900 border-b pb-4">Đơn hàng của bạn</h2>
          
          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {items.map(item => (
              <div key={`${item.id}-${item.variantId}`} className="flex gap-3">
                <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border">
                  <Image src={item.image || 'https://placehold.co/100x100?text=ĐANG+UPDATE'} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-slate-900 line-clamp-2">{item.name}</p>
                  {item.variantName && <p className="text-xs text-slate-500">{item.variantName}</p>}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-slate-500">x{item.quantity}</span>
                    <span className="font-medium text-red-600">{(item.price * item.quantity).toLocaleString('vi-VN')} VND</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Mã giảm giá" 
                  className="pl-9"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={handleApplyCoupon} disabled={isCheckingCoupon || !couponCode}>
                Áp dụng
              </Button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span>{totalAmount.toLocaleString('vi-VN')} VND</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')} VND</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t text-slate-900">
                <span>Tổng cộng</span>
                <span className="text-red-600">{finalAmount.toLocaleString('vi-VN')} VND</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Số dư ví hiện tại:</span>
                <span className={`font-medium ${profile.balance < 0 ? 'text-red-600' : ''}`}>
                  {profile.balance?.toLocaleString('vi-VN') || 0} VND
                </span>
              </div>
            </div>
            
            <Button 
              type="submit" 
              form="checkout-form"
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý...</>
              ) : (
                'Thanh toán ngay'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
