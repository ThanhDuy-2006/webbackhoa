'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Order } from '@/types/order.type'
import { updateOrderStatusAction } from '@/actions/admin/order.actions'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, Search, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { OrderDetailDialog } from './OrderDetailDialog'

interface OrderListProps {
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

export function OrderList({ initialData, total }: OrderListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLoading(id)
    try {
      const result = await updateOrderStatusAction(id, newStatus)
      if (result.success) {
        toast.success('Cập nhật trạng thái thành công')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    } finally {
      setLoading(null)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = formData.get('q') as string
    
    const params = new URLSearchParams(searchParams.toString())
    if (q) params.set('search', q)
    else params.delete('search')
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <Input 
            name="q" 
            placeholder="Tìm mã, sđt, người nhận..." 
            defaultValue={searchParams.get('search') || ''}
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        
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
              <TableHead>Khách hàng</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-500">
                  Không tìm thấy đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_code}</TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{order.receiver_name}</p>
                      <p className="text-xs text-slate-500">{order.receiver_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setSelectedOrder(order)
                        setIsDetailOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white h-9 w-9 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                        disabled={loading === order.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Đổi trạng thái</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'confirmed')} disabled={order.status === 'confirmed' || order.status === 'completed' || order.status === 'cancelled'}>
                          Xác nhận
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'shipping')} disabled={order.status === 'shipping' || order.status === 'completed' || order.status === 'cancelled'}>
                          Giao hàng
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')} disabled={order.status === 'completed' || order.status === 'cancelled'}>
                          Hoàn thành
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(order.id, 'cancelled')} 
                          className="text-red-600"
                          disabled={order.status === 'completed' || order.status === 'cancelled'}
                        >
                          Hủy đơn
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
