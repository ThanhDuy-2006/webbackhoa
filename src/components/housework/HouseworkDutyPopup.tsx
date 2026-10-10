'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { checkHouseworkDutyPopupAction, acknowledgeHouseworkDutyAction } from '@/actions/housework.actions'
import { PopupCheckResult } from '@/types/housework.type'
import { Sparkles, Calendar, Check } from 'lucide-react'

export function HouseworkDutyPopup() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<PopupCheckResult | null>(null)
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function checkDuty() {
      try {
        const res = await checkHouseworkDutyPopupAction()
        if (isMounted && res.success && res.data?.should_show) {
          setData(res.data)
          setOpen(true)
        }
      } catch (err) {
        // silent fail
      }
    }

    checkDuty()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAcknowledge = async () => {
    if (!data?.week_start) {
      setOpen(false)
      return
    }

    setIsAcknowledging(true)
    try {
      await acknowledgeHouseworkDutyAction(data.week_start)
    } finally {
      setIsAcknowledging(false)
      setOpen(false)
    }
  }

  if (!data) return null

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleAcknowledge()
        } else {
          setOpen(true)
        }
      }}
    >
      <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/50 p-6 sm:p-7 shadow-2xl shadow-emerald-900/10">
        <DialogHeader className="text-center sm:text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
              Thông báo gia đình
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
              DỌN NHÀ TUẦN NÀY
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Bạn được phân công dọn nhà tuần này!
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Người thực hiện:</span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-lg">
              {data.member_name}
            </span>
          </div>

          <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3 space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Thời gian:</span>
            </div>
            <ul className="text-xs font-bold text-slate-800 dark:text-slate-200 pl-4 space-y-1 list-disc list-inside">
              <li>Thứ Bảy: <span className="font-mono text-emerald-600 dark:text-emerald-400">{data.saturday_display}</span></li>
              <li>Chủ nhật: <span className="font-mono text-emerald-600 dark:text-emerald-400">{data.sunday_display}</span></li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
            Nhớ dọn nhà đúng lịch nhé!
          </p>
        </div>

        <div className="mt-5">
          <Button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {isAcknowledging ? 'Đang lưu...' : 'Đã hiểu'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
