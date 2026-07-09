import { DashboardRepository } from '@/repositories/dashboard.repository'

export const DashboardService = {
  async getDashboardData() {
    const stats = await DashboardRepository.getDashboardStats()
    const recentOrders = await DashboardRepository.getRecentOrders()

    return {
      stats,
      recentOrders
    }
  }
}
