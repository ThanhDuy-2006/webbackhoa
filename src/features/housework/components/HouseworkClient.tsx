'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HouseworkTask, HouseworkWeekSummary } from '@/types/housework.type'
import { formatWeekRange, shiftWeekMonday, getMondayOfWeek, getVietnamTodayString } from '@/lib/housework-date'
import { HouseworkStatsCard } from './HouseworkStatsCard'
import { MyTasksSection } from './MyTasksSection'
import { FamilyTasksTable } from './FamilyTasksTable'
import { HouseworkHistoryDialog } from './HouseworkHistoryDialog'
import { toggleTaskStatusAction } from '@/actions/housework.actions'
import { ChevronLeft, ChevronRight, Calendar, History, Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface HouseworkClientProps {
  initialTasks: HouseworkTask[]
  initialSummary: HouseworkWeekSummary
  weekStart: string
  currentUserId: string
  isAdmin: boolean
}

export function HouseworkClient({
  initialTasks,
  initialSummary,
  weekStart,
  currentUserId,
  isAdmin
}: HouseworkClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<HouseworkTask[]>(initialTasks)
  const [summary, setSummary] = useState<HouseworkWeekSummary>(initialSummary)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const currentRealMonday = getMondayOfWeek(getVietnamTodayString())
  const isCurrentWeek = weekStart === currentRealMonday

  const handleNavigateWeek = (newWeekStart: string) => {
    router.push(`/don-nha?week=${newWeekStart}`)
  }

  const handleToggleStatus = async (taskId: string) => {
    setTogglingId(taskId)

    // Optimistic update
    const previousTasks = [...tasks]
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'pending' ? 'completed' : 'pending'
        return {
          ...t,
          status: nextStatus as any,
          completed_at: nextStatus === 'completed' ? new Date().toISOString() : null
        }
      }
      return t
    })

    setTasks(updatedTasks)

    // Recalculate summary optimistically
    const total = updatedTasks.length
    const completed = updatedTasks.filter(t => t.status === 'completed').length
    const pending = total - completed
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    setSummary(prev => ({
      ...prev,
      completed_tasks: completed,
      pending_tasks: pending,
      completion_rate: rate
    }))

    try {
      const res = await toggleTaskStatusAction(taskId)
      if (res.success && res.data) {
        toast.success(
          res.data.status === 'completed' 
            ? 'Đã đánh dấu hoàn thành công việc! 🎉' 
            : 'Đã hoàn tác trạng thái chưa làm'
        )
        router.refresh()
      } else {
        // Revert on error
        setTasks(previousTasks)
        setSummary(initialSummary)
        toast.error(res.error || 'Lỗi khi cập nhật trạng thái')
      }
    } catch (err: any) {
      setTasks(previousTasks)
      setSummary(initialSummary)
      toast.error('Có lỗi xảy ra khi cập nhật')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200 dark:shadow-none">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Phân công dọn nhà
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi trách nhiệm dọn dẹp và giữ gìn không gian chung của các thành viên trong gia đình
          </p>
        </div>

        {/* Action Controls: History + Admin Link */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <History className="w-4 h-4 mr-1.5 text-slate-500" /> Lịch sử các tuần
          </Button>

          {isAdmin && (
            <Link href="/admin/housework">
              <Button
                size="sm"
                className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-1.5" /> Quản lý phân công (Admin)
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigateWeek(shiftWeekMonday(weekStart, -1))}
            className="rounded-xl border-slate-200 dark:border-slate-800 h-9 px-3 cursor-pointer"
            title="Xem tuần trước"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Tuần trước
          </Button>

          <div className="flex items-center gap-2 font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{formatWeekRange(weekStart)}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigateWeek(shiftWeekMonday(weekStart, 1))}
            className="rounded-xl border-slate-200 dark:border-slate-800 h-9 px-3 cursor-pointer"
            title="Xem tuần sau"
          >
            Tuần sau <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Current week quick jump button */}
        {!isCurrentWeek && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleNavigateWeek(currentRealMonday)}
            className="rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 cursor-pointer"
          >
            Về tuần hiện tại
          </Button>
        )}
      </div>

      {/* Family Progress Card */}
      <HouseworkStatsCard summary={summary} />

      {/* My Tasks Section */}
      <MyTasksSection
        tasks={tasks}
        currentUserId={currentUserId}
        onToggleStatus={handleToggleStatus}
        togglingId={togglingId}
      />

      {/* Family Tasks Full Table */}
      <FamilyTasksTable
        tasks={tasks}
        weekStart={weekStart}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onToggleStatus={handleToggleStatus}
        togglingId={togglingId}
      />

      {/* History Dialog */}
      <HouseworkHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        onSelectWeek={handleNavigateWeek}
      />
    </div>
  )
}
