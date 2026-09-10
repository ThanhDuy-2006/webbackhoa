import { DashboardRepository } from '@/repositories/dashboard.repository'

export const DashboardService = {
  async getDashboardData() {
    try {
      const stats = await DashboardRepository.getDashboardStats()
      const recentOrders = await DashboardRepository.getRecentOrders()

      return {
        stats,
        recentOrders: recentOrders || []
      }
    } catch (error) {
      console.error('Error in DashboardService.getDashboardData:', error)
      return {
        stats: {
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
          revenueChart: [],
          topProducts: []
        },
        recentOrders: []
      }
    }
  }
}

