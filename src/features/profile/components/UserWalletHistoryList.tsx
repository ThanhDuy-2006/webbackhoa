'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

import { getUserWalletTransactionsAction } from '@/actions/user/revenue-share.actions'
import { Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function UserWalletHistoryList() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedTx, setSelectedTx] = useState<any | null>(null)

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lọc nguồn giao dịch:</span>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">Tất cả nguồn giao dịch</option>
          <option value="topup">Nạp tiền vào ví (Topup)</option>
          <option value="withdrawal">Rút tiền về ngân hàng (Withdrawal)</option>
          <option value="withdrawal_refund">Hoàn tiền rút về ví (Withdrawal Refund)</option>
          <option value="payment">Thanh toán mua hàng (Payment)</option>
          <option value="refund">Hoàn tiền đơn hàng (Refund)</option>
          <option value="revenue_share">Nhận tiền chia sẻ (Revenue Share)</option>
          <option value="revenue_share_reversal">Thu hồi tiền chia sẻ (Reversal)</option>
        </select>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-1/4 rounded-xl" />
              <Skeleton className="h-10 w-1/4 rounded-xl" />
              <Skeleton className="h-10 w-1/4 rounded-xl" />
              <Skeleton className="h-10 w-1/4 rounded-xl" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs">
          Không có lịch sử biến động số dư nào khớp bộ lọc.
        </div>
      ) : (
        <>
          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {transactions.map((tx) => {
              const date = new Date(tx.created_at).toLocaleString('vi-VN')
              const isCredit = Number(tx.amount) >= 0

              let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              let badgeLabel = tx.type

              if (tx.type === 'topup') {
                badgeColor = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                badgeLabel = 'Nạp tiền'
              } else if (tx.type === 'withdrawal') {
                badgeColor = 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                badgeLabel = 'Rút tiền'
              } else if (tx.type === 'withdrawal_refund') {
                badgeColor = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                badgeLabel = 'Hoàn tiền rút'
              } else if (tx.type === 'payment') {
                badgeColor = 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                badgeLabel = 'Thanh toán'
              } else if (tx.type === 'refund') {
                badgeColor = 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                badgeLabel = 'Hoàn tiền'
              } else if (tx.type === 'revenue_share') {
                badgeColor = 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                badgeLabel = 'Nhận chia sẻ'
              } else if (tx.type === 'revenue_share_reversal') {
                badgeColor = 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                badgeLabel = 'Thu hồi chia sẻ'
              }

              return (
                <div key={`mob-tx-${tx.id}`} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                      {badgeLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{date}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Biến động:</span>
                    <span className="flex items-center gap-1">
                      {isCredit ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <strong className={`font-mono text-sm font-extrabold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {isCredit ? '+' : ''}{formatCurrency(tx.amount)}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400">Số dư sau: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(tx.balance_after)}</strong></span>
                    <button 
                      onClick={() => setSelectedTx(tx)}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3.5 font-bold">Thời gian</th>
                  <th className="p-3.5 font-bold">Loại nguồn</th>
                  <th className="p-3.5 font-bold">Biến động</th>
                  <th className="p-3.5 font-bold">Số dư trước</th>
                  <th className="p-3.5 font-bold">Số dư sau</th>
                  <th className="p-3.5 font-bold">Nội dung chi tiết</th>
                  <th className="p-3.5 font-bold text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transactions.map((tx) => {
                  const date = new Date(tx.created_at).toLocaleString('vi-VN')
                  const isCredit = Number(tx.amount) >= 0

                  let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  let badgeLabel = tx.type

                  if (tx.type === 'topup') {
                    badgeColor = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    badgeLabel = 'Nạp tiền'
                  } else if (tx.type === 'withdrawal') {
                    badgeColor = 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    badgeLabel = 'Rút tiền'
                  } else if (tx.type === 'withdrawal_refund') {
                    badgeColor = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    badgeLabel = 'Hoàn tiền rút'
                  } else if (tx.type === 'payment') {
                    badgeColor = 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    badgeLabel = 'Thanh toán'
                  } else if (tx.type === 'refund') {
                    badgeColor = 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                    badgeLabel = 'Hoàn tiền'
                  } else if (tx.type === 'revenue_share') {
                    badgeColor = 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                    badgeLabel = 'Nhận chia sẻ'
                  } else if (tx.type === 'revenue_share_reversal') {
                    badgeColor = 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                    badgeLabel = 'Thu hồi chia sẻ'
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 font-medium">{date}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="flex items-center gap-0.5">
                          {isCredit ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          )}
                          <strong className={`font-mono font-extrabold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {isCredit ? '+' : ''}{formatCurrency(tx.amount)}
                          </strong>
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{formatCurrency(tx.balance_before)}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(tx.balance_after)}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={tx.note}>{tx.note || '-'}</td>
                      <td className="p-3.5 text-center">
                        <button 
                          onClick={() => setSelectedTx(tx)}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Chi tiết giao dịch sổ cái</h3>
              <button onClick={() => setSelectedTx(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2 border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400">Mã giao dịch:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono text-[10px] sm:text-xs">{selectedTx.id}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400">Thời gian:</span>
                <strong className="text-slate-700 dark:text-slate-300">{new Date(selectedTx.created_at).toLocaleString('vi-VN')}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400">Loại nguồn:</span>
                <strong className="text-slate-700 dark:text-slate-300">{selectedTx.type}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400">Biến động:</span>
                <strong className={`font-mono font-extrabold ${Number(selectedTx.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {Number(selectedTx.amount) >= 0 ? '+' : ''}{formatCurrency(selectedTx.amount)}
                </strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400">Số dư trước:</span>
                <strong className="text-slate-600 dark:text-slate-400 font-mono">{formatCurrency(selectedTx.balance_before)}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400">Số dư sau:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(selectedTx.balance_after)}</strong>
              </div>
              
              {selectedTx.related_order_id && (
                <div className="flex justify-between border-b pb-2 border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Mã đơn hàng liên kết:</span>
                  <strong className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">{selectedTx.related_order_id}</strong>
                </div>
              )}

              <div className="flex flex-col gap-1 pt-1">
                <span className="text-slate-400">Nội dung:</span>
                <p className="text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">{selectedTx.note || 'Không có mô tả'}</p>
              </div>
            </div>
            
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setSelectedTx(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
