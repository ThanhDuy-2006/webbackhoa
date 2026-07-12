import Link from 'next/link'
import { Package, Users, ShoppingBag, LayoutDashboard, Settings, CreditCard, LogOut, Tags, Search, Bell, Calendar, ChevronDown, Ticket, BarChart3, Archive, UserCog, Menu, Percent, Sprout } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { AdminMobileMenu } from '@/components/admin/AdminMobileMenu'
import { AdminRealtimeListener } from '@/components/admin/AdminRealtimeListener'
import { PageTransition } from '@/components/ui/PageTransition'

const sidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Sản phẩm', href: '/admin/products', icon: Package },
  { name: 'Danh mục', href: '/admin/categories', icon: Tags },
  { name: 'Đơn hàng', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Khách hàng', href: '/admin/users', icon: Users },
  { name: 'Duyệt nạp tiền', href: '/admin/topups', icon: CreditCard },
  { name: 'Chia tiền sản phẩm', href: '/admin/revenue-share', icon: Percent },
]

const mobileSidebarLinks: { name: string; href: string; iconName: 'LayoutDashboard' | 'Package' | 'Tags' | 'ShoppingBag' | 'Users' | 'CreditCard' | 'Percent' }[] = [
  { name: 'Dashboard', href: '/admin', iconName: 'LayoutDashboard' },
  { name: 'Sản phẩm', href: '/admin/products', iconName: 'Package' },
  { name: 'Danh mục', href: '/admin/categories', iconName: 'Tags' },
  { name: 'Đơn hàng', href: '/admin/orders', iconName: 'ShoppingBag' },
  { name: 'Khách hàng', href: '/admin/users', iconName: 'Users' },
  { name: 'Duyệt nạp tiền', href: '/admin/topups', iconName: 'CreditCard' },
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
      <aside className="w-64 my-4 ml-4 bg-white rounded-[24px] shadow-sm flex-col hidden md:flex overflow-hidden border border-slate-100">
        <div className="h-20 flex items-center px-6">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm shadow-emerald-200 mr-3">
             <Sprout className="h-5 w-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">Bách Hóa Admin</span>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1 px-4">
            {sidebarLinks.map((link) => {
              const Icon = link.icon
              // Simple active state check (can be improved with usePathname)
              const isActive = link.href === '/admin' // mockup active state
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center px-4 py-3 rounded-2xl transition-all duration-300 group ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 font-medium' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="text-sm">{link.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>


        {/* User Profile */}
        <form action={logout} className="m-2">
          <button type="submit" className="w-full p-4 border-t border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
                <p className="text-xs text-slate-500 truncate">{email}</p>
              </div>
            </div>
            <LogOut className="h-4 w-4 text-slate-400 hover:text-red-500 transition-colors" />
          </button>
        </form>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-20 flex items-center px-4 md:px-8 justify-between md:justify-end shrink-0 mt-4 mx-4 bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)]">
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

          <div className="flex items-center gap-2 md:gap-4">

            
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            
            <Link href="/" className="flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="bg-slate-100 p-1.5 rounded-full group-hover:bg-blue-50 transition-colors">
                <LayoutDashboard className="h-4 w-4 text-slate-600 group-hover:text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 pr-2">Bách Hóa Store</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 px-8 pb-10">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
