'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PackageCheck, Truck, CheckCircle2, Clock, User, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SellerOrder } from '@/types/order.type'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { updateSellerOrderStatusAction } from '@/actions/seller-order.actions'

interface SellerOrderListProps {
  orders: SellerOrder[]
  totalCount: number
  currentPage: number
  currentStatus: string
}

export function SellerOrderList({ orders, totalCount, currentPage, currentStatus }: SellerOrderListProps) {
  const router = useRouter()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('seller-orders-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seller_orders' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    router.push(`/tai-khoan/don-ban?${params.toString()}`)
  }

  const handleUpdateStatus = async (orderId: string, newStatus: 'confirmed' | 'shipping') => {
    setUpdatingId(orderId)
    try {
      const res = await updateSellerOrderStatusAction(orderId, newStatus)
      if (res.success) {
        toast.success(`Đã cập nhật trạng thái đơn sang "${newStatus === 'confirmed' ? 'Đã xác nhận' : 'Đang giao hàng'}"`)
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi khi cập nhật trạng thái đơn')
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Chờ xác nhận</span>
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Đã xác nhận</span>
      case 'shipping':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Đang giao hàng</span>
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Đã hoàn thành</span>
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Đã hủy</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Quản lý Đơn bán</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Xem và xử lý giao nhận các đơn hàng được mua từ kho/shop của bạn</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'pending', label: 'Chờ xác nhận' },
          { id: 'confirmed', label: 'Đã xác nhận' },
          { id: 'shipping', label: 'Đang giao' },
          { id: 'completed', label: 'Đã hoàn thành' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentStatus === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
          <PackageCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Chưa có đơn bán nào</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Chưa có ai đặt mua đồ trong danh mục này.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Đơn bán #{order.parent_order?.order_code || order.id.slice(0, 8)}</span>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleString('vi-VN')}</div>
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Buyer Shipping Info */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Người nhận: {order.parent_order?.receiver_name}
                </div>
                <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" /> SĐT: {order.parent_order?.receiver_phone}
                </div>
                <div className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" /> Địa chỉ: {order.parent_order?.receiver_address}
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-1.5 border-b border-dashed border-slate-100 dark:border-slate-800/80 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.product_name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100 font-mono">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Earnings & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs space-y-0.5">
                  <div className="text-slate-600 dark:text-slate-400">Doanh thu nhận được: <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm font-mono">{formatCurrency(order.seller_earnings)}</strong></div>
                  {order.platform_fee > 0 && <div className="text-slate-400">Phí sàn: {formatCurrency(order.platform_fee)}</div>}
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Xác nhận đơn
                    </Button>
                  )}

                  {order.status === 'confirmed' && (
                    <Button
                      size="sm"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'shipping')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" /> Đang giao hàng
                    </Button>
                  )}

                  {order.status === 'shipping' && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" /> Đang chờ người mua xác nhận đã nhận hàng
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
