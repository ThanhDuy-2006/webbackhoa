'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HouseworkWeekSummary } from '@/types/housework.type'
import { formatWeekRange } from '@/lib/housework-date'
import { getHouseworkHistoryAction } from '@/actions/housework.actions'
import { History, Calendar, CheckCircle2, Clock, Users, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface HouseworkHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectWeek: (weekStart: string) => void
}

export function HouseworkHistoryDialog({
  open,
  onOpenChange,
  onSelectWeek
}: HouseworkHistoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HouseworkWeekSummary[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)

  const handleOpen = async (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (isOpen && !hasLoaded) {
      setLoading(true)
      try {
        const res = await getHouseworkHistoryAction()
        if (res.success && res.data) {
          setHistory(res.data)
          setHasLoaded(true)
        } else {
          toast.error(res.error || 'Lỗi khi tải lịch sử')
        }
      } catch (err: any) {
        toast.error('Có lỗi xảy ra khi tải lịch sử')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Lịch sử phân công dọn nhà các tuần
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xem lại tỷ lệ hoàn thành công việc của toàn gia đình và từng thành viên
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Đang tải lịch sử các tuần...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có dữ liệu lịch sử các tuần trước.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((week) => (
                <div
                  key={week.week_start}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all space-y-3"
                >
                  {/* Week title & stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                        {formatWeekRange(week.week_start)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Cả nhà:
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        week.completion_rate === 100
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : week.completion_rate >= 50
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {week.completion_rate}% ({week.completed_tasks}/{week.total_tasks} việc)
                      </span>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          onSelectWeek(week.week_start)
                          onOpenChange(false)
                        }}
                        className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg cursor-pointer"
                      >
                        Xem tuần này <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {/* Member stats pills */}
                  {week.member_stats.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {week.member_stats.map((m) => (
                        <div
                          key={m.user_id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[11px]"
                        >
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center">
                            {m.avatar_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                            ) : (
                              m.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{m.full_name}:</span>
                          <span className="font-mono text-slate-500">{m.completed}/{m.total}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">({m.rate}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
