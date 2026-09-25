import { CheckoutClient } from '@/features/checkout/components/CheckoutClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingService } from '@/services/setting.service'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại cửa hàng
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Thanh toán đơn hàng
          </h1>
        </div>
      </div>
      <CheckoutClient user={user} profile={profile} settings={settings} />
    </div>
  )
}

