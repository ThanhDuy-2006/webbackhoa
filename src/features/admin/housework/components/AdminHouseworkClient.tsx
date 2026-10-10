'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  HouseworkTask, 
  HouseworkWeekSummary, 
  HouseworkSettings 
} from '@/types/housework.type'
import { 
  formatWeekRange, 
  shiftWeekMonday, 
  getMondayOfWeek, 
  getVietnamTodayString, 
  formatFullDayVietnamese,
  isToday 
} from '@/lib/housework-date'
import { HouseworkTaskDialog } from './HouseworkTaskDialog'
import { DeleteTaskDialog } from './DeleteTaskDialog'
import { 
  deleteHouseworkTaskAction, 
  copyTasksFromPreviousWeekAction, 
  rotateTasksForWeekAction, 
  updateHouseworkSettingsAction,
  toggleTaskStatusAction
} from '@/actions/housework.actions'
import { 
  Plus, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AdminHouseworkClientProps {
  initialTasks: HouseworkTask[]
  initialSummary: HouseworkWeekSummary
  initialSettings: HouseworkSettings
  weekStart: string
  users: Array<{
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }>
}

export function AdminHouseworkClient({
  initialTasks,
  initialSummary,
  initialSettings,
  weekStart,
  users
}: AdminHouseworkClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<HouseworkTask[]>(initialTasks)
  const [summary, setSummary] = useState<HouseworkWeekSummary>(initialSummary)
  const [autoRotate, setAutoRotate] = useState<boolean>(initialSettings.auto_rotate)

  // Dialog states
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<HouseworkTask | null>(null)
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingTask, setDeletingTask] = useState<HouseworkTask | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Action loadings
  const [copyLoading, setCopyLoading] = useState(false)
  const [rotateLoading, setRotateLoading] = useState(false)
  const [settingLoading, setSettingLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const currentRealMonday = getMondayOfWeek(getVietnamTodayString())
  const isCurrentWeek = weekStart === currentRealMonday

  const handleNavigateWeek = (newWeekStart: string) => {
    router.push(`/admin/housework?week=${newWeekStart}`)
  }

  // Handle task status toggle
  const handleToggleStatus = async (task: HouseworkTask) => {
    setTogglingId(task.id)
    try {
      const res = await toggleTaskStatusAction(task.id)
      if (res.success) {
        toast.success('Đã cập nhật trạng thái công việc')
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi cập nhật trạng thái')
      }
    } finally {
      setTogglingId(null)
    }
  }

  // Handle delete task
  const handleDeleteConfirm = async () => {
    if (!deletingTask) return
    setDeleteLoading(true)
    try {
      const res = await deleteHouseworkTaskAction(deletingTask.id)
      if (res.success) {
        toast.success('Đã xóa công việc thành công')
        setIsDeleteDialogOpen(false)
        setDeletingTask(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi khi xóa công việc')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  // Handle copy from previous week
  const handleCopyPreviousWeek = async () => {
    if (!confirm(`Bạn có chắc muốn sao chép công việc từ tuần trước (${formatWeekRange(shiftWeekMonday(weekStart, -1))}) sang tuần này không?`)) {
      return
    }
    setCopyLoading(true)
    try {
      const res = await copyTasksFromPreviousWeekAction(weekStart)
      if (res.success) {
        toast.success(`Đã sao chép thành công ${res.copiedCount} công việc!`)
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi khi sao chép')
      }
    } finally {
      setCopyLoading(false)
    }
  }

  // Handle rotate tasks
  const handleRotateTasks = async () => {
    if (!confirm(`Bạn có chắc muốn xoay vòng phân công nhiệm vụ từ tuần trước sang tuần này không? Hệ thống sẽ luân phiên người nhận việc theo thứ tự.`)) {
      return
    }
    setRotateLoading(true)
    try {
      const res = await rotateTasksForWeekAction(weekStart)
      if (res.success) {
        toast.success(`Đã xoay vòng và tạo ${res.rotatedCount} công việc mới cho tuần này!`)
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi khi xoay vòng')
      }
    } finally {
      setRotateLoading(false)
    }
  }

  // Handle toggle auto rotate setting
  const handleAutoRotateChange = async (checked: boolean) => {
    setAutoRotate(checked)
    setSettingLoading(true)
    try {
      const res = await updateHouseworkSettingsAction(checked)
      if (res.success) {
        toast.success(`Đã ${checked ? 'bật' : 'tắt'} chế độ tự động xoay vòng phân công`)
      } else {
        setAutoRotate(!checked)
        toast.error(res.error || 'Lỗi lưu cấu hình')
      }
    } finally {
      setSettingLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200 dark:shadow-none">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Quản lý Phân công dọn nhà
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Thiết lập nhiệm vụ, phân bổ thành viên, sao chép hoặc xoay vòng lịch dọn dẹp hàng tuần
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/don-nha" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-400" /> Xem trang thành viên
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null)
              setIsTaskDialogOpen(true)
            }}
            className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" /> Thêm công việc
          </Button>
        </div>
      </div>

      {/* Week Selector & Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Week navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigateWeek(shiftWeekMonday(weekStart, -1))}
              className="rounded-xl border-slate-200 dark:border-slate-800 h-9 px-3"
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
              className="rounded-xl border-slate-200 dark:border-slate-800 h-9 px-3"
            >
              Tuần sau <ChevronRight className="w-4 h-4 ml-1" />
            </Button>

            {!isCurrentWeek && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleNavigateWeek(currentRealMonday)}
                className="rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                Về tuần này
              </Button>
            )}
          </div>

          {/* Quick automation tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={copyLoading}
              onClick={handleCopyPreviousWeek}
              className="rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Sao chép toàn bộ việc từ tuần trước sang tuần này"
            >
              <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
              {copyLoading ? 'Đang chép...' : 'Sao chép tuần trước'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={rotateLoading}
              onClick={handleRotateTasks}
              className="rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              title="Tự động luân phiên người làm từ tuần trước sang tuần này"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${rotateLoading ? 'animate-spin' : ''}`} />
              {rotateLoading ? 'Đang xoay...' : 'Xoay vòng phân công'}
            </Button>

            {/* Auto-rotate Toggle */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <Switch
                id="auto-rotate-switch"
                checked={autoRotate}
                disabled={settingLoading}
                onCheckedChange={handleAutoRotateChange}
              />
              <Label htmlFor="auto-rotate-switch" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Tự động xoay vòng
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Member completion overview */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tỷ lệ hoàn thành của các thành viên tuần này
            </h2>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Cả nhà: <strong className="text-emerald-600 font-bold">{summary.completion_rate}%</strong> ({summary.completed_tasks}/{summary.total_tasks} việc)
          </div>
        </div>

        {summary.member_stats.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Chưa có công việc nào được phân công trong tuần này.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.member_stats.map((m) => (
              <div 
                key={m.user_id}
                className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                      ) : (
                        m.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {m.full_name}
                    </span>
                  </div>

                  <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
                    m.rate === 100 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : m.rate > 0 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {m.rate}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Hoàn thành: <strong>{m.completed}/{m.total}</strong></span>
                  <span>Chưa làm: <strong>{m.pending}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Danh sách công việc trong tuần ({tasks.length})
          </h2>
        </div>

        {tasks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Chưa có công việc nào trong tuần này
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Bấm &ldquo;Thêm công việc&rdquo; để phân công mới, hoặc &ldquo;Sao chép tuần trước&rdquo; để tái sử dụng lịch trực nhật.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingTask(null)
                setIsTaskDialogOpen(true)
              }}
              className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Thêm công việc đầu tiên
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Tên công việc</th>
                  <th className="py-3 px-4 font-bold">Người thực hiện</th>
                  <th className="py-3 px-4 font-bold">Ngày làm</th>
                  <th className="py-3 px-4 font-bold">Trạng thái</th>
                  <th className="py-3 px-4 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.map((task) => {
                  const isDone = task.status === 'completed'
                  const isDayToday = isToday(task.task_date)
                  const isToggling = togglingId === task.id

                  return (
                    <tr 
                      key={task.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        isDayToday && !isDone ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Title & note */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className={`font-bold text-sm ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {task.title}
                          </div>
                          {task.note && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                              Ghi chú: {task.note}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {task.assignee?.avatar_url ? (
                              <img src={task.assignee.avatar_url} alt={task.assignee.full_name || 'User'} className="w-full h-full object-cover" />
                            ) : (
                              (task.assignee?.full_name?.charAt(0) || 'U').toUpperCase()
                            )}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {task.assignee?.full_name || task.assignee?.email?.split('@')[0] || 'Chưa rõ'}
                          </span>
                        </div>
                      </td>

                      {/* Day */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {formatFullDayVietnamese(task.task_date)}
                          </div>
                          {isDayToday && (
                            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-1.5 rounded-full">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status (Clickable to toggle) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleStatus(task)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          }`}
                          title="Bấm để đổi trạng thái"
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Chưa làm
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTask(task)
                              setIsTaskDialogOpen(true)
                            }}
                            className="rounded-lg h-8 px-2.5 text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            title="Sửa công việc"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Sửa
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingTask(task)
                              setIsDeleteDialogOpen(true)
                            }}
                            className="rounded-lg h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title="Xóa công việc"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Create / Edit Dialog */}
      <HouseworkTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        task={editingTask}
        weekStart={weekStart}
        users={users}
        onSuccess={() => router.refresh()}
      />

      {/* Task Delete Dialog */}
      <DeleteTaskDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        task={deletingTask}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  )
}
