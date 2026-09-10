'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitWithdrawalRequestAction } from '@/actions/user/withdrawal.actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Landmark, ShieldCheck, ArrowRight, Wallet, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'

const POPULAR_BANKS = [
  'MB Bank (Quân Đội)',
  'Vietcombank (Ngoại Thương)',
  'Techcombank (Kỹ Thương)',
  'ACB (Á Châu)',
  'VPBank (Việt Nam Thịnh Vượng)',
  'TPBank (Tiên Phong)',
  'BIDV (Đầu Tư & Phát Triển)',
  'VietinBank (Công Thương)',
  'Agribank (Nông Nghiệp)',
  'Sacombank (Sài Gòn Thương Tín)',
  'VIB (Quốc Tế)',
  'OCB (Phương Đông)',
  'MSB (Hàng Hải)',
  'HDBank (Phát Triển TP.HCM)',
  'SHB (Sài Gòn - Hà Nội)',
  'Khác (Tự nhập tay)'
]

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000]

interface UserWithdrawalFormProps {
  balance: number
}

export function UserWithdrawalForm({ balance }: UserWithdrawalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [selectedBank, setSelectedBank] = useState<string>(POPULAR_BANKS[0])
  const [customBank, setCustomBank] = useState<string>('')
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [accountName, setAccountName] = useState<string>('')

  const effectiveBankName = selectedBank === 'Khác (Tự nhập tay)' ? customBank : selectedBank

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (balance <= 0) {
      toast.error('Số dư ví của bạn hiện tại là 0đ, không thể tạo yêu cầu rút.')
      return
    }

    if (amount <= 0) {
      toast.error('Vui lòng nhập số tiền rút hợp lệ (lớn hơn 0đ)')
      return
    }

    if (amount > balance) {
      toast.error(`Số tiền rút vượt quá số dư khả dụng (${formatCurrency(balance)})`)
      return
    }

    setLoading(true)
    try {
      const res = await submitWithdrawalRequestAction({
        amount,
        bank_name: effectiveBankName.trim() || 'Chưa cung cấp',
        account_number: accountNumber.trim() || 'Chưa cung cấp',
        account_name: accountName.trim() ? accountName.trim().toUpperCase() : 'Chưa cung cấp'
      })

      if (res.success) {
        toast.success('Gửi yêu cầu rút tiền thành công! Admin sẽ duyệt và chuyển khoản sớm nhất.')
        setAmount(0)
        setAccountNumber('')
        setAccountName('')
        router.refresh()
      } else {
        toast.error(res.error || 'Có lỗi xảy ra khi gửi yêu cầu')
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Form: 7 cols */}
      <div className="lg:col-span-7 space-y-6">
        {/* Balance Highlight Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Số dư ví khả dụng</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {formatCurrency(balance)}
              </h3>
            </div>
          </div>
          {balance > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount(balance)}
              className="text-xs font-bold text-emerald-600 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl"
            >
              Rút tất cả
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ngân hàng */}
          <div className="space-y-2">
            <Label htmlFor="bankSelect" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
              Ngân hàng thụ hưởng <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </Label>
            <select
              id="bankSelect"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {POPULAR_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {selectedBank === 'Khác (Tự nhập tay)' && (
            <div className="space-y-2">
              <Label htmlFor="customBank" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                Nhập tên ngân hàng <span className="text-slate-400 font-normal">(Tùy chọn)</span>
              </Label>
              <Input
                id="customBank"
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                placeholder="VD: Shinhan Bank, Woori Bank..."
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          )}

          {/* Số tài khoản */}
          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
              Số tài khoản ngân hàng <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              placeholder="VD: 0123456789 (Nhập hay không cũng được)"
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-sm tracking-wider"
            />
          </div>

          {/* Tên chủ tài khoản */}
          <div className="space-y-2">
            <Label htmlFor="accountName" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
              Tên chủ tài khoản <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
              placeholder="VD: NGUYEN VAN A (Nhập hay không cũng được)"
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl uppercase font-bold text-sm tracking-wide"
            />
          </div>

          {/* Số tiền rút */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                Số tiền muốn rút (VNĐ) *
              </Label>
              <span className="text-[11px] text-slate-400">
                Tối đa: <strong className="font-mono text-emerald-600">{formatCurrency(balance)}</strong>
              </span>
            </div>
            <Input
              id="amount"
              type="text"
              value={amount > 0 ? amount.toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const val = Number(e.target.value.replace(/\D/g, ''))
                setAmount(val)
              }}
              placeholder="Nhập số tiền (VD: 500,000)"
              required
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-base font-bold text-emerald-600"
            />

            {/* Quick Amount Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border ${
                    amount === amt
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || balance <= 0 || amount <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition-all mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi yêu cầu rút tiền...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" /> Gửi yêu cầu rút tiền
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Right Details / Security Assurance: 5 cols */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Landmark className="w-5 h-5" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Quy trình xử lý rút tiền</h4>
          </div>

          <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <span>
                <strong>Tạm khóa số dư:</strong> Ngay khi bạn gửi yêu cầu, số tiền tương ứng sẽ được tạm trừ khỏi ví khả dụng để đảm bảo giao dịch.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <span>
                <strong>Admin xác nhận:</strong> Ban quản trị sẽ kiểm tra thông tin và thực hiện chuyển khoản vào tài khoản ngân hàng của bạn trong vòng 1-24 giờ.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <span>
                <strong>Bảo toàn số dư:</strong> Nếu thông tin tài khoản sai hoặc bị từ chối, số tiền sẽ được <strong>hoàn trả 100%</strong> về lại ví của bạn ngay lập tức.
              </span>
            </li>
          </ul>
        </div>

        {/* Security badge box */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Bảo mật giao dịch</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Mọi yêu cầu rút tiền đều được mã hóa và lưu trữ trong hệ thống sổ cái an toàn. Hãy đảm bảo thông tin số tài khoản và tên ngân hàng chính xác tuyệt đối.
          </p>
        </div>
      </div>
    </div>
  )
}
