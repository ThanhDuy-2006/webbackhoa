import dynamic from 'next/dynamic'
import { DashboardService } from '@/services/dashboard.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  CreditCard, 
  Receipt, 
  ArrowLeftRight,
  Plus,
  Camera,
  ExternalLink,
  Calendar,
  AlertCircle,
  Landmark,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

// Dynamic import for Recharts to split JS bundle
const AdminDashboardCharts = dynamic(
  () => import('@/features/admin/dashboard/components/AdminDashboardCharts').then(mod => mod.AdminDashboardCharts),
  { loading: () => <div className="h-72 w-full animate-pulse bg-slate-100/70 rounded-2xl" /> }
)

export const revalidate = 0

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single()
  
  const firstName = profile?.full_name?.split(' ').pop() || 'Admin'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

  const { stats, recentOrders } = await DashboardService.getDashboardData()

  // Get status badge colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': 
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Đã giao' }
      case 'shipping': 
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Đang giao' }
      case 'pending': 
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Chờ xử lý' }
      case 'cancelled': 
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Đã hủy' }
      default: 
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: status }
    }
  }

  // Generate real timeline from recent orders
  const realTimeline = (recentOrders || []).slice(0, 4).map((order: any) => {
    let icon = Clock, color = 'text-amber-500', bg = 'bg-amber-100', title = ''
    
    if (order.status === 'completed') {
      icon = CheckCircle2; color = 'text-emerald-500'; bg = 'bg-emerald-100';
      title = `Đơn hàng #${order.order_code} đã được giao thành công`;
    } else if (order.status === 'pending') {
      icon = ShoppingBag; color = 'text-purple-500'; bg = 'bg-purple-100';
      title = `Khách hàng ${order.profiles?.full_name || 'Khách'} vừa đặt đơn mới`;
    } else if (order.status === 'shipping') {
      icon = Truck; color = 'text-blue-500'; bg = 'bg-blue-100';
      title = `Đơn hàng #${order.order_code} đang được vận chuyển`;
    } else {
      icon = XCircle; color = 'text-rose-500'; bg = 'bg-rose-100';
      title = `Đơn hàng #${order.order_code} đã bị hủy`;
    }

    const diff = new Date().getTime() - new Date(order.created_at).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let timeStr = 'Vừa xong';
    if (days > 0) timeStr = `${days} ngày trước`;
    else if (hours > 0) timeStr = `${hours} giờ trước`;
    else if (minutes > 0) timeStr = `${minutes} phút trước`;

    return {
      id: order.id,
      title,
      time: timeStr,
      icon, color, bg
    }
  })

  const pendingTopups = stats.pendingTopupsCount || 0
  const pendingWithdrawals = stats.pendingWithdrawalsCount || 0
  const pendingOrders = stats.pendingOrdersCount || 0
  const hasPendingActions = pendingTopups > 0 || pendingWithdrawals > 0 || pendingOrders > 0

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Tổng quan doanh thu & vận hành hệ thống hôm nay.
          </p>
        </div>

        {/* Action Shortcuts & Date */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </div>

          <Link href="/admin/products/create">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1 shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Thêm SP
            </Button>
          </Link>

          <Link href="/admin/products/import?scan=true">
            <Button size="sm" variant="outline" className="border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold gap-1">
              <Camera className="w-3.5 h-3.5 text-amber-600" /> Quét HĐ
            </Button>
          </Link>

          <Link href="/" target="_blank">
            <Button size="sm" variant="ghost" className="rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Xem Store
            </Button>
          </Link>
        </div>
      </div>

      {/* Action Center Banners (If there are pending items) */}
      {hasPendingActions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendingTopups > 0 && (
            <Link 
              href="/admin/topups" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 hover:bg-emerald-100/80 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {pendingTopups}
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">Yêu cầu nạp tiền chờ duyệt</p>
                  <p className="text-[11px] text-emerald-700">Cần kiểm tra giao dịch nạp</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {pendingWithdrawals > 0 && (
            <Link 
              href="/admin/withdrawals" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 hover:bg-blue-100/80 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {pendingWithdrawals}
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900">Yêu cầu rút tiền chờ duyệt</p>
                  <p className="text-[11px] text-blue-700">Cần chuyển khoản cho user</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {pendingOrders > 0 && (
            <Link 
              href="/admin/orders" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 hover:bg-amber-100/80 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {pendingOrders}
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Đơn hàng mới chờ xử lý</p>
                  <p className="text-[11px] text-amber-700">Xác nhận và đóng gói giao</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* Primary Key Metric Cards (Row 1: 4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tổng doanh thu</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 font-mono tracking-tight">
            {formatCurrency(stats?.totalRevenue || 0)}
          </h3>
          <div className="mt-2 flex items-center text-[11px] font-bold text-emerald-600 gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18.2%</span>
            <span className="text-slate-400 font-normal">so với hôm qua</span>
          </div>
        </Card>

        {/* Card 2: Orders */}
        <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tổng đơn hàng</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 font-mono tracking-tight">
            {(stats?.totalOrders || 0).toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">đơn</span>
          </h3>
          <div className="mt-2 flex items-center text-[11px] font-bold text-blue-600 gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats?.statusCounts?.completed || 0}</span>
            <span className="text-slate-400 font-normal">đã giao thành công</span>
          </div>
        </Card>

        {/* Card 3: Customers */}
        <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Khách hàng</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 font-mono tracking-tight">
            {(stats?.totalCustomers || 0).toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">user</span>
          </h3>
          <div className="mt-2 flex items-center text-[11px] font-bold text-emerald-600 gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8.7%</span>
            <span className="text-slate-400 font-normal">tài khoản hoạt động</span>
          </div>
        </Card>

        {/* Card 4: Top Products */}
        <Card className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Sản phẩm bán chạy</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 font-mono tracking-tight">
            {stats?.topProducts?.length || 0} <span className="text-xs font-semibold text-slate-400">mặt hàng</span>
          </h3>
          <div className="mt-2 flex items-center text-[11px] font-bold text-amber-600 gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+15.3%</span>
            <span className="text-slate-400 font-normal">sản lượng bán</span>
          </div>
        </Card>
      </div>

      {/* Secondary Financial Overview Bar (Row 2: 3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Nạp tiền trong tháng */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">User nạp tháng này</p>
              <h4 className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(stats.monthlyTopup || 0)}
              </h4>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
            Đã duyệt
          </span>
        </div>

        {/* Tiền nhập kho trong tháng */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tiền nhập SP tháng này</p>
              <h4 className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(stats.monthlyImportCost || 0)}
              </h4>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
            Giá trị kho
          </span>
        </div>

        {/* Tổng tiền luân chuyển */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tổng tiền giao dịch</p>
              <h4 className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(stats.totalTransactions || 0)}
              </h4>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
            Doanh thu + Nạp
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <AdminDashboardCharts revenueData={stats?.revenueChart || []} statusData={stats?.statusCounts || { completed: 0, shipping: 0, pending: 0, cancelled: 0 }} />


      {/* Bottom Section: Recent Orders (7 cols) & Activity / Top Products (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Orders Table: 7 cols */}
        <Card className="lg:col-span-7 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-slate-50">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-600" /> Đơn hàng mới nhất
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Các giao dịch đặt hàng gần đây</p>
            </div>
            <Link href="/admin/orders" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-400 border-b border-slate-100">
                    <th className="p-3.5 pl-5 font-bold">Mã đơn</th>
                    <th className="p-3.5 font-bold">Khách hàng</th>
                    <th className="p-3.5 font-bold">Tổng tiền</th>
                    <th className="p-3.5 font-bold">Trạng thái</th>
                    <th className="p-3.5 pr-5 font-bold text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">Chưa có đơn hàng nào</td>
                    </tr>
                  ) : (
                    recentOrders.map((order: any) => {
                      const badge = getStatusBadge(order.status)
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 pl-5 font-mono font-bold text-slate-800">
                            {order.order_code}
                          </td>
                          <td className="p-3.5 font-medium text-slate-700">
                            {order.profiles?.full_name || 'Khách hàng'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-emerald-600">
                            {formatCurrency(Number(order.final_amount))}
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 text-right text-slate-400 text-[11px] whitespace-nowrap font-medium">
                            {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(order.created_at).toLocaleDateString('vi-VN')}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Top Products & Activity: 5 cols */}
        <div className="lg:col-span-5 space-y-5">
          {/* Top Selling Products Card */}
          <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Sản phẩm bán chạy
              </CardTitle>
              <Link href="/admin/products" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Xem kho <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {stats.topProducts?.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">Chưa có dữ liệu bán hàng</div>
              ) : (
                stats.topProducts?.map((product: any, idx: number) => {
                  const rankColors = [
                    'bg-amber-100 text-amber-800 border-amber-300',
                    'bg-slate-100 text-slate-700 border-slate-300',
                    'bg-orange-100 text-orange-800 border-orange-300',
                    'bg-slate-50 text-slate-500 border-slate-200'
                  ]

                  return (
                    <div key={product.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border ${rankColors[idx] || rankColors[3]}`}>
                        {idx + 1}
                      </span>
                      <div className="w-11 h-11 rounded-lg overflow-hidden relative shrink-0 border border-slate-100 bg-slate-50">
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={product.name}>
                          {product.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Đã bán: <strong className="text-emerald-600 font-bold font-mono">{product.sold.toLocaleString()}</strong>
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline Card */}
          <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-slate-50">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" /> Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                {realTimeline.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-4">Chưa có hoạt động nào</div>
                ) : (
                  realTimeline.map((item: any, index: number) => {
                    const Icon = item.icon
                    return (
                      <div key={item.id} className="flex gap-3 relative">
                        {index !== realTimeline.length - 1 && (
                          <div className="absolute left-4 top-8 bottom-[-16px] w-px bg-slate-100"></div>
                        )}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.bg}`}>
                          <Icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-xs font-semibold text-slate-800 leading-snug truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.time}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
