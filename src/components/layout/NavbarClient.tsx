'use client'

import Link from 'next/link'
import { ShoppingCart, User as UserIcon, LogOut, Menu, Package, Settings, Wallet, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { logout } from '@/app/login/actions'
import { useCartStore } from '@/store/useCartStore'
import { CartSheet } from './CartSheet'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'

interface NavbarClientProps {
  user: User | null
  profile: Record<string, unknown> | null
}

export function NavbarClient({ user, profile }: NavbarClientProps) {
  const { setIsOpen } = useCartStore()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-md border-b shadow-sm' 
          : 'bg-white border-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Package className="h-7 w-7 text-emerald-600" />
            <span className="font-bold text-2xl text-slate-900 tracking-tight hidden sm:inline-block">Bách Hóa</span>
          </Link>
          <nav className="hidden lg:flex gap-6 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Trang chủ</Link>
            <Link href="/san-pham" className="hover:text-emerald-600 transition-colors">Sản phẩm</Link>
            <Link href="/khuyen-mai" className="hover:text-emerald-600 transition-colors">Khuyến mãi</Link>
          </nav>
        </div>



        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="relative hover:bg-slate-100 rounded-full h-10 w-10 transition-colors">
            <ShoppingCart className="h-5 w-5 text-slate-700" />
            <span className="sr-only">Giỏ hàng</span>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1 pr-4 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-left">
                <div className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="hidden sm:flex flex-col justify-center">
                  <span className="text-sm font-semibold text-slate-900 leading-none max-w-[120px] truncate">
                    {(profile?.full_name as string) || user?.email?.split('@')[0] || 'Tài khoản'}
                  </span>
                  <span className={`text-xs font-medium mt-1.5 leading-none ${Number(profile?.balance || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {Number(profile?.balance || 0).toLocaleString('vi-VN')} VND
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-slate-100">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{(profile?.full_name as string) || user?.email || 'Người dùng'}</p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">Ví: {Number(profile?.balance || 0).toLocaleString('vi-VN')} VND</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {profile?.role === 'admin' && (
                  <DropdownMenuItem>
                    <Link href="/admin" className="cursor-pointer flex w-full items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Trang quản trị</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Link href="/tai-khoan" className="cursor-pointer flex w-full items-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Tài khoản cá nhân</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/tai-khoan/don-hang" className="cursor-pointer flex w-full items-center">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Đơn hàng
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/nap-tien" className="cursor-pointer flex w-full items-center">
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>Nạp tiền</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600 cursor-pointer hover:bg-red-50 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex gap-3">
              <Link href="/login" passHref legacyBehavior>
                <Button variant="ghost" className="rounded-full hover:bg-slate-100 font-medium">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register" passHref legacyBehavior>
                <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-full font-medium shadow-sm hover:shadow transition-all">
                  Đăng ký
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-slate-100" />}>
                <Menu className="h-5 w-5 text-slate-700" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] pt-12">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link href="/" className="text-lg font-medium text-slate-800 hover:text-emerald-600 transition-colors">Trang chủ</Link>
                  <Link href="/san-pham" className="text-lg font-medium text-slate-800 hover:text-emerald-600 transition-colors">Sản phẩm</Link>
                  <Link href="/khuyen-mai" className="text-lg font-medium text-slate-800 hover:text-emerald-600 transition-colors">Khuyến mãi</Link>
                  
                  {!user && (
                    <div className="mt-8 flex flex-col gap-3">
                      <Link href="/login" className="w-full">
                        <Button variant="outline" className="w-full justify-center">Đăng nhập</Button>
                      </Link>
                      <Link href="/register" className="w-full">
                        <Button className="w-full justify-center bg-emerald-600 hover:bg-emerald-700">Đăng ký</Button>
                      </Link>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <CartSheet user={user} profile={profile} />
    </header>
  )
}
