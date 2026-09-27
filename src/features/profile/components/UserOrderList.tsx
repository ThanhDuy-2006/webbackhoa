'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types/order.type'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { OrderDetailDialog } from '@/features/admin/orders/components/OrderDetailDialog'
import { formatCurrency, cn } from '@/lib/utils'

interface UserOrderListProps {
  initialData: Order[]
  total: number
  shares?: any[]
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

export function UserOrderList({ initialData, total, shares = [] }: UserOrderListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('user-orders-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const unifiedList = [
    ...initialData.map(o => ({ type: 'order', data: o, date: new Date(o.created_at).getTime() })),
    ...shares.map(s => ({ type: 'share', data: s, date: new Date(s.created_at).getTime() }))
  ].sort((a, b) => b.date - a.date)

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4 mb-4">
        <Select 
          value={searchParams.get('status') || 'all'} 
          onValueChange={(val) => {
            const params = new URLSearchParams(searchParams.toString())
            if (val && val !== 'all') params.set('status', val)
            else params.delete('status')
            router.push(`?${params.toString()}`)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xác nhận</SelectItem>
            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
            <SelectItem value="shipping">Đang giao</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {unifiedList.length === 0 ? (
          <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-500 text-xs">
            Bạn chưa có đơn hàng hoặc khấu trừ nào
          </div>
        ) : (
          unifiedList.map((item) => {
            if (item.type === 'order') {
              const order = item.data
              return (
                <div key={`mob-order-${order.id}`} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">#{order.order_code}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    </div>
                    <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color}>
                      {ORDER_STATUS_MAP[order.status]?.label}
                    </Badge>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                      {order.order_items?.map((i: any) => i.product_name).join(', ') || 'Không rõ'}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Tổng thanh toán:</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(order.final_amount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className={`text-[11px] font-semibold ${PAYMENT_STATUS_MAP[order.payment_status]?.color}`}>
                      {PAYMENT_STATUS_MAP[order.payment_status]?.label}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer"
                      onClick={() => {
                        setSelectedOrder(order)
                        setIsDetailOpen(true)
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Chi tiết
                    </Button>
                  </div>
                </div>
              )
            } else {
              const share = item.data
              const isReversal = share.status === 'reversed'
              const isRefund = isReversal && share.amount > 0
              const isRevokedOriginal = isReversal && share.amount < 0

              return (
                <div key={`mob-share-${share.id}`} className={cn(
                  "p-4 rounded-2xl border shadow-2xs space-y-3",
                  isRefund ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : isRevokedOriginal ? "bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800" : "bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                )}>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <span className={cn("font-mono font-bold text-xs", isRefund ? "text-emerald-600" : isRevokedOriginal ? "text-slate-400 line-through" : "text-red-600")}>
                        {share.order_code_snapshot || 'KHẤU TRỪ'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(new Date(share.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    </div>
                    <Badge variant="outline" className={isRefund ? "bg-emerald-100 text-emerald-800 border-emerald-200" : isRevokedOriginal ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-red-100 text-red-800 border-red-200"}>
                      {isRefund ? 'Đã hoàn' : isRevokedOriginal ? 'Bị thu hồi' : 'Khấu trừ'}
                    </Badge>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className={cn("font-semibold text-slate-800 dark:text-slate-200", isRevokedOriginal && "line-through text-slate-400")}>
                      {share.product_name_snapshot || 'Không rõ'}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Số tiền:</span>
                      <span className={cn("font-extrabold text-sm", isRefund ? "text-emerald-600" : isRevokedOriginal ? "text-slate-400 line-through" : "text-red-600")}>
                        {(share.amount < 0 ? '-' : '+') + formatCurrency(Math.abs(share.amount))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 cursor-pointer"
                      onClick={() => router.push('/tai-khoan/chia-tien')}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Chi tiết
                    </Button>
                  </div>
                </div>
              )
            }
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mã ĐH</TableHead>
              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Sản phẩm</TableHead>
              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Ngày đặt</TableHead>
              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tổng tiền</TableHead>
              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Thanh toán</TableHead>
              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
              <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unifiedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-500 dark:text-slate-400 text-xs">
                  Bạn chưa có đơn hàng hoặc khấu trừ nào
                </TableCell>
              </TableRow>
            ) : (
              unifiedList.map((item) => {
                if (item.type === 'order') {
                  const order = item.data;
                  return (
                    <TableRow key={`order-${order.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60">
                      <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{order.order_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-800 dark:text-slate-200" title={order.order_items?.map((i: any) => i.product_name).join(', ')}>
                        {order.order_items?.map((i: any) => i.product_name).join(', ') || 'Không rõ'}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell className="font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrency(order.final_amount)}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold ${PAYMENT_STATUS_MAP[order.payment_status]?.color}`}>
                          {PAYMENT_STATUS_MAP[order.payment_status]?.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color}>
                          {ORDER_STATUS_MAP[order.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-24 rounded-xl text-xs h-8 cursor-pointer"
                          onClick={() => {
                            setSelectedOrder(order)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                } else {
                  const share = item.data;
                  const isReversal = share.status === 'reversed';
                  const isRefund = isReversal && share.amount > 0;
                  const isRevokedOriginal = isReversal && share.amount < 0;

                  return (
                    <TableRow key={`share-${share.id}`} className={cn("border-b border-slate-100 dark:border-slate-800/60", isRefund ? "bg-emerald-50/40 dark:bg-emerald-950/20" : isRevokedOriginal ? "bg-slate-50/40 dark:bg-slate-950/20" : "bg-red-50/40 dark:bg-red-950/20")}>
                      <TableCell className={`font-mono font-bold ${isRefund ? 'text-emerald-600 dark:text-emerald-400' : isRevokedOriginal ? 'text-slate-400 line-through' : 'text-red-600 dark:text-red-400'}`}>
                        {share.order_code_snapshot || 'KHẤU TRỪ'}
                      </TableCell>
                      <TableCell className={`max-w-[200px] truncate ${isRevokedOriginal ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200"}`} title={share.product_name_snapshot}>
                        {share.product_name_snapshot || 'Không rõ'}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                        {format(new Date(share.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell className={`font-extrabold ${isRefund ? 'text-emerald-600 dark:text-emerald-400' : isRevokedOriginal ? 'text-slate-400 line-through' : 'text-red-600 dark:text-red-400'}`}>
                        {(share.amount < 0 ? '-' : '+') + formatCurrency(Math.abs(share.amount))}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold ${isRefund ? 'text-emerald-600 dark:text-emerald-400' : isRevokedOriginal ? 'text-slate-400' : 'text-red-600 dark:text-red-400'}`}>
                          Trừ vào ví
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={isRefund ? "bg-emerald-100 text-emerald-800 border-emerald-200" : isRevokedOriginal ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-red-100 text-red-800 border-red-200"}>
                          {isRefund ? 'Đã hoàn' : isRevokedOriginal ? 'Bị thu hồi' : 'Khấu trừ'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-24 rounded-xl text-xs h-8 cursor-pointer"
                          onClick={() => {
                            router.push('/tai-khoan/chia-tien')
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                }
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      <OrderDetailDialog 
        order={selectedOrder} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </div>
  )
}
