'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Percent, ShieldAlert, Save, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateMarketplaceFeeAction } from '@/actions/admin/marketplace-settings.actions'

interface MarketplaceSettingsClientProps {
  initialFeeBps: number
}

export function MarketplaceSettingsClient({ initialFeeBps }: MarketplaceSettingsClientProps) {
  const router = useRouter()
  // Convert BPS to Percent string (500 BPS = 5%)
  const [feePercent, setFeePercent] = useState<string>((initialFeeBps / 100).toString())
  const [saving, setSaving] = useState(false)

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault()

    const num = parseFloat(feePercent)
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error('Phí sàn phải là một số hợp lệ từ 0% đến 100%')
      return
    }

    const bps = Math.round(num * 100) // 1% = 100 BPS

    setSaving(true)
    try {
      const res = await updateMarketplaceFeeAction(bps)
      if (res.success) {
        toast.success(`Đã cập nhật phí sàn giao dịch C2C thành ${num}% (${bps} BPS)`)
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi khi cập nhật phí sàn')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Percent className="w-5 h-5 text-emerald-600" /> Cấu hình Phí sàn Giao dịch C2C
        </h1>
        <p className="text-sm text-slate-500 mt-1">Điều chỉnh tỷ lệ phí sàn thu từ người bán khi phát sinh đơn hàng C2C</p>
      </div>

      <form onSubmit={handleSaveFee} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
            <Info className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Mô hình Phí sàn Mặc định 0% (Free Marketplace):</p>
              <p>Mặc định phí sàn là <strong>0% (0 Basis Points)</strong>. Người bán nhận trọn vẹn 100% doanh thu sau giảm giá. Việc thay đổi phí sàn tại đây chỉ có hiệu lực với các đơn hàng phát sinh trong tương lai. Tất cả đơn hàng lịch sử giữ nguyên snapshot phí ban đầu.</p>
            </div>
          </div>

          <div className="max-w-md space-y-2">
            <Label htmlFor="feePercent" className="font-semibold text-slate-700">Tỷ lệ Phí sàn (%)</Label>
            <div className="relative">
              <Input
                id="feePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                placeholder="0"
                className="pr-10 rounded-xl font-mono text-base font-bold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
            </div>
            <p className="text-xs text-slate-500">
              Quy đổi nội bộ: <strong>{Math.round((parseFloat(feePercent) || 0) * 100)} Basis Points (BPS)</strong>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Lưu cấu hình phí sàn
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
