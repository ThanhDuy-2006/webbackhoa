'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sprout, LogOut } from 'lucide-react'
import * as SheetUI from '@/components/ui/sheet'
import { MorphIcon, Menu, X } from '@/components/ui/morph-icon'
import { ADMIN_NAV_SECTIONS } from '@/config/admin-navigation'
import { cn } from '@/lib/utils'

export function AdminMobileMenu({ fullName, email, avatarUrl, logoutAction }: {
  sidebarLinks?: any
  fullName?: string
  email?: string
  avatarUrl?: string
  logoutAction?: any
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <SheetUI.Sheet open={open} onOpenChange={setOpen}>
      <SheetUI.SheetTrigger className="rounded-xl h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
        <MorphIcon icon={open ? X : Menu} size={18} spring="snappy" />
      </SheetUI.SheetTrigger>
      <SheetUI.SheetContent side="left" className="w-[280px] p-0 bg-[#F5F7FB]">
        <div className="h-full bg-white flex flex-col overflow-hidden border-r border-slate-100">
          
          {/* Header */}
          <div className="h-16 flex items-center px-5 shrink-0 border-b border-slate-100">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-200 mr-2.5">
               <Sprout className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              Bách Hóa Admin
            </span>
          </div>

          {/* Grouped Nav List */}
          <nav className="flex-1 py-3 overflow-y-auto px-3 space-y-4">
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
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center px-3 py-2 rounded-xl transition-all text-xs font-semibold group",
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
          </nav>

          {/* Footer User Info */}
          <form action={logoutAction} className="m-2 shrink-0">
            <button type="submit" className="w-full p-3 border-t border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl text-left cursor-pointer">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shrink-0">
                  <img src={avatarUrl} alt={fullName || 'Admin'} className="h-full w-full object-cover" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{fullName || 'Admin'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{email || 'admin@bachhoa.com'}</p>
                </div>
              </div>
              <LogOut className="h-4 w-4 text-slate-400 hover:text-red-500 transition-colors shrink-0" />
            </button>
          </form>

        </div>
      </SheetUI.SheetContent>
    </SheetUI.Sheet>
  )
}
