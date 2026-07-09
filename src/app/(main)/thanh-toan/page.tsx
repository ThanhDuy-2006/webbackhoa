import { CheckoutClient } from '@/features/checkout/components/CheckoutClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingService } from '@/services/setting.service'

export const revalidate = 0

export default async function CheckoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/thanh-toan')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const settings = await SettingService.getGeneralSettings()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Thanh toán</h1>
      <CheckoutClient user={user} profile={profile} settings={settings} />
    </div>
  )
}
