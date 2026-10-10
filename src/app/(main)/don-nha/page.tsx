import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HouseworkRepository } from '@/repositories/housework.repository'
import { getMondayOfWeek } from '@/lib/housework-date'
import { HouseworkClient } from '@/features/housework/components/HouseworkClient'

export const metadata = {
  title: 'Lịch dọn nhà | Bách Hóa',
  description: 'Lịch phân công luân phiên dọn dẹp không gian chung gia đình theo tuần'
}

interface PageProps {
  searchParams: Promise<{
    week?: string
  }>
}

export default async function HouseworkPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const resolvedParams = await searchParams
  const weekStart = resolvedParams?.week ? getMondayOfWeek(resolvedParams.week) : getMondayOfWeek()

  const [tasks, summary, rotationSchedules] = await Promise.all([
    HouseworkRepository.getTasksByWeek(weekStart),
    HouseworkRepository.getWeekSummary(weekStart),
    HouseworkRepository.getRotationSchedule(8, user.id)
  ])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <HouseworkClient
        initialTasks={tasks}
        initialSummary={summary}
        rotationSchedules={rotationSchedules}
        weekStart={weekStart}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
