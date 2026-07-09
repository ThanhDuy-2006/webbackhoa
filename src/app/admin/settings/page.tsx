import { SettingForm } from '@/features/admin/settings/components/SettingForm'
import { SettingService } from '@/services/setting.service'

export const revalidate = 0

export default async function AdminSettingsPage() {
  const settings = await SettingService.getGeneralSettings()

  return (
    <div className="py-6">
      <SettingForm initialData={settings} />
    </div>
  )
}
