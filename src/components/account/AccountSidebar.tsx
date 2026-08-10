'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, ShoppingBag, CreditCard, Lock, LogOut, Activity, Store, PackageCheck, DollarSign, ChevronRight, ArrowLeft } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

const sidebarLinks = [
  { name: 'Hồ sơ', href: '/tai-khoan', icon: User },
  { name: 'Đơn mua', href: '/tai-khoan/don-hang', icon: ShoppingBag },
  { name: 'Sản phẩm của tôi', href: '/tai-khoan/san-pham-cua-toi', icon: Store },
  { name: 'Đơn bán', href: '/tai-khoan/don-ban', icon: PackageCheck },
  { name: 'Ví của tôi', href: '/tai-khoan/nap-tien', icon: CreditCard },
  { name: 'Lịch sử giao dịch', href: '/tai-khoan/lich-su-giao-dich', icon: DollarSign },
  { name: 'Lịch sử chung', href: '/tai-khoan/lich-su-chung', icon: Activity },
  { name: 'Mật khẩu', href: '/tai-khoan/mat-khau', icon: Lock },
]

export function AccountSidebar({ profile, email }: { profile?: any, email?: string }) {
  const pathname = usePathname()
  
  // Hide the sidebar on mobile if we are on a subpage
  const isRoot = pathname === '/tai-khoan'
  const wrapperClass = `w-full lg:w-[280px] shrink-0 ${!isRoot ? 'hidden lg:block' : 'block'}`

  const fullName = profile?.full_name || 'Người dùng'
  const initials = fullName.substring(0, 2).toUpperCase()

  return (
    <aside className={wrapperClass}>
      
      {/* Mobile Menu View (Only visible on /tai-khoan on small screens) */}
      <div className="lg:hidden flex flex-col space-y-6">
        {/* Profile Summary */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="relative h-14 w-14 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-slate-800 text-lg truncate">{fullName}</h2>
            {email && <p className="text-sm text-slate-500 truncate">{email}</p>}
          </div>
        </div>

        {/* Vertical List */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            const isActive = link.href === '/tai-khoan' 
              ? pathname === '/tai-khoan'
              : pathname.startsWith(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between p-4 transition-colors border-b border-slate-50 last:border-0 ${
                  isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`font-medium ${isActive ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {link.name}
                  </span>
                </div>
                <ChevronRight className={`h-5 w-5 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
              </Link>
            )
          })}
          
          <button
            onClick={logout}
            className="flex items-center justify-between p-4 transition-colors hover:bg-red-50 text-left w-full"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-red-100 text-red-500">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="font-medium text-red-600">Đăng xuất</span>
            </div>
            <ChevronRight className="h-5 w-5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Desktop Vertical Menu */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm p-4 sticky top-24 border border-slate-100">
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            const isActive = link.href === '/tai-khoan' 
              ? pathname === '/tai-khoan'
              : pathname.startsWith(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                  isActive 
                    ? 'text-emerald-700 bg-emerald-50' 
                    : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            )
          })}
          
          <div className="pt-4 mt-4 border-t border-slate-100">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-4 py-3 h-auto font-medium cursor-pointer"
              onClick={logout}
            >
              <LogOut className="h-5 w-5 mr-3 text-red-500" />
              Đăng xuất
            </Button>
          </div>
        </nav>
      </div>
    </aside>
  )
}
