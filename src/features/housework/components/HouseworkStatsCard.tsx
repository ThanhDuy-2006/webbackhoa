'use client'

import { CheckCircle2, Clock, Sparkles, TrendingUp, Users } from 'lucide-react'
import { HouseworkWeekSummary } from '@/types/housework.type'
import { motion } from 'framer-motion'

interface HouseworkStatsCardProps {
  summary: HouseworkWeekSummary
}

export function HouseworkStatsCard({ summary }: HouseworkStatsCardProps) {
  const { total_tasks, completed_tasks, pending_tasks, completion_rate, member_stats } = summary

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Top Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Tiến độ cả nhà tuần này
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đã hoàn thành {completed_tasks} trên tổng số {total_tasks} công việc gia đình
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              {completion_rate}%
            </span>
          </div>
          {completion_rate === 100 && total_tasks > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Xuất sắc!
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${completion_rate}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-sm"
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-medium px-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng việc</div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
            {total_tasks}
          </div>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã xong
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 font-mono">
            {completed_tasks}
          </div>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 text-center">
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Chưa làm
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5 font-mono">
            {pending_tasks}
          </div>
        </div>
      </div>

      {/* Member breakdown avatars & mini badges */}
      {member_stats.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Tiến độ từng thành viên:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {member_stats.map((m) => (
              <div 
                key={m.user_id}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs transition-colors"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {m.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                  ) : (
                    m.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{m.full_name}</span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {m.completed}/{m.total}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  m.rate === 100 
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                    : m.rate > 0 
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {m.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
