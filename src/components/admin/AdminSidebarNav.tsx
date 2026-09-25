'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV_SECTIONS } from '@/config/admin-navigation'
import { cn } from '@/lib/utils'

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <div className="space-y-4 px-3">
      {ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1">
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </span>
          </div>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-xs font-semibold group",
                      isActive 
                        ? "bg-emerald-50 text-emerald-700 font-bold shadow-2xs" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 mr-2.5 transition-colors shrink-0",
                      isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                    )} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
