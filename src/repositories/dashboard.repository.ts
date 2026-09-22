import { createAdminClient } from '@/lib/supabase/admin'

export const DashboardRepository = {
  async getDashboardStats() {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        date: d.toISOString().split('T')[0],
        display: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue: 0,
      }
    })

    const defaultStats = {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      monthlyTopup: 0,
      monthlyImportCost: 0,
      totalTransactions: 0,
      statusCounts: {
        completed: 0,
        shipping: 0,
        pending: 0,
        cancelled: 0,
      },
      pendingTopupsCount: 0,
      pendingWithdrawalsCount: 0,
      pendingOrdersCount: 0,
      revenueChart: last7Days,
      topProducts: [] as Array<{ id: string; name: string; image: string; sold: number }>,
    }

    try {
      const supabase = createAdminClient()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [
        revenueRes,
        ordersCountRes,
        customersCountRes,
        statusDataRes,
        recentRevenueRes,
        orderItemsRes,
        monthlyTopupsRes,
        allApprovedTopupsRes,
        monthlyImportsRes,
        pendingTopupsRes,
        pendingWithdrawalsRes,
      ] = await Promise.all([
        supabase.from('orders').select('final_amount').eq('payment_status', 'paid'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('orders').select('status'),
        supabase.from('orders').select('created_at, final_amount').eq('payment_status', 'paid').gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('order_items').select('product_id, quantity, products:product_id (name, image_url, images)'),
        supabase.from('topup_requests').select('amount').eq('status', 'approved').gte('created_at', startOfMonth),
        supabase.from('topup_requests').select('amount').eq('status', 'approved'),
        supabase.from('inventory_logs').select('qty_before, qty_after, products:product_id(price)').eq('type', 'IMPORT').gte('created_at', startOfMonth),
        supabase.from('topup_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      // 1. Total revenue
      let totalRevenue = 0
      if (!revenueRes.error && revenueRes.data) {
        totalRevenue = revenueRes.data.reduce((acc, order) => acc + Number(order.final_amount || 0), 0)
      }

      // 2. Total orders
      const totalOrders = (!ordersCountRes.error && typeof ordersCountRes.count === 'number') ? ordersCountRes.count : 0

      // 3. Total customers
      const totalCustomers = (!customersCountRes.error && typeof customersCountRes.count === 'number') ? customersCountRes.count : 0

      // 4. Status counts
      const statusCounts = {
        completed: 0,
        shipping: 0,
        pending: 0,
        cancelled: 0,
      }
      if (!statusDataRes.error && statusDataRes.data) {
        statusDataRes.data.forEach(order => {
          const s = (order.status || '').toLowerCase()
          if (s === 'completed') statusCounts.completed++
          else if (s === 'shipping') statusCounts.shipping++
          else if (s === 'cancelled' || s === 'refunded') statusCounts.cancelled++
          else statusCounts.pending++
        })
      }

      // 5. 7 days revenue
      if (!recentRevenueRes.error && recentRevenueRes.data) {
        recentRevenueRes.data.forEach(order => {
          const dateStr = order.created_at?.split('T')[0]
          const dayData = last7Days.find(d => d.date === dateStr)
          if (dayData) {
            dayData.revenue += Number(order.final_amount || 0)
          }
        })
      }

      // 6. Top selling products
      let topProducts: Array<{ id: string; name: string; image: string; sold: number }> = []
      if (!orderItemsRes.error && orderItemsRes.data) {
        const productSales: Record<string, { id: string; name: string; image: string; sold: number }> = {}
        orderItemsRes.data.forEach((item: any) => {
          const pId = item.product_id
          if (!productSales[pId] && item.products) {
            const productData = Array.isArray(item.products) ? item.products[0] : item.products
            productSales[pId] = {
              id: pId,
              name: productData?.name || 'Sản phẩm',
              image: productData?.image_url || productData?.images?.[0] || 'https://placehold.co/100x100?text=SP',
              sold: 0,
            }
          }
          if (productSales[pId]) {
            productSales[pId].sold += Number(item.quantity || 1)
          }
        })
        topProducts = Object.values(productSales).sort((a, b) => b.sold - a.sold).slice(0, 4)
      }

      // 7. Monthly Topups, Monthly Imports, Pending Actions
      let monthlyTopup = 0
      if (!monthlyTopupsRes.error && monthlyTopupsRes.data) {
        monthlyTopup = monthlyTopupsRes.data.reduce((acc, row) => acc + Number(row.amount || 0), 0)
      }

      let totalTopupAllTime = 0
      if (!allApprovedTopupsRes.error && allApprovedTopupsRes.data) {
        totalTopupAllTime = allApprovedTopupsRes.data.reduce((acc, row) => acc + Number(row.amount || 0), 0)
      }

      let monthlyImportCost = 0
      if (!monthlyImportsRes.error && monthlyImportsRes.data) {
        monthlyImportCost = monthlyImportsRes.data.reduce((acc: number, log: any) => {
          const qtyAdded = Math.max(0, (log.qty_after || 0) - (log.qty_before || 0))
          const prodData = Array.isArray(log.products) ? log.products[0] : log.products
          const prodPrice = prodData ? Number(prodData.price || 0) : 0
          return acc + qtyAdded * prodPrice
        }, 0)
      }

      const pendingTopupsCount = (!pendingTopupsRes.error && typeof pendingTopupsRes.count === 'number') ? pendingTopupsRes.count : 0
      const pendingWithdrawalsCount = (!pendingWithdrawalsRes.error && typeof pendingWithdrawalsRes.count === 'number') ? pendingWithdrawalsRes.count : 0
      const totalTransactions = totalRevenue + totalTopupAllTime

      return {
        totalRevenue,
        totalOrders,
        totalCustomers,
        monthlyTopup,
        monthlyImportCost,
        totalTransactions,
        statusCounts,
        pendingTopupsCount,
        pendingWithdrawalsCount,
        pendingOrdersCount: statusCounts.pending,
        revenueChart: last7Days,
        topProducts,
      }
    } catch (criticalErr) {
      console.error('Critical error in getDashboardStats:', criticalErr)
      return defaultStats
    }
  },

  async getRecentOrders() {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error || !data) {
        console.error('Error fetching recent orders:', error)
        return []
      }

      return data
    } catch (err) {
      console.error('Error in getRecentOrders:', err)
      return []
    }
  }
}
