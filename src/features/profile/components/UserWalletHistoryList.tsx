'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserWalletTransactionsAction } from '@/actions/user/revenue-share.actions'
import { Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export function UserWalletHistoryList() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  const loadTransactions = async () => {
    setLoading(true)
    const res = await getUserWalletTransactionsAction(filterType)
    if (res.success && res.data) {
      setTransactions(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTransactions()
  }, [filterType])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border">
        <span className="text-xs font-bold text-slate-600">Lọc nguồn giao dịch:</span>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white border p-1.5 rounded-lg text-xs font-medium text-slate-700 outline-none"
        >
          <option value="all">Tất cả nguồn giao dịch</option>
          <option value="topup">Nạp tiền vào ví (Topup)</option>
          <option value="payment">Thanh toán mua hàng (Payment)</option>
          <option value="refund">Hoàn tiền đơn hàng (Refund)</option>
          <option value="revenue_share">Nhận tiền chia sẻ (Revenue Share)</option>
          <option value="revenue_share_reversal">Thu hồi tiền chia sẻ (Reversal)</option>
        </select>
      </div>

      {/* List / Table */}
      <div className="border rounded-2xl bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
            Không có lịch sử biến động số dư nào khớp bộ lọc.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                <th className="p-4 font-bold">Thời gian</th>
                <th className="p-4 font-bold">Loại nguồn</th>
                <th className="p-4 font-bold">Biến động</th>
                <th className="p-4 font-bold">Số dư trước</th>
                <th className="p-4 font-bold">Số dư sau</th>
                <th className="p-4 font-bold">Nội dung chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx) => {
                const date = new Date(tx.created_at).toLocaleString('vi-VN')
                const isCredit = Number(tx.amount) >= 0

                let badgeColor = 'bg-slate-100 text-slate-600'
                let badgeLabel = tx.type

                if (tx.type === 'topup') {
                  badgeColor = 'bg-emerald-50 text-emerald-700'
                  badgeLabel = 'Nạp tiền'
                } else if (tx.type === 'payment') {
                  badgeColor = 'bg-blue-50 text-blue-700'
                  badgeLabel = 'Thanh toán'
                } else if (tx.type === 'refund') {
                  badgeColor = 'bg-indigo-50 text-indigo-700'
                  badgeLabel = 'Hoàn tiền'
                } else if (tx.type === 'revenue_share') {
                  badgeColor = 'bg-teal-50 text-teal-700'
                  badgeLabel = 'Nhận chia sẻ'
                } else if (tx.type === 'revenue_share_reversal') {
                  badgeColor = 'bg-red-50 text-red-700'
                  badgeLabel = 'Thu hồi chia sẻ'
                }

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-slate-400 font-medium">{date}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-0.5">
                        {isCredit ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <strong className={`font-mono font-bold ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isCredit ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
                        </strong>
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-500">{tx.balance_before.toLocaleString('vi-VN')}đ</td>
                    <td className="p-4 font-mono font-bold text-slate-700">{tx.balance_after.toLocaleString('vi-VN')}đ</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate" title={tx.note}>{tx.note || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
