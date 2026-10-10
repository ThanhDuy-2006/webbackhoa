'use client'

import { HouseworkTask } from '@/types/housework.type'
import { formatFullDayVietnamese, isToday } from '@/lib/housework-date'
import { Check, CheckCircle2, Clock, Calendar, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface MyTasksSectionProps {
  tasks: HouseworkTask[]
  currentUserId: string
  onToggleStatus: (taskId: string) => Promise<void>
  togglingId: string | null
}

export function MyTasksSection({
  tasks,
  currentUserId,
  onToggleStatus,
  togglingId
}: MyTasksSectionProps) {
  const myTasks = tasks.filter(t => t.assigned_to === currentUserId)
  const total = myTasks.length
  const completed = myTasks.filter(t => t.status === 'completed').length
  const pending = total - completed

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200 dark:shadow-none">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Việc của tôi tuần này
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhiệm vụ dọn dẹp được phân công cho bạn
            </p>
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              Tổng: <strong className="text-slate-900 dark:text-slate-100">{total}</strong>
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-100 dark:border-emerald-900/40">
              Đã xong: <strong>{completed}</strong>
            </span>
            {pending > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-semibold border border-amber-100 dark:border-amber-900/40">
                Còn lại: <strong>{pending}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Task List or Empty State */}
      {myTasks.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Bạn không có nhiệm vụ dọn nhà nào trong tuần này!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Hãy tận hưởng thời gian rảnh hoặc hỗ trợ các thành viên khác trong gia đình nhé.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {myTasks.map((task) => {
              const isTaskDone = task.status === 'completed'
              const isTaskToday = isToday(task.task_date)
              const isLoading = togglingId === task.id

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isTaskDone
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                      : isTaskToday
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Custom Checkbox Button */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(task.id)}
                      disabled={isLoading}
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isTaskDone
                          ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-slate-800'
                      }`}
                      title={isTaskDone ? 'Bấm để hoàn tác chưa làm' : 'Bấm để đánh dấu hoàn thành'}
                    >
                      {isTaskDone && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold ${
                          isTaskDone 
                            ? 'line-through text-slate-400 dark:text-slate-500' 
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {task.title}
                        </span>

                        {isTaskToday && !isTaskDone && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Hôm nay
                          </span>
                        )}

                        {isTaskDone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                            <Clock className="w-3 h-3" /> Chưa làm
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatFullDayVietnamese(task.task_date)}
                        </span>
                        {task.note && (
                          <span className="text-slate-600 dark:text-slate-300 italic">
                            • Ghi chú: &ldquo;{task.note}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="self-end sm:self-center shrink-0">
                    <Button
                      size="sm"
                      variant={isTaskDone ? "outline" : "default"}
                      disabled={isLoading}
                      onClick={() => onToggleStatus(task.id)}
                      className={`rounded-xl text-xs font-semibold h-8 px-3 cursor-pointer transition-all ${
                        isTaskDone
                          ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      }`}
                    >
                      {isLoading ? (
                        'Đang lưu...'
                      ) : isTaskDone ? (
                        'Hoàn tác chưa làm'
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" /> Đã xong
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
