import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WithdrawalRepository } from '@/repositories/withdrawal.repository'
import { UserWithdrawalForm } from '@/features/profile/components/UserWithdrawalForm'
import { UserWithdrawalList } from '@/features/profile/components/UserWithdrawalList'
import { UserWalletHistoryList } from '@/features/profile/components/UserWalletHistoryList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Wallet, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Rút tiền về ngân hàng | Ví cá nhân',
  description: 'Gửi yêu cầu rút số dư khả dụng về tài khoản ngân hàng cá nhân',
}

export default async function UserWithdrawalPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, full_name, email')
    .eq('id', user.id)
    .single()

  const withdrawals = await WithdrawalRepository.getUserWithdrawals(user.id, 50)
  const balance = Number(profile?.balance || 0)
  const pendingWithdrawalAmount = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + Number(w.amount), 0)
  const totalAssets = balance + pendingWithdrawalAmount

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Rút tiền về ngân hàng</h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Chuyển số dư khả dụng trong ví về tài khoản ngân hàng của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-right">
            <p className="text-[11px] text-slate-400 font-medium">Khả dụng rút:</p>
            <p className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">
              {formatCurrency(balance)}
            </p>
          </div>

          {pendingWithdrawalAmount > 0 && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 px-4 py-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-right">
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Đang chờ duyệt:
              </p>
              <p className="font-mono font-black text-amber-700 dark:text-amber-400 text-base sm:text-lg">
                {formatCurrency(pendingWithdrawalAmount)}
              </p>
            </div>
          )}

          <Link href="/tai-khoan/nap-tien">
            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-1 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-10 px-3">
              <ArrowUpRight className="w-3.5 h-3.5" /> Nạp thêm
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="rut-tien" className="w-full">
        <TabsList className="mb-4 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <TabsTrigger value="rut-tien" className="rounded-lg font-bold text-xs">
            Rút tiền
          </TabsTrigger>
          <TabsTrigger value="lich-su" className="rounded-lg font-bold text-xs">
            Yêu cầu rút tiền ({withdrawals.length})
            {pendingWithdrawalAmount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {withdrawals.filter(w => w.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bien-dong" className="rounded-lg font-bold text-xs">
            Biến động số dư
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rut-tien">
          <UserWithdrawalForm balance={balance} pendingAmount={pendingWithdrawalAmount} />
        </TabsContent>

        <TabsContent value="lich-su">
          <UserWithdrawalList data={withdrawals} />
        </TabsContent>

        <TabsContent value="bien-dong">
          <UserWalletHistoryList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
