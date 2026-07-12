import Link from 'next/link'
import { FileText, ArrowRight, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  created_at: string
  status: string
  payment_method: string
  total_amount: number
}

interface RecentOrdersProps {
  orders: Order[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium">Chờ xử lý</span>
      case 'processing':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">Đang chuẩn bị</span>
      case 'shipping':
        return <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">Đang giao</span>
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">Hoàn thành</span>
      case 'cancelled':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium">Đã hủy</span>
      default:
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium">{status}</span>
    }
  }

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Đơn hàng gần đây</h2>
          <p className="text-sm text-slate-500 mt-1">5 đơn hàng mới nhất của bạn</p>
        </div>
        {orders.length > 0 && (
          <Link href="/tai-khoan/don-hang" className="hidden sm:inline-block">
            <Button variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              Xem tất cả <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <PackageX className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">Chưa có đơn hàng nào</h3>
          <p className="text-slate-500 mb-6">Bạn chưa thực hiện giao dịch nào trên hệ thống.</p>
          <Link href="/" className="inline-block">
            <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-8">
              Mua sắm ngay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">Mã đơn hàng</th>
                <th className="px-6 py-4 whitespace-nowrap">Ngày đặt</th>
                <th className="px-6 py-4 whitespace-nowrap">Trạng thái</th>
                <th className="px-6 py-4 whitespace-nowrap">Thanh toán</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Tổng tiền</th>
                <th className="px-6 py-4 text-right rounded-tr-xl whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{order.payment_method === 'cod' ? 'Tiền mặt (COD)' : order.payment_method === 'wallet' ? 'Ví nội bộ' : order.payment_method}</td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">{order.total_amount.toLocaleString('vi-VN')} VND</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/tai-khoan/don-hang/${order.id}`}>
                      <Button variant="outline" size="sm" className="rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
                        Chi tiết
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {orders.length > 0 && (
        <div className="p-4 border-t border-slate-100 flex justify-center sm:hidden">
          <Link href="/tai-khoan/don-hang" className="w-full">
            <Button variant="ghost" className="text-emerald-600 w-full">
              Xem tất cả
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
