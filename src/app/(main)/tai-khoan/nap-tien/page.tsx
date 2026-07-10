import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopupRepository } from '@/repositories/topup.repository'
import { UserTopupForm } from '@/features/profile/components/UserTopupForm'
import { UserTopupList } from '@/features/profile/components/UserTopupList'
import { UserWalletHistoryList } from '@/features/profile/components/UserWalletHistoryList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Nạp tiền vào ví',
}

export default async function UserTopupsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: topups } = await TopupRepository.getTopupRequests({
    userId: user.id,
    limit: 50 // get recent 50
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nạp tiền vào ví</h1>
        <p className="text-slate-500">Thêm số dư vào tài khoản để thanh toán mua hàng nhanh chóng.</p>
      </div>

      <Tabs defaultValue="nap-tien" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="nap-tien">Nạp tiền</TabsTrigger>
          <TabsTrigger value="lich-su">Yêu cầu nạp tiền</TabsTrigger>
          <TabsTrigger value="bien-dong">Biến động số dư</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nap-tien">
          <UserTopupForm userId={user.id} />
        </TabsContent>
        
        <TabsContent value="lich-su">
          <UserTopupList data={topups} />
        </TabsContent>

        <TabsContent value="bien-dong">
          <UserWalletHistoryList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
