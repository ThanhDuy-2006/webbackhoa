import { DatabaseMaintenanceClient } from '@/features/admin/settings/components/DatabaseMaintenanceClient'
import { getDatabaseMaintenanceStats, getDatabaseMaintenanceHistory } from '@/actions/admin/maintenance.actions'

export const revalidate = 0

export default async function AdminDatabaseSettingsPage() {
  const [statsRes, historyRes] = await Promise.all([
    getDatabaseMaintenanceStats(),
    getDatabaseMaintenanceHistory(15)
  ])

  const initialStats = statsRes.success ? statsRes.data : null
  const initialHistory = (historyRes.success && historyRes.data) ? historyRes.data : []

  return (
    <div className="py-2">
      <DatabaseMaintenanceClient initialStats={initialStats} initialHistory={initialHistory} />
    </div>
  )
}
