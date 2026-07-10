'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, ShoppingBag, CreditCard, MapPin, Lock, Bell, LogOut, Activity, Percent } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

const sidebarLinks = [
  { name: 'Hồ sơ', href: '/tai-khoan', icon: User },
  { name: 'Đơn hàng', href: '/tai-khoan/don-hang', icon: ShoppingBag },
  { name: 'Ví của tôi', href: '/tai-khoan/nap-tien', icon: CreditCard },
  { name: 'Chia sẻ doanh thu', href: '/tai-khoan/chia-tien', icon: Percent },
  { name: 'Lịch sử chung', href: '/tai-khoan/lich-su-chung', icon: Activity },
  { name: 'Địa chỉ', href: '/tai-khoan/dia-chi', icon: MapPin },
  { name: 'Mật khẩu', href: '/tai-khoan/mat-khau', icon: Lock },
  { name: 'Thông báo', href: '/tai-khoan/thong-bao', icon: Bell },
]

export function AccountSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full lg:w-[280px] shrink-0">
      {/* Mobile Horizontal Scrolling Tabs */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-3 mb-4 scrollbar-none snap-x">
        {sidebarLinks.map((link) => {
          const Icon = link.icon
          const isActive = link.href === '/tai-khoan' 
            ? pathname === '/tai-khoan'
            : pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center shrink-0 px-4 py-2.5 rounded-full transition-all font-semibold text-xs snap-start border ${
                isActive 
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                  : 'text-slate-600 bg-white hover:text-emerald-600 border-slate-100 hover:bg-slate-50'
              }`}
              style={{ minHeight: '44px' }}
            >
              <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              {link.name}
            </Link>
          )
        })}
      </div>

      {/* Desktop Vertical Menu */}
      <div className="hidden lg:block bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 sticky top-24 border border-slate-100">
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
                className={`flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  isActive 
                    ? 'text-emerald-700 bg-emerald-50 border-l-4 border-emerald-600' 
                    : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50 border-l-4 border-transparent'
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
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl px-4 py-3 h-auto font-medium cursor-pointer"
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
