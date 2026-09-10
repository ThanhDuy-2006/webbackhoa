import { Metadata } from 'next'
import { WithdrawalRepository } from '@/repositories/withdrawal.repository'
import { WithdrawalList } from '@/features/admin/withdrawals/components/WithdrawalList'
import { AdminHeader } from '@/components/layout/AdminHeader'

export const metadata: Metadata = {
  title: 'Duyệt rút tiền | Admin',
  description: 'Quản lý và phê duyệt các yêu cầu rút tiền về ngân hàng của khách hàng',
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

export default async function AdminWithdrawalsPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const limit = 20

  const filter = {
    status: searchParams.status,
    search: searchParams.search,
    page,
    limit,
  }

  const { data: withdrawals, count } = await WithdrawalRepository.getWithdrawalRequests(filter)

  return (
    <div className="space-y-6">
      <AdminHeader 
        title="Duyệt rút tiền" 
        description="Quản lý và xử lý các yêu cầu rút số dư ví về tài khoản ngân hàng từ người dùng." 
      />
      
      <WithdrawalList initialData={withdrawals} total={count} />
    </div>
  )
}
