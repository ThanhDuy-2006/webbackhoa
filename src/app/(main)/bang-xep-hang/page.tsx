import { Metadata } from 'next'
import { LeaderboardClient } from '@/features/leaderboard/components/LeaderboardClient'

export const metadata: Metadata = {
  title: 'Bảng Xếp Hạng | Bách Hóa',
  description: 'Bảng xếp hạng thành viên nạp tiền và chi tiêu nổi bật nhất trong tháng.',
}

export default function LeaderboardPage() {
  return (
    <div className="container py-8 max-w-6xl mx-auto px-4 md:px-6">
      <LeaderboardClient />
    </div>
  )
}
