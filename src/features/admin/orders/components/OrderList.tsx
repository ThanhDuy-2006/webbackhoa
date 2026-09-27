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
import { formatCurrency } from '@/lib/utils'

interface OrderListProps {
  initialData: Order[]
  total: number
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  shipping: { label: 'Đang giao', color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'Đã hủy', color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  refunded: { label: 'Hoàn tiền', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Chưa thanh toán', color: 'text-amber-600 dark:text-amber-400' },
  paid: { label: 'Đã thanh toán', color: 'text-emerald-600 dark:text-emerald-400' },
  refunded: { label: 'Đã hoàn tiền', color: 'text-slate-500 dark:text-slate-400' },
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
            className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
          <Button type="submit" variant="secondary" className="rounded-xl cursor-pointer">
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
          <SelectTrigger className="w-[180px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xác nhận</SelectItem>
            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
            <SelectItem value="shipping">Đang giao</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <TableHead className="font-bold">Mã ĐH</TableHead>
              <TableHead className="font-bold">Ngày đặt</TableHead>
              <TableHead className="font-bold">Khách hàng</TableHead>
              <TableHead className="font-bold">Tổng tiền</TableHead>
              <TableHead className="font-bold">Thanh toán</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="text-right font-bold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-400 dark:text-slate-500 text-xs">
                  Không tìm thấy đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((order) => (
                <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-bold font-mono text-slate-900 dark:text-slate-100">{order.order_code}</TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{order.receiver_name}</p>
                      <p className="text-[11px] text-slate-400">{order.receiver_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
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
                  <TableCell className="text-right space-x-1.5">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setSelectedOrder(order)
                        setIsDetailOpen(true)
                      }}
                      className="border-slate-200 dark:border-slate-800"
                    >
                      <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-9 w-9 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                        disabled={loading === order.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Đổi trạng thái</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'confirmed')} disabled={order.status === 'confirmed' || order.status === 'completed' || order.status === 'cancelled'} className="cursor-pointer">
                          Xác nhận
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'shipping')} disabled={order.status === 'shipping' || order.status === 'completed' || order.status === 'cancelled'} className="cursor-pointer">
                          Giao hàng
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')} disabled={order.status === 'completed' || order.status === 'cancelled'} className="cursor-pointer">
                          Hoàn thành
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(order.id, 'cancelled')} 
                          className="text-red-600 cursor-pointer"
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
