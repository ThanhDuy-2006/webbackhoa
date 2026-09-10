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

      // 1. Total revenue
      let totalRevenue = 0
      try {
        const { data: revenueData, error } = await supabase
          .from('orders')
          .select('final_amount')
          .eq('payment_status', 'paid')
        if (!error && revenueData) {
          totalRevenue = revenueData.reduce((acc, order) => acc + Number(order.final_amount || 0), 0)
        }
      } catch (err) {
        console.error('Error fetching total revenue:', err)
      }

      // 2. Total orders
      let totalOrders = 0
      try {
        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
        if (!error && typeof count === 'number') {
          totalOrders = count
        }
      } catch (err) {
        console.error('Error fetching total orders:', err)
      }

      // 3. Total customers
      let totalCustomers = 0
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user')
        if (!error && typeof count === 'number') {
          totalCustomers = count
        }
      } catch (err) {
        console.error('Error fetching total customers:', err)
      }

      // 4. Status counts
      const statusCounts = {
        completed: 0,
        shipping: 0,
        pending: 0,
        cancelled: 0,
      }
      try {
        const { data: statusData, error } = await supabase
          .from('orders')
          .select('status')
        if (!error && statusData) {
          statusData.forEach(order => {
            const s = (order.status || '').toLowerCase()
            if (s === 'completed') statusCounts.completed++
            else if (s === 'shipping') statusCounts.shipping++
            else if (s === 'cancelled' || s === 'refunded') statusCounts.cancelled++
            else statusCounts.pending++
          })
        }
      } catch (err) {
        console.error('Error fetching status counts:', err)
      }

      // 5. 7 days revenue
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { data: recentRevenueData, error } = await supabase
          .from('orders')
          .select('created_at, final_amount')
          .eq('payment_status', 'paid')
          .gte('created_at', sevenDaysAgo.toISOString())

        if (!error && recentRevenueData) {
          recentRevenueData.forEach(order => {
            const dateStr = order.created_at?.split('T')[0]
            const dayData = last7Days.find(d => d.date === dateStr)
            if (dayData) {
              dayData.revenue += Number(order.final_amount || 0)
            }
          })
        }
      } catch (err) {
        console.error('Error fetching recent revenue:', err)
      }

      // 6. Top selling products
      let topProducts: Array<{ id: string; name: string; image: string; sold: number }> = []
      try {
        const { data: orderItems, error } = await supabase
          .from('order_items')
          .select(`
            product_id, 
            quantity,
            products:product_id (name, image_url, images)
          `)

        const productSales: Record<string, { id: string; name: string; image: string; sold: number }> = {}

        if (!error && orderItems) {
          orderItems.forEach((item: any) => {
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
        }

        topProducts = Object.values(productSales).sort((a, b) => b.sold - a.sold).slice(0, 4)

        if (topProducts.length === 0) {
          const { data: recentProducts, error: prodErr } = await supabase
            .from('products')
            .select('id, name, image_url, images, price')
            .order('created_at', { ascending: false })
            .limit(4)

          if (!prodErr && recentProducts) {
            topProducts = recentProducts.map(p => ({
              id: p.id,
              name: p.name,
              image: p.image_url || p.images?.[0] || 'https://placehold.co/100x100?text=SP',
              sold: 0,
            }))
          }
        }
      } catch (err) {
        console.error('Error fetching top products:', err)
      }

      // 7. Monthly Topups, Monthly Imports, Pending Actions
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      let monthlyTopup = 0
      let totalTopupAllTime = 0
      let monthlyImportCost = 0
      let pendingTopupsCount = 0
      let pendingWithdrawalsCount = 0

      try {
        const { data: monthlyTopupsData, error: mtErr } = await supabase
          .from('topup_requests')
          .select('amount')
          .eq('status', 'approved')
          .gte('created_at', startOfMonth)
        if (!mtErr && monthlyTopupsData) {
          monthlyTopup = monthlyTopupsData.reduce((acc, row) => acc + Number(row.amount || 0), 0)
        }
      } catch (err) {
        console.error('Error fetching monthly topups:', err)
      }

      try {
        const { data: allApprovedTopupsData, error: atErr } = await supabase
          .from('topup_requests')
          .select('amount')
          .eq('status', 'approved')
        if (!atErr && allApprovedTopupsData) {
          totalTopupAllTime = allApprovedTopupsData.reduce((acc, row) => acc + Number(row.amount || 0), 0)
        }
      } catch (err) {
        console.error('Error fetching total approved topups:', err)
      }

      try {
        const { data: monthlyImportsData, error: miErr } = await supabase
          .from('inventory_logs')
          .select('qty_before, qty_after, products:product_id(price)')
          .eq('type', 'IMPORT')
          .gte('created_at', startOfMonth)
        if (!miErr && monthlyImportsData) {
          monthlyImportCost = monthlyImportsData.reduce((acc: number, log: any) => {
            const qtyAdded = Math.max(0, (log.qty_after || 0) - (log.qty_before || 0))
            const prodData = Array.isArray(log.products) ? log.products[0] : log.products
            const prodPrice = prodData ? Number(prodData.price || 0) : 0
            return acc + qtyAdded * prodPrice
          }, 0)
        }
      } catch (err) {
        console.error('Error fetching monthly import cost:', err)
      }

      try {
        const { count, error: ptErr } = await supabase
          .from('topup_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        if (!ptErr && typeof count === 'number') {
          pendingTopupsCount = count
        }
      } catch (err) {
        console.error('Error fetching pending topups count:', err)
      }

      try {
        const { count, error: pwErr } = await supabase
          .from('withdrawal_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        if (!pwErr && typeof count === 'number') {
          pendingWithdrawalsCount = count
        }
      } catch (err) {
        console.error('Error fetching pending withdrawals count (table may not exist yet):', err)
      }

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
