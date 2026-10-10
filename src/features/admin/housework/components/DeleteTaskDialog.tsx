'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HouseworkTask } from '@/types/housework.type'
import { AlertTriangle } from 'lucide-react'

interface DeleteTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: HouseworkTask | null
  onConfirm: () => Promise<void>
  loading: boolean
}

export function DeleteTaskDialog({
  open,
  onOpenChange,
  task,
  onConfirm,
  loading
}: DeleteTaskDialogProps) {
  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Xóa công việc dọn nhà
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Thao tác này sẽ xóa công việc khỏi danh sách tuần
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Bạn có chắc chắn muốn xóa công việc <strong className="text-slate-900 dark:text-white">&ldquo;{task.title}&rdquo;</strong> được giao cho <strong className="text-emerald-600">{task.assignee?.full_name || 'thành viên'}</strong>?
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl text-xs font-semibold"
          >
            {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
