import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileCard } from '@/components/account/ProfileCard'

export const metadata: Metadata = {
  title: 'Thông tin tài khoản | Bách Hóa',
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div>Không tìm thấy thông tin tài khoản.</div>
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Thông tin tài khoản</h1>
        <p className="text-slate-500 mt-2">Quản lý thông tin cá nhân và các thiết lập tài khoản.</p>
      </div>

      {/* Grid: Profile */}
      <div className="grid grid-cols-1 gap-6">
        <ProfileCard profile={profile} />
      </div>
    </div>
  )
}
