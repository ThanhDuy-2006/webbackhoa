'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HouseworkTask, CreateHouseworkTaskInput, UpdateHouseworkTaskInput } from '@/types/housework.type'
import { getWeekDays, WeekDayInfo } from '@/lib/housework-date'
import { toast } from 'sonner'
import { createHouseworkTaskAction, updateHouseworkTaskAction } from '@/actions/housework.actions'

interface UserOption {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

interface HouseworkTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: HouseworkTask | null // If present, edit mode; otherwise, create mode
  weekStart: string
  users: UserOption[]
  onSuccess: () => void
}

export function HouseworkTaskDialog({
  open,
  onOpenChange,
  task,
  weekStart,
  users,
  onSuccess
}: HouseworkTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const weekDays: WeekDayInfo[] = getWeekDays(weekStart)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setAssignedTo(task.assigned_to)
      setTaskDate(task.task_date)
      setNote(task.note || '')
    } else {
      setTitle('')
      setAssignedTo(users[0]?.id || '')
      setTaskDate(weekDays[0]?.dateStr || '')
      setNote('')
    }
  }, [task, open, weekStart, users])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên công việc')
      return
    }
    if (!assignedTo) {
      toast.error('Vui lòng chọn người thực hiện')
      return
    }
    if (!taskDate) {
      toast.error('Vui lòng chọn ngày thực hiện')
      return
    }

    setLoading(true)
    try {
      if (task) {
        // Edit mode
        const input: UpdateHouseworkTaskInput = {
          title: title.trim(),
          assigned_to: assignedTo,
          task_date: taskDate,
          note: note.trim() || null
        }
        const res = await updateHouseworkTaskAction(task.id, input)
        if (res.success) {
          toast.success('Đã cập nhật công việc thành công!')
          onOpenChange(false)
          onSuccess()
        } else {
          toast.error(res.error || 'Lỗi khi cập nhật công việc')
        }
      } else {
        // Create mode
        const input: CreateHouseworkTaskInput = {
          title: title.trim(),
          assigned_to: assignedTo,
          task_date: taskDate,
          week_start: weekStart,
          note: note.trim() || null
        }
        const res = await createHouseworkTaskAction(input)
        if (res.success) {
          toast.success('Đã thêm công việc mới thành công!')
          onOpenChange(false)
          onSuccess()
        } else {
          toast.error(res.error || 'Lỗi khi tạo công việc')
        }
      }
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi lưu công việc')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
            {task ? 'Chỉnh sửa công việc dọn nhà' : 'Thêm công việc dọn nhà mới'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {task ? 'Cập nhật nội dung, người làm hoặc ngày thực hiện' : 'Phân công nhiệm vụ cho thành viên trong gia đình'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tên công việc */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tên công việc <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Quét nhà, Lau sàn, Đổ rác, Cọ toilet..."
              className="rounded-xl border-slate-200 dark:border-slate-800 text-sm"
              required
            />
          </div>

          {/* Người thực hiện */}
          <div className="space-y-1.5">
            <Label htmlFor="task-assignee" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Người thực hiện <span className="text-rose-500">*</span>
            </Label>
            <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val || '')}>
              <SelectTrigger id="task-assignee" className="rounded-xl border-slate-200 dark:border-slate-800 w-full text-xs">
                <SelectValue placeholder="Chọn thành viên gia đình..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs cursor-pointer">
                    {u.full_name || u.email || 'Người dùng'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ngày thực hiện */}
          <div className="space-y-1.5">
            <Label htmlFor="task-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ngày thực hiện trong tuần <span className="text-rose-500">*</span>
            </Label>
            <Select value={taskDate} onValueChange={(val) => setTaskDate(val || '')}>
              <SelectTrigger id="task-date" className="rounded-xl border-slate-200 dark:border-slate-800 w-full text-xs font-mono">
                <SelectValue placeholder="Chọn ngày..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                {weekDays.map((day) => (
                  <SelectItem key={day.dateStr} value={day.dateStr} className="text-xs cursor-pointer">
                    {day.dayName} ({day.displayDate}) {day.isToday ? '• Hôm nay' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor="task-note" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ghi chú thêm (không bắt buộc)
            </Label>
            <Textarea
              id="task-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Dọn trước 18h tối, thay túi rác mới..."
              rows={2}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {loading ? 'Đang lưu...' : task ? 'Cập nhật' : 'Tạo công việc'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
