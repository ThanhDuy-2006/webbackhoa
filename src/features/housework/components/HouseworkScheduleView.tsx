'use client'

import { WeekDutySchedule } from '@/types/housework.type'
import { Calendar, User, Sparkles, Clock, CheckCircle2, ArrowRight } from 'lucide-react'

interface HouseworkScheduleViewProps {
  schedules: WeekDutySchedule[]
  currentUserId?: string
}

export function HouseworkScheduleView({ schedules, currentUserId }: HouseworkScheduleViewProps) {
  const currentWeek = schedules.find(s => s.is_current_week) || schedules[0]
  const nextWeek = schedules.find(s => s.is_next_week) || (schedules.length > 1 ? schedules[1] : null)
  const remainingWeeks = schedules.filter(s => !s.is_current_week && !s.is_next_week)

  if (!schedules || schedules.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
        <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Chưa có lịch phân công luân phiên
        </p>
        <p className="text-xs text-slate-400">
          Quản trị viên cần cài đặt danh sách thành viên và ngày bắt đầu trong mục Quản trị.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards: This Week & Next Week */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* THIS WEEK */}
        {currentWeek && (
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-emerald-500/30 dark:border-emerald-600/40 shadow-lg shadow-emerald-500/5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Tuần này ({currentWeek.week_range})
                </span>

                {currentWeek.is_user_duty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    ⭐ Lượt của bạn!
                  </span>
                )}
              </div>

              {/* Assignee Card */}
              <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 overflow-hidden">
                  {currentWeek.assignee?.avatar_url ? (
                    <img 
                      src={currentWeek.assignee.avatar_url} 
                      alt={currentWeek.assignee.full_name || 'Assignee'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (currentWeek.assignee?.full_name?.charAt(0) || currentWeek.assignee?.email?.charAt(0) || 'U').toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Người dọn nhà tuần này
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                    {currentWeek.assignee?.full_name || currentWeek.assignee?.email?.split('@')[0] || 'Chưa thiết lập'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentWeek.assignee?.email || 'Thành viên gia đình'}
                  </p>
                </div>
              </div>

              {/* Duty Time */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Thời gian thực hiện:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl text-center border border-emerald-200/50 dark:border-emerald-800/40">
                    <span className="text-[10px] text-slate-400 block font-sans">Thứ Bảy</span>
                    <span className="text-emerald-700 dark:text-emerald-300">{currentWeek.saturday_display}</span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl text-center border border-emerald-200/50 dark:border-emerald-800/40">
                    <span className="text-[10px] text-slate-400 block font-sans">Chủ nhật</span>
                    <span className="text-emerald-700 dark:text-emerald-300">{currentWeek.sunday_display}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100/60 dark:border-emerald-900/40 flex items-center justify-between text-xs text-slate-500">
              <span>Nhiệm vụ: Vệ sinh chung cuối tuần</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Đang diễn ra</span>
            </div>
          </div>
        )}

        {/* NEXT WEEK */}
        {nextWeek && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Tuần sau ({nextWeek.week_range})
                </span>

                {nextWeek.is_user_duty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                    Lượt của bạn tuần sau
                  </span>
                )}
              </div>

              {/* Assignee Card */}
              <div className="flex items-center gap-4 bg-slate-50/80 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  {nextWeek.assignee?.avatar_url ? (
                    <img 
                      src={nextWeek.assignee.avatar_url} 
                      alt={nextWeek.assignee.full_name || 'Assignee'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (nextWeek.assignee?.full_name?.charAt(0) || nextWeek.assignee?.email?.charAt(0) || 'U').toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Người dọn nhà tuần sau
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                    {nextWeek.assignee?.full_name || nextWeek.assignee?.email?.split('@')[0] || 'Chưa thiết lập'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {nextWeek.assignee?.email || 'Thành viên gia đình'}
                  </p>
                </div>
              </div>

              {/* Duty Time */}
              <div className="bg-slate-50/60 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Thời gian thực hiện:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl text-center border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Thứ Bảy</span>
                    <span>{nextWeek.saturday_display}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl text-center border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Chủ nhật</span>
                    <span>{nextWeek.sunday_display}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Chuẩn bị tinh thần tiếp nối nhé</span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">Kế tiếp</span>
            </div>
          </div>
        )}
      </div>

      {/* UPCOMING WEEKS LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Danh sách các tuần tiếp theo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Lịch luân phiên tự động xoay vòng cho các tuần sắp tới
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
            {schedules.length} tuần
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-5 font-bold">Tuần</th>
                <th className="py-3.5 px-5 font-bold">Người dọn nhà</th>
                <th className="py-3.5 px-5 font-bold">Thứ Bảy</th>
                <th className="py-3.5 px-5 font-bold">Chủ nhật</th>
                <th className="py-3.5 px-5 text-right font-bold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schedules.map((schedule, idx) => {
                const isUser = schedule.is_user_duty

                return (
                  <tr 
                    key={schedule.week_start}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                      schedule.is_current_week 
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 font-medium' 
                        : isUser 
                          ? 'bg-amber-50/20 dark:bg-amber-950/10' 
                          : ''
                    }`}
                  >
                    {/* Week range */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {schedule.week_range}
                        </span>
                        {schedule.is_current_week && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Tuần này
                          </span>
                        )}
                        {schedule.is_next_week && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Tuần sau
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Member */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {schedule.assignee?.avatar_url ? (
                            <img 
                              src={schedule.assignee.avatar_url} 
                              alt={schedule.assignee.full_name || 'User'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (schedule.assignee?.full_name?.charAt(0) || schedule.assignee?.email?.charAt(0) || 'U').toUpperCase()
                          )}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {schedule.assignee?.full_name || schedule.assignee?.email?.split('@')[0] || 'Chưa thiết lập'}
                        </span>
                        {isUser && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            Bạn
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Saturday */}
                    <td className="py-3.5 px-5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      {schedule.saturday_display}
                    </td>

                    {/* Sunday */}
                    <td className="py-3.5 px-5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      {schedule.sunday_display}
                    </td>

                    {/* Note / Tag */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      {schedule.is_current_week ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          Đang trực nhật
                        </span>
                      ) : schedule.is_next_week ? (
                        <span className="text-slate-500 font-medium text-xs">
                          Kế tiếp
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {`Tuần +${idx}`}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
