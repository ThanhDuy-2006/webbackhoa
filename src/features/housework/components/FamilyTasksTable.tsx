'use client'

import { useState } from 'react'
import { HouseworkTask } from '@/types/housework.type'
import { getWeekDays, formatFullDayVietnamese, isToday, WeekDayInfo } from '@/lib/housework-date'
import { Check, CheckCircle2, Clock, Calendar, AlertCircle, Sparkles, User, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FamilyTasksTableProps {
  tasks: HouseworkTask[]
  weekStart: string
  currentUserId: string
  isAdmin: boolean
  onToggleStatus: (taskId: string) => Promise<void>
  togglingId: string | null
}

export function FamilyTasksTable({
  tasks,
  weekStart,
  currentUserId,
  isAdmin,
  onToggleStatus,
  togglingId
}: FamilyTasksTableProps) {
  const [selectedDay, setSelectedDay] = useState<string>('all') // 'all' or 'YYYY-MM-DD'

  const weekDays: WeekDayInfo[] = getWeekDays(weekStart)

  const filteredTasks = tasks.filter(task => {
    if (selectedDay === 'all') return true
    return task.task_date === selectedDay
  })

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Header & Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bảng công việc tuần này (Cả nhà)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Toàn bộ lịch trực nhật và dọn dẹp phân công theo ngày
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredTasks.length} / {tasks.length} công việc
          </span>
        </div>

        {/* Day-of-week Filter Buttons */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-1 px-1 pt-1 pb-1">
          <button
            type="button"
            onClick={() => setSelectedDay('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
              selectedDay === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả tuần
          </button>

          {weekDays.map((day) => {
            const isDaySelected = selectedDay === day.dateStr
            const countForDay = tasks.filter(t => t.task_date === day.dateStr).length

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay(day.dateStr)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                  isDaySelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : day.isToday
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{day.shortDayName}</span>
                <span className="text-[11px] opacity-75">({day.displayDate})</span>
                {day.isToday && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isDaySelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
                {countForDay > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ${isDaySelected ? 'bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {countForDay}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Task List / Table */}
      {filteredTasks.length === 0 ? (
        <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Không có công việc nào trong khoảng thời gian đã chọn
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {selectedDay !== 'all' ? 'Hãy chọn ngày khác hoặc chuyển sang tuần tiếp theo.' : 'Chưa có công việc nào được phân công trong tuần này.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Công việc</th>
                  <th className="py-3 px-4 font-bold">Người làm</th>
                  <th className="py-3 px-4 font-bold">Ngày</th>
                  <th className="py-3 px-4 font-bold">Trạng thái</th>
                  <th className="py-3 px-4 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map((task) => {
                  const isDone = task.status === 'completed'
                  const isDayToday = isToday(task.task_date)
                  const canToggle = isAdmin || task.assigned_to === currentUserId
                  const isUserAssignee = task.assigned_to === currentUserId
                  const isLoading = togglingId === task.id

                  return (
                    <tr 
                      key={task.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        isDayToday && !isDone ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Title & note */}
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                            {task.assignee?.avatar_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={task.assignee.avatar_url} alt={task.assignee.full_name || 'Avatar'} className="w-full h-full object-cover" />
                            ) : (
                              (task.assignee?.full_name?.charAt(0) || 'U').toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {task.assignee?.full_name || task.assignee?.email?.split('@')[0] || 'Chưa rõ'}
                            </span>
                            {isUserAssignee && (
                              <span className="ml-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Day */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {formatFullDayVietnamese(task.task_date)}
                          </div>
                          {isDayToday && (
                            <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded-full">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Chưa làm
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canToggle ? (
                          <Button
                            size="sm"
                            variant={isDone ? "outline" : "default"}
                            disabled={isLoading}
                            onClick={() => onToggleStatus(task.id)}
                            className={`rounded-xl text-xs h-8 px-3 cursor-pointer ${
                              isDone
                                ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                            }`}
                          >
                            {isLoading ? (
                              'Đang lưu...'
                            ) : isDone ? (
                              'Hoàn tác'
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" /> Đã xong
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Chỉ {task.assignee?.full_name?.split(' ').pop() || 'người nhận'} mới được đổi
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Task Cards */}
          <div className="md:hidden space-y-3">
            {filteredTasks.map((task) => {
              const isDone = task.status === 'completed'
              const isDayToday = isToday(task.task_date)
              const canToggle = isAdmin || task.assigned_to === currentUserId
              const isUserAssignee = task.assigned_to === currentUserId
              const isLoading = togglingId === task.id

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border space-y-3 transition-all ${
                    isDone
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                      : isDayToday
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-sm font-bold break-words ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                          {task.title}
                        </span>
                        {isDayToday && !isDone && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                            Hôm nay
                          </span>
                        )}
                      </div>

                      {task.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Ghi chú: {task.note}
                        </p>
                      )}
                    </div>

                    <div>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Đã xong
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3" /> Chưa làm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assignee & Date info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        {task.assignee?.avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={task.assignee.avatar_url} alt={task.assignee.full_name || 'Avatar'} className="w-full h-full object-cover" />
                        ) : (
                          (task.assignee?.full_name?.charAt(0) || 'U').toUpperCase()
                        )}
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {task.assignee?.full_name || 'Chưa rõ'}
                      </span>
                      {isUserAssignee && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.2 rounded">
                          Bạn
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatFullDayVietnamese(task.task_date)}
                    </div>
                  </div>

                  {/* Action row */}
                  {canToggle && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Button
                        size="sm"
                        variant={isDone ? "outline" : "default"}
                        disabled={isLoading}
                        onClick={() => onToggleStatus(task.id)}
                        className={`rounded-xl text-xs h-8 px-3 w-full sm:w-auto ${
                          isDone
                            ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isLoading ? 'Đang lưu...' : isDone ? 'Hoàn tác chưa làm' : 'Đánh dấu đã hoàn thành'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
