import Link from 'next/link'
import { Package, Users, ShoppingBag, LayoutDashboard, Settings, CreditCard, LogOut, Tags, Search, Bell, Calendar, ChevronDown, Ticket, BarChart3, Archive, UserCog, Menu } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { AdminMobileMenu } from '@/components/admin/AdminMobileMenu'

const sidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Sản phẩm', href: '/admin/products', icon: Package },
  { name: 'Danh mục', href: '/admin/categories', icon: Tags },
  { name: 'Đơn hàng', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Khách hàng', href: '/admin/users', icon: Users },
  { name: 'Duyệt nạp tiền', href: '/admin/topups', icon: CreditCard },
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
      {/* Sidebar - Floating Glass Card */}
      <aside className="w-64 my-4 ml-4 bg-white rounded-[24px] shadow-sm flex-col hidden md:flex overflow-hidden border border-slate-100">
        <div className="h-20 flex items-center px-6">
          <div className="bg-emerald-100 p-2 rounded-xl mr-3">
            <Package className="h-6 w-6 text-emerald-600" />
          </div>
          <span className="font-bold text-lg text-slate-800">Bách Hóa Admin</span>
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
              sidebarLinks={sidebarLinks}
              fullName={fullName}
              email={email}
              avatarUrl={avatarUrl}
              logoutAction={logout}
            />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="relative p-2.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-full transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-full transition-all">
              <Calendar className="h-5 w-5" />
            </button>
            
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
          {children}
        </main>
      </div>
    </div>
  )
}
