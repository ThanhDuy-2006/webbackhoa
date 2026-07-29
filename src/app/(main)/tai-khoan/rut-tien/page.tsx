import { getSellerBalanceAction } from '@/actions/seller-ledger.actions'
import { SellerWithdrawalForm } from '@/features/seller/components/SellerWithdrawalForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rút tiền về ngân hàng | Sàn C2C',
  description: 'Gửi yêu cầu rút số dư khả dụng về tài khoản ngân hàng cá nhân',
}

export default async function SellerWithdrawalPage() {
  const res = await getSellerBalanceAction()

  return (
    <div className="space-y-6">
      <SellerWithdrawalForm
        availableBalance={res.wallet?.available_balance || 0}
        withdrawals={res.withdrawals || []}
      />
    </div>
  )
}
