'use client'

import Link from 'next/link'
import { DollarSign, Clock, CheckCircle2, Lock, ArrowUpRight, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SellerWallet, SellerLedgerTransaction, SellerWithdrawal } from '@/types/order.type'
import { formatCurrency } from '@/lib/utils'

interface SellerRevenueClientProps {
  wallet: SellerWallet
  transactions: SellerLedgerTransaction[]
  withdrawals: SellerWithdrawal[]
}

export function SellerRevenueClient({ wallet, transactions, withdrawals }: SellerRevenueClientProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Doanh thu Ví Bán hàng</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Theo dõi doanh thu bán hàng nội bộ và biến động sổ cái tài chính</p>
        </div>
        <Link href="/tai-khoan/rut-tien">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md shadow-emerald-600/20">
            <ArrowUpRight className="w-4 h-4 mr-2" /> Rút tiền về ngân hàng
          </Button>
        </Link>
      </div>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Balance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Chờ duyệt (Pending)</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">{formatCurrency(wallet.pending_balance)}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Doanh thu đơn đang xử lý / đang giao</p>
        </div>

        {/* Available Balance */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md shadow-emerald-600/10 space-y-2">
          <div className="flex items-center justify-between opacity-90">
            <span className="text-xs font-semibold">Khả dụng (Available)</span>
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono">{formatCurrency(wallet.available_balance)}</div>
          <p className="text-[11px] opacity-80">Số dư sẵn sàng rút về tài khoản ngân hàng</p>
        </div>

        {/* Reserved Balance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Đang rút (Reserved)</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">{formatCurrency(wallet.reserved_balance)}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Đang được tạm khóa xử lý rút tiền</p>
        </div>

        {/* Withdrawn Balance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Đã rút (Withdrawn)</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">{formatCurrency(wallet.withdrawn_balance)}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Tổng tiền đã rút về ngân hàng thành công</p>
        </div>
      </div>

      {/* Ledger Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Biến động Sổ cái (Ledger Transactions)
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Chưa có giao dịch sổ cái nào được ghi nhận</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-2">Thời gian</th>
                  <th className="py-3 px-2">Loại giao dịch</th>
                  <th className="py-3 px-2">Mô tả</th>
                  <th className="py-3 px-2 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-2 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {new Date(tx.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-2 font-semibold">
                      {tx.type === 'sale_pending' && <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">Doanh thu chờ duyệt</span>}
                      {tx.type === 'sale_completed' && <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Doanh thu mở khóa</span>}
                      {tx.type === 'withdrawal_reserved' && <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">Khóa rút tiền</span>}
                      {tx.type === 'withdrawal_completed' && <span className="text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">Đã rút tiền</span>}
                      {tx.type === 'withdrawal_rejected' && <span className="text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">Từ chối rút tiền</span>}
                    </td>
                    <td className="py-3 px-2">{tx.description}</td>
                    <td className={`py-3 px-2 text-right font-bold font-mono ${tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
