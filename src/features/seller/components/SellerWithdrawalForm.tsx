'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Send, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SellerWithdrawal } from '@/types/order.type'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { requestWithdrawalAction } from '@/actions/seller-ledger.actions'

interface SellerWithdrawalFormProps {
  availableBalance: number
  withdrawals: SellerWithdrawal[]
}

export function SellerWithdrawalForm({ availableBalance, withdrawals }: SellerWithdrawalFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Vui lòng nhập số tiền rút hợp lệ')
      return
    }

    if (numAmount > availableBalance) {
      toast.error(`Số dư khả dụng không đủ. Bạn chỉ có thể rút tối đa ${formatCurrency(availableBalance)}`)
      return
    }

    if (!bankName || !accountNumber || !accountName) {
      toast.error('Vui lòng nhập đầy đủ thông tin ngân hàng nhận tiền')
      return
    }

    setSubmitting(true)
    try {
      const res = await requestWithdrawalAction({
        amount: numAmount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName
      })

      if (res.success) {
        toast.success('Đã gửi yêu cầu rút tiền thành công!')
        setAmount('')
        router.refresh()
      } else {
        toast.error(res.error || 'Lỗi khi gửi yêu cầu rút tiền')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <Link href="/tai-khoan/doanh-thu">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rút tiền về ngân hàng</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Số dư khả dụng: <strong className="text-emerald-600 font-bold text-sm">{formatCurrency(availableBalance)}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmitWithdrawal} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" /> Nhập thông tin rút tiền
          </h2>

          <div className="space-y-2">
            <Label htmlFor="amount" className="font-semibold text-slate-700">Số tiền muốn rút (VNĐ) *</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="VD: 500000"
              className="rounded-xl font-mono text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName" className="font-semibold text-slate-700">Tên ngân hàng *</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="VD: Vietcombank, Techcombank, MBBank..."
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="font-semibold text-slate-700">Số tài khoản ngân hàng *</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="VD: 10123456789"
              className="rounded-xl font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName" className="font-semibold text-slate-700">Tên chủ tài khoản (Viết hoa không dấu) *</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="VD: NGUYEN VAN A"
              className="rounded-xl uppercase font-semibold"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || availableBalance <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold py-3 shadow-md shadow-emerald-600/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi yêu cầu...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Gửi yêu cầu rút tiền
              </>
            )}
          </Button>
        </form>

        {/* Withdrawal History */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Lịch sử rút tiền gần nhất</h2>

          {withdrawals.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">Chưa có lịch sử rút tiền nào</div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-xs bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(w.amount)}</span>
                    {w.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center font-semibold text-[11px]">
                        <Clock className="w-3 h-3 mr-1" /> Chờ duyệt
                      </span>
                    )}
                    {w.status === 'approved' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center font-semibold text-[11px]">
                        <CheckCircle className="w-3 h-3 mr-1" /> Đã chuyển tiền
                      </span>
                    )}
                    {w.status === 'rejected' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center font-semibold text-[11px]">
                        <XCircle className="w-3 h-3 mr-1" /> Từ chối
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600">{w.bank_name} • {w.account_number} ({w.account_name})</div>
                  <div className="text-slate-400 text-[11px]">{new Date(w.created_at).toLocaleString('vi-VN')}</div>
                  {w.rejection_reason && <p className="text-rose-600 text-[11px] bg-rose-50 p-1.5 rounded-md">Lý do từ chối: {w.rejection_reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
