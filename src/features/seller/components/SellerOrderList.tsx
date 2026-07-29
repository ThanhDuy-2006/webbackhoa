'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Chờ xác nhận</span>
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Đã xác nhận</span>
      case 'shipping':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">Đang giao hàng</span>
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Đã hoàn thành</span>
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Đã hủy</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Quản lý Đơn bán</h1>
        <p className="text-sm text-slate-500 mt-1">Xem và xử lý giao hàng các đơn hàng được mua từ shop của bạn</p>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-2">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStatus === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-3">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">Chưa có đơn bán nào</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Chưa có khách hàng nào đặt đơn trong danh mục này.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs text-slate-400 font-mono">Đơn bán #{order.parent_order?.order_code || order.id.slice(0, 8)}</span>
                  <div className="text-xs text-slate-500 mt-0.5">{new Date(order.created_at).toLocaleString('vi-VN')}</div>
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Buyer Shipping Info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Người nhận: {order.parent_order?.receiver_name}
                </div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> SĐT: {order.parent_order?.receiver_phone}
                </div>
                <div className="text-slate-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" /> Địa chỉ: {order.parent_order?.receiver_address}
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-1.5 border-b border-dashed border-slate-100 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-800">{item.product_name}</span>
                      <span className="text-xs text-slate-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium text-slate-900">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Earnings & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-xs space-y-0.5">
                  <div>Doanh thu chờ duyệt: <strong className="text-emerald-600 font-bold text-sm">{formatCurrency(order.seller_earnings)}</strong></div>
                  {order.platform_fee > 0 && <div className="text-slate-400">Phí sàn: {formatCurrency(order.platform_fee)}</div>}
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <Button
                      size="sm"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Xác nhận đơn
                    </Button>
                  )}

                  {order.status === 'confirmed' && (
                    <Button
                      size="sm"
                      disabled={updatingId === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'shipping')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" /> Đang giao hàng
                    </Button>
                  )}

                  {order.status === 'shipping' && (
                    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center">
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
