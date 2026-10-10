'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { HouseworkRotationConfig, HouseworkRotationMember, WeekDutySchedule } from '@/types/housework.type'
import { saveHouseworkRotationConfigAction } from '@/actions/housework.actions'
import { 
  getMondayOfWeek, 
  getSundayOfWeek, 
  getSaturdayOfWeek, 
  shiftWeekMonday, 
  formatDayMonthYear, 
  getRotationAssigneeForWeek,
  getVietnamTodayString
} from '@/lib/housework-date'
import { 
  Users, 
  Calendar, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Sparkles, 
  Save, 
  RotateCcw,
  CheckCircle2,
  Clock,
  Database,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const SQL_SETUP_CODE = `-- 1. BẢNG CẤU HÌNH LUÂN PHIÊN (housework_rotation_config)
CREATE TABLE IF NOT EXISTS public.housework_rotation_config (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  start_date DATE NOT NULL DEFAULT '2026-10-12',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.housework_rotation_config (id, start_date)
VALUES ('default', '2026-10-12')
ON CONFLICT (id) DO NOTHING;

-- 2. BẢNG THÀNH VIÊN VÀ THỨ TỰ LUÂN PHIÊN (housework_rotation_members)
CREATE TABLE IF NOT EXISTS public.housework_rotation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_rotation_user UNIQUE (user_id),
  CONSTRAINT uq_rotation_order UNIQUE (order_index)
);

CREATE INDEX IF NOT EXISTS idx_rotation_members_order ON public.housework_rotation_members(order_index ASC);

-- 3. BẢNG LƯU TRẠNG THÁI ĐÃ XEM POPUP THEO TUẦN (housework_popup_acknowledgments)
CREATE TABLE IF NOT EXISTS public.housework_popup_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_popup_ack UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_popup_ack_lookup ON public.housework_popup_acknowledgments(user_id, week_start);

-- 4. BẢO MẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.housework_rotation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housework_rotation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housework_popup_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Config RLS
DROP POLICY IF EXISTS "Authenticated users view rotation config" ON public.housework_rotation_config;
DROP POLICY IF EXISTS "Admins manage rotation config" ON public.housework_rotation_config;

CREATE POLICY "Authenticated users view rotation config"
  ON public.housework_rotation_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage rotation config"
  ON public.housework_rotation_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Members RLS
DROP POLICY IF EXISTS "Authenticated users view rotation members" ON public.housework_rotation_members;
DROP POLICY IF EXISTS "Admins manage rotation members" ON public.housework_rotation_members;

CREATE POLICY "Authenticated users view rotation members"
  ON public.housework_rotation_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage rotation members"
  ON public.housework_rotation_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Popup Acknowledgments RLS
DROP POLICY IF EXISTS "Users can view own popup acknowledgments" ON public.housework_popup_acknowledgments;
DROP POLICY IF EXISTS "Users can acknowledge own popup" ON public.housework_popup_acknowledgments;
DROP POLICY IF EXISTS "Admins can view all popup acknowledgments" ON public.housework_popup_acknowledgments;

CREATE POLICY "Users can view own popup acknowledgments"
  ON public.housework_popup_acknowledgments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge own popup"
  ON public.housework_popup_acknowledgments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all popup acknowledgments"
  ON public.housework_popup_acknowledgments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. LÀM MỚI SCHEMA CACHE POSTGREST
NOTIFY pgrst, 'reload schema';`

interface AdminRotationManagerProps {
  users: Array<{
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }>
  initialConfig: HouseworkRotationConfig
  initialMembers: HouseworkRotationMember[]
}

export function AdminRotationManager({
  users,
  initialConfig,
  initialMembers
}: AdminRotationManagerProps) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(initialConfig.start_date || '2026-10-12')
  
  // List of selected user IDs in order
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    initialMembers.map(m => m.user_id)
  )
  const [newMemberId, setNewMemberId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [isSqlDialogOpen, setIsSqlDialogOpen] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_CODE)
    setCopiedSql(true)
    toast.success('Đã sao chép mã SQL vào clipboard! Hãy dán vào Supabase SQL Editor.')
    setTimeout(() => setCopiedSql(false), 2500)
  }

  // Quick map of users by id
  const userMap = useMemo(() => {
    const map = new Map<string, (typeof users)[0]>()
    users.forEach(u => map.set(u.id, u))
    return map
  }, [users])

  // Available users not in rotation list yet
  const availableUsers = useMemo(() => {
    return users.filter(u => !selectedUserIds.includes(u.id))
  }, [users, selectedUserIds])

  // Move member up in order
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...selectedUserIds]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    setSelectedUserIds(updated)
  }

  // Move member down in order
  const handleMoveDown = (index: number) => {
    if (index === selectedUserIds.length - 1) return
    const updated = [...selectedUserIds]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    setSelectedUserIds(updated)
  }

  // Remove member from rotation
  const handleRemove = (userId: string) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId))
  }

  // Add selected member
  const handleAddMember = () => {
    if (!newMemberId) return
    if (selectedUserIds.includes(newMemberId)) {
      toast.error('Thành viên này đã có trong danh sách luân phiên')
      return
    }
    setSelectedUserIds(prev => [...prev, newMemberId])
    setNewMemberId('')
  }

  // Save to DB
  const handleSave = async () => {
    if (!startDate) {
      toast.error('Vui lòng chọn ngày bắt đầu áp dụng lịch')
      return
    }
    if (selectedUserIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thành viên tham gia luân phiên')
      return
    }

    setSaving(true)
    try {
      const res = await saveHouseworkRotationConfigAction(startDate, selectedUserIds)
      if (res.success) {
        toast.success('Đã lưu cấu hình phân công luân phiên thành công! 🎉')
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi khi lưu cấu hình')
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi lưu')
    } finally {
      setSaving(false)
    }
  }

  // Compute live preview schedule for 8 weeks
  const previewSchedules = useMemo(() => {
    if (selectedUserIds.length === 0) return []

    const memberObjects = selectedUserIds.map((id, idx) => ({
      user_id: id,
      order_index: idx + 1,
      profile: userMap.get(id) || null
    }))

    const currentWeekMonday = getMondayOfWeek(getVietnamTodayString())
    const schedules: WeekDutySchedule[] = []

    for (let i = 0; i < 8; i++) {
      const targetMonday = shiftWeekMonday(currentWeekMonday, i)
      const targetSunday = getSundayOfWeek(targetMonday)
      const saturday = getSaturdayOfWeek(targetMonday)

      const { assignee } = getRotationAssigneeForWeek(
        targetMonday,
        startDate,
        memberObjects
      )

      schedules.push({
        week_start: targetMonday,
        week_end: targetSunday,
        week_range: `${formatDayMonthYear(targetMonday)} – ${formatDayMonthYear(targetSunday)}`,
        saturday_date: saturday,
        saturday_display: formatDayMonthYear(saturday),
        sunday_date: targetSunday,
        sunday_display: formatDayMonthYear(targetSunday),
        assignee: assignee?.profile || null,
        is_current_week: i === 0,
        is_next_week: i === 1,
        is_user_duty: false
      })
    }

    return schedules
  }, [selectedUserIds, startDate, userMap])

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Thiết lập Luân phiên dọn nhà theo tuần
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tự động phân công dọn nhà vào Thứ Bảy & Chủ nhật hàng tuần theo vòng tròn, không cần tạo thủ công mỗi tuần.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSqlDialogOpen(true)}
              className="rounded-2xl border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 text-xs font-semibold h-10 px-3.5 cursor-pointer hover:bg-emerald-100"
            >
              <Database className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              SQL tạo bảng Supabase
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving || selectedUserIds.length === 0}
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 shadow-xs cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Đang lưu...' : 'Lưu cấu hình luân phiên'}
            </Button>
          </div>
        </div>

        {/* Start Date & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <Label htmlFor="start-date-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Ngày bắt đầu áp dụng lịch luân phiên:
            </Label>
            <Input
              id="start-date-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl h-10 text-xs bg-white dark:bg-slate-900 font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Mốc tính tuần 1. Tuần chứa ngày này sẽ bắt đầu với thành viên số 1 trong danh sách.
            </p>
          </div>

          <div className="space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              Cơ chế luân phiên tự động:
            </div>
            <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
              <li>Mỗi tuần 1 người phụ trách dọn nhà vào <strong>thứ Bảy và Chủ nhật</strong>.</li>
              <li>Hết tuần tự động chuyển lượt sang người tiếp theo theo thứ tự sắp xếp bên dưới.</li>
              <li>Sau người cuối cùng trong danh sách, hệ thống tự động quay lại người đầu tiên.</li>
            </ul>
          </div>
        </div>

        {/* Members Management */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thứ tự thành viên luân phiên ({selectedUserIds.length})
              </h3>
            </div>

            {/* Add member selector */}
            {availableUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Chọn thành viên để thêm --</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>

                <Button
                  size="sm"
                  type="button"
                  disabled={!newMemberId}
                  onClick={handleAddMember}
                  className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm
                </Button>
              </div>
            )}
          </div>

          {/* Members List with Up / Down order buttons */}
          {selectedUserIds.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-500">
                Chưa có thành viên nào trong danh sách luân phiên.
              </p>
              <p className="text-[11px] text-slate-400">
                Vui lòng chọn thành viên từ danh sách tài khoản phía trên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedUserIds.map((userId, index) => {
                const user = userMap.get(userId)
                const isFirst = index === 0
                const isLast = index === selectedUserIds.length - 1

                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 sm:px-4 rounded-2xl border border-slate-200/60 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name || 'User'} className="w-full h-full object-cover" />
                        ) : (
                          (user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {user?.full_name || user?.email?.split('@')[0] || 'Người dùng'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {user?.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isFirst}
                        onClick={() => handleMoveUp(index)}
                        className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                        title="Di chuyển lên trên"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isLast}
                        onClick={() => handleMoveDown(index)}
                        className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                        title="Di chuyển xuống dưới"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemove(userId)}
                        className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                        title="Xóa khỏi danh sách luân phiên"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Live Preview of Rotation Schedule */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Xem trước Lịch luân phiên 8 tuần tới
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kết quả luân phiên tự động tính toán dựa trên cấu hình bên trên
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-xl">
            Tự động theo ngày
          </span>
        </div>

        {previewSchedules.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Thêm thành viên để xem trước lịch phân công luân phiên.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Tuần</th>
                  <th className="py-3 px-4 font-bold">Người dọn nhà</th>
                  <th className="py-3 px-4 font-bold">Thứ Bảy</th>
                  <th className="py-3 px-4 font-bold">Chủ nhật</th>
                  <th className="py-3 px-4 text-right font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewSchedules.map((item, idx) => (
                  <tr 
                    key={item.week_start}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                      item.is_current_week ? 'bg-emerald-50/30 dark:bg-emerald-950/20 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.week_range}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {item.assignee?.avatar_url ? (
                            <img src={item.assignee.avatar_url} alt={item.assignee.full_name || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            (item.assignee?.full_name?.charAt(0) || 'U').toUpperCase()
                          )}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.assignee?.full_name || item.assignee?.email?.split('@')[0] || 'Chưa thiết lập'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      {item.saturday_display}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      {item.sunday_display}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {item.is_current_week ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Tuần này
                        </span>
                      ) : item.is_next_week ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Tuần sau
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          {`Tuần +${idx}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SQL Setup Dialog */}
      <Dialog open={isSqlDialogOpen} onOpenChange={setIsSqlDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <Database className="w-5 h-5" />
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Khởi tạo bảng phân công luân phiên trên Supabase
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Nếu gặp thông báo lỗi <code className="text-rose-600 font-mono">Could not find the table ... in the schema cache</code>, vui lòng copy toàn bộ đoạn mã SQL bên dưới và chạy tại mục <strong>SQL Editor</strong> trong trang quản trị Supabase.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 border border-slate-800 leading-relaxed">
              <code>{SQL_SETUP_CODE}</code>
            </pre>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">Chỉ cần chạy 1 lần duy nhất</span>
            <Button
              onClick={handleCopySql}
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-200" /> Đã sao chép!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" /> Sao chép toàn bộ SQL
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
