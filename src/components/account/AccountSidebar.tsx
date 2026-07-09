'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, ShoppingBag, CreditCard, MapPin, Lock, Bell, LogOut, Activity } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

const sidebarLinks = [
  { name: 'Thông tin tài khoản', href: '/tai-khoan', icon: User },
  { name: 'Đơn hàng của tôi', href: '/tai-khoan/don-hang', icon: ShoppingBag },
  { name: 'Ví của tôi', href: '/tai-khoan/nap-tien', icon: CreditCard },
  { name: 'Lịch sử chung', href: '/tai-khoan/lich-su-chung', icon: Activity },
  { name: 'Địa chỉ giao hàng', href: '/tai-khoan/dia-chi', icon: MapPin },
  { name: 'Đổi mật khẩu', href: '/tai-khoan/mat-khau', icon: Lock },
  { name: 'Thông báo', href: '/tai-khoan/thong-bao', icon: Bell },
]

export function AccountSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full lg:w-[280px] shrink-0">
      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 sticky top-24">
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            // Match exactly for /tai-khoan, but allow sub-paths for others.
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
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl px-4 py-3 h-auto font-medium"
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
