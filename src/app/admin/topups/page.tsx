import { Metadata } from 'next'
import { TopupRepository } from '@/repositories/topup.repository'
import { TopupList } from '@/features/admin/topups/components/TopupList'
import { AdminHeader } from '@/components/layout/AdminHeader'

export const metadata: Metadata = {
  title: 'Quản lý nạp tiền | Admin',
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

export default async function AdminTopupsPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const limit = 20
  
  const filter = {
    status: searchParams.status,
    search: searchParams.search,
    page,
    limit,
  }

  const { data: topups, count } = await TopupRepository.getTopupRequests(filter)

  return (
    <div className="space-y-6">
      <AdminHeader 
        title="Quản lý nạp tiền" 
        description="Duyệt yêu cầu nạp tiền từ người dùng. Tiền sẽ được cộng vào ví ngay sau khi duyệt." 
      />
      
      <TopupList initialData={topups} total={count} />
    </div>
  )
}
