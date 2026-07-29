import { getSellerBalanceAction } from '@/actions/seller-ledger.actions'
import { SellerRevenueClient } from '@/features/seller/components/SellerRevenueClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Doanh thu & Sổ cái | Sàn C2C',
  description: 'Quản lý số dư ví bán hàng và lịch sử giao dịch C2C',
}

export default async function SellerRevenuePage() {
  const res = await getSellerBalanceAction()

  return (
    <div className="space-y-6">
      <SellerRevenueClient
        wallet={res.wallet || { pending_balance: 0, available_balance: 0, reserved_balance: 0, withdrawn_balance: 0 }}
        transactions={res.transactions || []}
        withdrawals={res.withdrawals || []}
      />
    </div>
  )
}
