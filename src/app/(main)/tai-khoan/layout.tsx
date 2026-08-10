import { AccountSidebar } from '@/components/account/AccountSidebar'
import { MobileBackButton } from '@/components/account/MobileBackButton'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-[1440px] mx-auto px-0 md:px-6 lg:px-8 py-0 md:py-12">
      <div className="flex flex-col lg:flex-row gap-0 md:gap-8">
        <AccountSidebar profile={profile} email={user.email} />
        
        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 md:px-0 py-6 md:py-0">
          <MobileBackButton />
          {children}
        </main>
      </div>
    </div>
  )
}

