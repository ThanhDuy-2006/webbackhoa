import { createAdminClient } from '@/lib/supabase/admin'

export const DashboardRepository = {
  async getDashboardStats() {
    const supabase = createAdminClient()
    
    // 1. Get total revenue (only paid orders)
    const { data: revenueData } = await supabase
      .from('orders')
      .select('final_amount')
      .eq('payment_status', 'paid')
      
    const totalRevenue = revenueData?.reduce((acc, order) => acc + Number(order.final_amount), 0) || 0

    // 2. Get total orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    // 3. Get total customers
    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')

    // 4. Get order statuses for the donut chart
    const { data: statusData } = await supabase
      .from('orders')
      .select('status')

    let statusCounts = {
      completed: 0,
      shipping: 0,
      pending: 0,
      cancelled: 0,
    }

    statusData?.forEach(order => {
      if (order.status === 'completed') statusCounts.completed++
      else if (order.status === 'shipping') statusCounts.shipping++
      else if (order.status === 'pending') statusCounts.pending++
      else if (order.status === 'cancelled') statusCounts.cancelled++
    })

    // 5. Get 7 days revenue
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        date: d.toISOString().split('T')[0], // YYYY-MM-DD
        display: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue: 0
      }
    })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentRevenueData } = await supabase
      .from('orders')
      .select('created_at, final_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', sevenDaysAgo.toISOString())

    recentRevenueData?.forEach(order => {
      const dateStr = order.created_at.split('T')[0]
      const dayData = last7Days.find(d => d.date === dateStr)
      if (dayData) {
        dayData.revenue += Number(order.final_amount)
      }
    })

    // Fetch real top selling products from order_items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        product_id, 
        quantity,
        products:product_id (name, image_url, images)
      `)

    let productSales: Record<string, { id: string, name: string, image: string, sold: number }> = {}

    if (orderItems) {
      orderItems.forEach((item: any) => {
        const pId = item.product_id
        if (!productSales[pId] && item.products) {
          const productData = Array.isArray(item.products) ? item.products[0] : item.products
          productSales[pId] = {
            id: pId,
            name: productData?.name || 'Sản phẩm',
            image: productData?.image_url || productData?.images?.[0] || 'https://placehold.co/100x100?text=SP',
            sold: 0
          }
        }
        if (productSales[pId]) {
          productSales[pId].sold += (item.quantity || 1)
        }
      })
    }

    let topProducts = Object.values(productSales).sort((a, b) => b.sold - a.sold).slice(0, 4)

    // Fallback if no order items exist (for new stores)
    if (topProducts.length === 0) {
      const { data: recentProducts } = await supabase
        .from('products')
        .select('id, name, image_url, images, price')
        .order('created_at', { ascending: false })
        .limit(4)
        
      if (recentProducts) {
        topProducts = recentProducts.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image_url || p.images?.[0] || 'https://placehold.co/100x100?text=SP',
          sold: 0 // No sales yet
        }))
      }
    }

    return {
      totalRevenue,
      totalOrders: totalOrders || 0,
      totalCustomers: totalCustomers || 0,
      statusCounts,
      revenueChart: last7Days,
      topProducts
    }
  },

  async getRecentOrders() {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('orders')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return data || []
  }
}
