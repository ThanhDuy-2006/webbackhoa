'use client'

import { useState } from 'react'
import Link from 'next/link'
import * as Lucide from 'lucide-react'
import * as SheetUI from '@/components/ui/sheet'

export function AdminMobileMenu({ sidebarLinks, fullName, email, avatarUrl, logoutAction }: any) {
  const [open, setOpen] = useState(false)

  const MenuIcon = Lucide.Menu || (() => null)
  const PackageIcon = Lucide.Sprout || (() => null)
  const LogOutIcon = Lucide.LogOut || (() => null)

  return (
    <SheetUI.Sheet open={open} onOpenChange={setOpen}>
      <SheetUI.SheetTrigger className="rounded-full h-10 w-10 hover:bg-white hover:shadow-sm transition-all flex items-center justify-center cursor-pointer">
        <MenuIcon className="h-5 w-5 text-slate-700" />
      </SheetUI.SheetTrigger>
      <SheetUI.SheetContent side="left" className="w-[280px] p-0 bg-[#F5F7FB]">
        <div className="h-full bg-white flex flex-col overflow-hidden border-r border-slate-100">
          <div className="h-20 flex items-center px-6 shrink-0 border-b border-slate-100">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm shadow-emerald-200 mr-3">
               <PackageIcon className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">Bách Hóa Admin</span>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-4">
              {sidebarLinks && sidebarLinks.map((link: any) => {
                const IconName = link.iconName as keyof typeof Lucide
                const IconComponent = (Lucide[IconName] as any) || PackageIcon
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-3 rounded-2xl transition-all duration-300 group text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    >
                      {IconComponent ? (
                        <IconComponent className="h-5 w-5 mr-3 text-slate-400 group-hover:text-slate-600" />
                      ) : (
                        <span className="w-5 h-5 mr-3 bg-slate-200 rounded" />
                      )}
                      <span className="text-sm">{link.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <form action={logoutAction} className="m-2 shrink-0">
            <button type="submit" className="w-full p-4 border-t border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl text-left cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                  <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{email}</p>
                </div>
              </div>
              <LogOutIcon className="h-4 w-4 text-slate-400 hover:text-red-500 transition-colors" />
            </button>
          </form>
        </div>
      </SheetUI.SheetContent>
    </SheetUI.Sheet>
  )
}
