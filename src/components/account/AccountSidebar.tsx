'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  User, 
  ShoppingBag, 
  CreditCard, 
  Lock, 
  LogOut, 
  Activity, 
  Store, 
  PackageCheck, 
  DollarSign, 
  ChevronRight, 
  Landmark,
  Percent
} from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AccountNavSection {
  title: string
  items: {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }[]
}

const accountNavGroups: AccountNavSection[] = [
  {
    title: 'TÀI KHOẢN',
    items: [
      { name: 'Hồ sơ cá nhân', href: '/tai-khoan', icon: User },
      { name: 'Đổi mật khẩu', href: '/tai-khoan/mat-khau', icon: Lock },
    ]
  },
  {
    title: 'MUA SẮM',
    items: [
      { name: 'Đơn mua của tôi', href: '/tai-khoan/don-hang', icon: ShoppingBag },
    ]
  },
  {
    title: 'BÁN HÀNG',
    items: [
      { name: 'Sản phẩm của tôi', href: '/tai-khoan/san-pham-cua-toi', icon: Store },
      { name: 'Đơn bán hàng', href: '/tai-khoan/don-ban', icon: PackageCheck },
      { name: 'Doanh thu bán', href: '/tai-khoan/doanh-thu', icon: Percent },
    ]
  },
  {
    title: 'VÍ TIỀN',
    items: [
      { name: 'Nạp tiền vào ví', href: '/tai-khoan/nap-tien', icon: CreditCard },
      { name: 'Rút tiền ngân hàng', href: '/tai-khoan/rut-tien', icon: Landmark },
      { name: 'Lịch sử giao dịch ví', href: '/tai-khoan/lich-su-giao-dich', icon: DollarSign },
    ]
  },
  {
    title: 'HOẠT ĐỘNG',
    items: [
      { name: 'Lịch sử hoạt động', href: '/tai-khoan/lich-su-chung', icon: Activity },
    ]
  }
]

export function AccountSidebar({ profile, email }: { profile?: any, email?: string }) {
  const pathname = usePathname()
  
  // Hide the sidebar on mobile if we are viewing a specific subpage
  const isRoot = pathname === '/tai-khoan'
  const wrapperClass = `w-full lg:w-[280px] shrink-0 ${!isRoot ? 'hidden lg:block' : 'block'}`

  const fullName = profile?.full_name || 'Người dùng'
  const initials = fullName.substring(0, 2).toUpperCase()

  return (
    <aside className={wrapperClass}>
      
      {/* Mobile Menu View (Only on /tai-khoan on mobile) */}
      <div className="lg:hidden flex flex-col space-y-4">
        {/* Profile Card */}
        <div className="flex items-center gap-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-base">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">{fullName}</h2>
            {email && <p className="text-xs text-slate-500 truncate">{email}</p>}
          </div>
        </div>

        {/* Grouped Mobile List */}
        <div className="space-y-4">
          {accountNavGroups.map((group) => (
            <div key={group.title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {group.title}
                </span>
              </div>
              <div className="flex flex-col">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.href === '/tai-khoan' 
                    ? pathname === '/tai-khoan'
                    : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between p-3.5 transition-colors border-b border-slate-50 dark:border-slate-850 last:border-0",
                        isActive 
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-xl transition-colors",
                          isActive 
                            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold">{item.name}</span>
                      </div>
                      <ChevronRight className={cn("h-4 w-4", isActive ? "text-emerald-600" : "text-slate-400")} />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Logout button */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <button
              onClick={logout}
              className="flex items-center justify-between p-3.5 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 text-left w-full cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">Đăng xuất tài khoản</span>
              </div>
              <ChevronRight className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Vertical Menu */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-3.5 sticky top-24 border border-slate-200/80 dark:border-slate-800">
        <nav className="space-y-4">
          {accountNavGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 py-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {group.title}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.href === '/tai-khoan' 
                    ? pathname === '/tai-khoan'
                    : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-xl transition-all text-xs font-semibold",
                        isActive 
                          ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50" 
                          : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mr-2.5 shrink-0", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
          
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl px-3 py-2 h-auto text-xs font-semibold cursor-pointer"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2.5 text-red-500 shrink-0" />
              Đăng xuất
            </Button>
          </div>
        </nav>
      </div>
    </aside>
  )
}
