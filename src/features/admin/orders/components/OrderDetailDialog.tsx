'use client'

import { Order } from '@/types/order.type'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface OrderDetailDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  shipping: { label: 'Đang giao', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-200' },
  refunded: { label: 'Hoàn tiền', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Chưa thanh toán', color: 'text-yellow-600' },
  paid: { label: 'Đã thanh toán', color: 'text-green-600' },
  refunded: { label: 'Đã hoàn tiền', color: 'text-gray-600' },
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-4">
            Đơn hàng #{order.order_code}
            <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color}>
              {ORDER_STATUS_MAP[order.status]?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Thông tin khách hàng</h4>
                <div className="text-sm space-y-1 text-slate-600">
                  <p><span className="text-slate-400">Tên:</span> {order.receiver_name}</p>
                  <p><span className="text-slate-400">SĐT:</span> {order.receiver_phone}</p>
                  <p><span className="text-slate-400">Email:</span> {order.profiles?.email || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Địa chỉ giao hàng</h4>
                <p className="text-sm text-slate-600">{order.receiver_address}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Thông tin thanh toán</h4>
                <div className="text-sm space-y-1 text-slate-600">
                  <p><span className="text-slate-400">Phương thức:</span> {order.payment_method === 'wallet' ? 'Ví số dư' : order.payment_method}</p>
                  <p>
                    <span className="text-slate-400">Trạng thái:</span>{' '}
                    <span className={`font-medium ${PAYMENT_STATUS_MAP[order.payment_status]?.color}`}>
                      {PAYMENT_STATUS_MAP[order.payment_status]?.label}
                    </span>
                  </p>
                  <p><span className="text-slate-400">Ngày đặt:</span> {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                </div>
              </div>

              {order.note && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Ghi chú của khách</h4>
                  <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-md">{order.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Sản phẩm</h4>
            <div className="border rounded-md divide-y">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.product_name}</p>
                    <p className="text-sm text-slate-500">
                      {item.product_price.toLocaleString('vi-VN')} VND x {item.quantity}
                    </p>
                  </div>
                  <div className="font-medium text-slate-900">
                    {item.subtotal.toLocaleString('vi-VN')} VND
                  </div>
                </div>
              ))}
              
              <div className="p-4 bg-slate-50 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tạm tính</span>
                  <span>{order.total_amount.toLocaleString('vi-VN')} VND</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Giảm giá</span>
                  <span>- {order.discount_amount.toLocaleString('vi-VN')} VND</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t mt-2">
                  <span>Tổng tiền</span>
                  <span className="text-red-600">{order.final_amount.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
