'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Package, LogOut } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface LinkItem {
  name: string
  href: string
  icon: any
}

interface AdminMobileMenuProps {
  sidebarLinks: LinkItem[]
  fullName: string
  email: string
  avatarUrl: string
  logoutAction: any
}

export function AdminMobileMenu({ sidebarLinks, fullName, email, avatarUrl, logoutAction }: AdminMobileMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="rounded-full h-10 w-10 hover:bg-white hover:shadow-sm transition-all flex items-center justify-center cursor-pointer">
        <Menu className="h-5 w-5 text-slate-700" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 bg-[#F5F7FB]">
        <div className="h-full bg-white flex flex-col overflow-hidden border-r border-slate-100">
          <div className="h-20 flex items-center px-6 shrink-0">
            <div className="bg-emerald-100 p-2 rounded-xl mr-3">
              <Package className="h-6 w-6 text-emerald-600" />
            </div>
            <span className="font-bold text-lg text-slate-800">Bách Hóa Admin</span>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-4">
              {sidebarLinks.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-3 rounded-2xl transition-all duration-300 group text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    >
                      <Icon className="h-5 w-5 mr-3 text-slate-400 group-hover:text-slate-600" />
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
              <LogOut className="h-4 w-4 text-slate-400 hover:text-red-500 transition-colors" />
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
