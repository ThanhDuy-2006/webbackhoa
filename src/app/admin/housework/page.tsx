import { createClient } from '@/lib/supabase/server'
import { HouseworkRepository } from '@/repositories/housework.repository'
import { getMondayOfWeek } from '@/lib/housework-date'
import { AdminHouseworkClient } from '@/features/admin/housework/components/AdminHouseworkClient'

export const metadata = {
  title: 'Quản lý Phân công dọn nhà | Bách Hóa Admin',
  description: 'Quản lý lịch trực nhật và phân công công việc gia đình'
}

interface PageProps {
  searchParams: Promise<{
    week?: string
  }>
}

export default async function AdminHouseworkPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const resolvedParams = await searchParams
  const weekStart = resolvedParams?.week ? getMondayOfWeek(resolvedParams.week) : getMondayOfWeek()

  // Fetch tasks, summary, settings, rotation config and real user profiles in parallel
  const [tasks, summary, settings, usersResult, rotationData] = await Promise.all([
    HouseworkRepository.getTasksByWeek(weekStart),
    HouseworkRepository.getWeekSummary(weekStart),
    HouseworkRepository.getSettings(),
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .order('full_name', { ascending: true }),
    HouseworkRepository.getRotationConfigAndMembers()
  ])

  const users = usersResult.data || []

  return (
    <div className="space-y-6">
      <AdminHouseworkClient
        initialTasks={tasks}
        initialSummary={summary}
        initialSettings={settings}
        initialRotationConfig={rotationData.config}
        initialRotationMembers={rotationData.members}
        weekStart={weekStart}
        users={users}
      />
    </div>
  )
}
