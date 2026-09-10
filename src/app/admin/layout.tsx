import Link from 'next/link'
import { Package, Users, ShoppingBag, LayoutDashboard, Settings, CreditCard, LogOut, Tags, Search, Bell, Calendar, ChevronDown, Ticket, BarChart3, Archive, UserCog, Menu, Percent, Sprout, ExternalLink } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { AdminMobileMenu } from '@/components/admin/AdminMobileMenu'
import { AdminRealtimeListener } from '@/components/admin/AdminRealtimeListener'
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav'
import { PageTransition } from '@/components/ui/PageTransition'

const mobileSidebarLinks: { name: string; href: string; iconName: 'LayoutDashboard' | 'Package' | 'Tags' | 'ShoppingBag' | 'Users' | 'CreditCard' | 'Percent' | 'Landmark' }[] = [
  { name: 'Dashboard', href: '/admin', iconName: 'LayoutDashboard' },
  { name: 'Sản phẩm', href: '/admin/products', iconName: 'Package' },
  { name: 'Danh mục', href: '/admin/categories', iconName: 'Tags' },
  { name: 'Đơn hàng', href: '/admin/orders', iconName: 'ShoppingBag' },
  { name: 'Khách hàng', href: '/admin/users', iconName: 'Users' },
  { name: 'Duyệt nạp tiền', href: '/admin/topups', iconName: 'CreditCard' },
  { name: 'Duyệt rút tiền', href: '/admin/withdrawals', iconName: 'Landmark' },
  { name: 'Chia tiền sản phẩm', href: '/admin/revenue-share', iconName: 'Percent' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
    profile = data
  }
  
  const fullName = profile?.full_name || 'Quản trị viên'
  const email = user?.email || 'admin@bachhoa.com'
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=e2e8f0&color=1e293b`

  return (
    <div className="flex h-screen bg-[#F5F7FB] overflow-hidden font-sans">
      <AdminRealtimeListener />
      {/* Sidebar - Floating Glass Card */}
      <aside className="w-64 my-3 ml-3 bg-white rounded-[24px] shadow-sm flex-col hidden md:flex overflow-hidden border border-slate-100 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-50">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm shadow-emerald-200 mr-2.5">
             <Sprout className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">Bách Hóa Admin</span>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar">
          <AdminSidebarNav />
        </nav>

        {/* User Profile */}
        <form action={logout} className="m-2 shrink-0">
          <button type="submit" className="w-full p-3 border-t border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl text-left cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shrink-0">
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate">{fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{email}</p>
              </div>
            </div>
            <LogOut className="h-3.5 w-3.5 text-slate-400 hover:text-red-500 transition-colors shrink-0" />
          </button>
        </form>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 flex items-center px-4 md:px-6 justify-between md:justify-end shrink-0 mt-3 mx-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <AdminMobileMenu
              sidebarLinks={mobileSidebarLinks}
              fullName={fullName}
              email={email}
              avatarUrl={avatarUrl}
              logoutAction={logout}
            />
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              target="_blank"
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-100 transition-all text-xs font-semibold group"
            >
              <Sprout className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>Bách Hóa Store</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 md:px-6 pb-12">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
