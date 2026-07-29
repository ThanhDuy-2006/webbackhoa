import { getMarketplaceSettingsAction } from '@/actions/admin/marketplace-settings.actions'
import { MarketplaceSettingsClient } from '@/features/admin/settings/MarketplaceSettingsClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cấu hình Phí sàn C2C | Admin Dashboard',
  description: 'Quản lý phí sàn giao dịch C2C thương mại điện tử',
}

export default async function AdminMarketplaceSettingsPage() {
  const res = await getMarketplaceSettingsAction()

  return (
    <div className="space-y-6">
      <MarketplaceSettingsClient initialFeeBps={res.settings?.platform_fee_bps ?? 0} />
    </div>
  )
}
