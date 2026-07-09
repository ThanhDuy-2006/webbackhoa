'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

interface UserOrderListProps {
  initialData: Order[]
  total: number
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

export function UserOrderList({ initialData, total }: UserOrderListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

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

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã ĐH</TableHead>
              <TableHead>Ngày đặt</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-slate-500">
                  Bạn chưa có đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-emerald-600">{order.order_code}</TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.final_amount.toLocaleString('vi-VN')} VND
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${PAYMENT_STATUS_MAP[order.payment_status]?.color}`}>
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
                      onClick={() => {
                        setSelectedOrder(order)
                        setIsDetailOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Xem
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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
