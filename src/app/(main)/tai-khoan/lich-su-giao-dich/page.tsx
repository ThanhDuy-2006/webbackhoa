import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserWalletHistoryList } from '@/features/profile/components/UserWalletHistoryList'

export const metadata: Metadata = {
  title: 'Lịch sử giao dịch',
}

export default async function UserTransactionHistoryPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lịch sử giao dịch (Sổ cái)</h1>
        <p className="text-slate-500">Theo dõi chi tiết biến động số dư, lịch sử nạp tiền, mua hàng và nhận tiền bán hàng của bạn.</p>
      </div>

      <UserWalletHistoryList />
    </div>
  )
}
