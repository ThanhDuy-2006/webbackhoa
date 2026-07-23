import { DashboardService } from '@/services/dashboard.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, ShoppingBag, Package, TrendingUp, MoreHorizontal, CheckCircle2, Clock, Truck, XCircle, FileEdit, UserPlus, CreditCard, Receipt, ArrowLeftRight } from 'lucide-react'
import Link from 'next/link'
import { AdminDashboardCharts } from '@/features/admin/dashboard/components/AdminDashboardCharts'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id).single()
  
  const firstName = profile?.full_name?.split(' ').pop() || 'Admin'

  const { stats, recentOrders } = await DashboardService.getDashboardData()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Get status badge colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-600'
      case 'shipping': return 'bg-blue-100 text-blue-600'
      case 'pending': return 'bg-orange-100 text-orange-600'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Đã giao'
      case 'shipping': return 'Đang giao'
      case 'pending': return 'Chờ xử lý'
      case 'cancelled': return 'Đã hủy'
      default: return status
    }
  }

  // Generate real timeline from recent orders
  const realTimeline = recentOrders.slice(0, 4).map((order: any) => {
    let icon = Clock, color = 'text-orange-500', bg = 'bg-orange-100', title = ''
    
    if (order.status === 'completed') {
      icon = CheckCircle2; color = 'text-emerald-500'; bg = 'bg-emerald-100';
      title = `Đơn hàng ${order.order_code} đã được giao thành công`;
    } else if (order.status === 'pending') {
      icon = ShoppingBag; color = 'text-purple-500'; bg = 'bg-purple-100';
      title = `Khách hàng ${order.profiles?.full_name || 'Khách'} đã đặt đơn hàng mới`;
    } else if (order.status === 'shipping') {
      icon = Truck; color = 'text-blue-500'; bg = 'bg-blue-100';
      title = `Đơn hàng ${order.order_code} đang được vận chuyển`;
    } else {
      icon = XCircle; color = 'text-red-500'; bg = 'bg-red-100';
      title = `Đơn hàng ${order.order_code} đã bị hủy`;
    }

    // Format time difference
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

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[28px] font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            Chào buổi sáng, {firstName}! 👋
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Đây là tổng quan hoạt động của cửa hàng hôm nay.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Revenue */}
        <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Tổng doanh thu</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats.totalRevenue.toLocaleString('vi-VN')} VND</h3>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
              <TrendingUp className="w-4 h-4 mr-1" />
              +18.2% <span className="text-slate-500 font-normal ml-1">so với hôm qua</span>
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Đơn hàng</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats.totalOrders}</h3>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
              <TrendingUp className="w-4 h-4 mr-1" />
              +12.4% <span className="text-slate-500 font-normal ml-1">so với hôm qua</span>
            </div>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Khách hàng</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats.totalCustomers}</h3>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
              <TrendingUp className="w-4 h-4 mr-1" />
              +8.7% <span className="text-slate-500 font-normal ml-1">so với hôm qua</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Sản phẩm bán chạy</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats.topProducts?.length || 0}</h3>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
              <TrendingUp className="w-4 h-4 mr-1" />
              +15.3% <span className="text-slate-500 font-normal ml-1">so với hôm qua</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Financial Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {/* Nạp tiền trong tháng */}
        <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">User nạp trong tháng</p>
                  <h3 className="text-2xl font-bold text-slate-800">{(stats.monthlyTopup || 0).toLocaleString('vi-VN')} VND</h3>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full">
              Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()} (Đã duyệt)
            </div>
          </CardContent>
        </Card>

        {/* Tiền nhập sản phẩm trong tháng */}
        <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Tiền nhập SP trong tháng</p>
                  <h3 className="text-2xl font-bold text-slate-800">{(stats.monthlyImportCost || 0).toLocaleString('vi-VN')} VND</h3>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-700 bg-amber-50 w-fit px-3 py-1 rounded-full">
              Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()} (Tổng giá trị kho)
            </div>
          </CardContent>
        </Card>

        {/* Tổng tiền giao dịch */}
        <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl hover:-translate-y-1 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <ArrowLeftRight className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Tổng tiền giao dịch</p>
                  <h3 className="text-2xl font-bold text-slate-800">{(stats.totalTransactions || 0).toLocaleString('vi-VN')} VND</h3>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 w-fit px-3 py-1 rounded-full">
              Tổng doanh thu + Tổng tiền nạp
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <AdminDashboardCharts revenueData={stats.revenueChart} statusData={stats.statusCounts} />

      {/* Tables & Lists Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Orders */}
        <Card className="col-span-2 rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold text-slate-800">Đơn hàng mới nhất</CardTitle>
            <Link href="/admin/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">Xem tất cả</Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 rounded-lg">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-l-lg">Mã đơn</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Tổng tiền</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium rounded-r-lg">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có đơn hàng nào</td>
                    </tr>
                  ) : (
                    recentOrders.map(order => (
                      <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 font-medium text-slate-800">{order.order_code}</td>
                        <td className="px-4 py-4 text-slate-600">{order.profiles?.full_name || 'Khách hàng'}</td>
                        <td className="px-4 py-4 font-semibold text-slate-800">{formatCurrency(Number(order.final_amount))}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500">{new Date(order.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - {new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="col-span-1 rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-800">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {realTimeline.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-4">Chưa có hoạt động nào</div>
              ) : (
                realTimeline.map((item: any, index: number) => {
                  const Icon = item.icon
                  return (
                    <div key={item.id} className="flex gap-4 relative">
                      {/* Vertical Line */}
                      {index !== realTimeline.length - 1 && (
                        <div className="absolute left-[19px] top-[40px] bottom-[-24px] w-px bg-slate-100"></div>
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.bg}`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-medium text-slate-700 leading-snug">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products List */}
        <Card className="col-span-3 rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-xl mt-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-bold text-slate-800">Sản phẩm bán chạy nhất</CardTitle>
            <Link href="/admin/products" className="text-sm font-medium text-blue-600 hover:text-blue-700">Xem tất cả</Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.topProducts?.map((product: any) => (
                <div key={product.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 border border-slate-100">
                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-800 truncate" title={product.name}>{product.name}</p>
                    <p className="text-xs text-slate-500 mt-1"><span className="font-medium text-emerald-600">{product.sold.toLocaleString()}</span> đã bán</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Calendar(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function ChevronDown(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
