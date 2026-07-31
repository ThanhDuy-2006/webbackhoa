'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, Users, ShoppingBag, LayoutDashboard, CreditCard, Tags, Percent } from 'lucide-react'

const sidebarLinks = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Sản phẩm', href: '/admin/products', icon: Package },
  { name: 'Danh mục', href: '/admin/categories', icon: Tags },
  { name: 'Đơn hàng', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Khách hàng', href: '/admin/users', icon: Users },
  { name: 'Duyệt nạp tiền', href: '/admin/topups', icon: CreditCard },
  { name: 'Chia tiền sản phẩm', href: '/admin/revenue-share', icon: Percent },
]

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <ul className="space-y-1 px-4">
      {sidebarLinks.map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href || (link.href !== '/admin' && pathname?.startsWith(link.href))
        
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
  )
}
