'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShoppingCart, User as UserIcon, LogOut, Menu, Package, Settings, Wallet, ShoppingBag, Home, Tag, Sun, Moon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { StorefrontSearch } from './StorefrontSearch'
import { useTheme } from 'next-themes'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'

interface NavbarClientProps {
  user: User | null
  profile: Record<string, unknown> | null
}

export function NavbarClient({ user, profile }: NavbarClientProps) {
  const { setIsOpen } = useCartStore()
  const cartItems = useCartStore((state) => state.items)
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Sản phẩm', href: '/san-pham', icon: Package },
    { name: 'Giỏ hàng', href: '#cart', icon: ShoppingCart, isCart: true },
    { name: 'Cá nhân', href: user ? '/tai-khoan' : '/login', icon: UserIcon },
  ]

  return (
    <>
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
          <Link href="/" className="flex items-center gap-2" style={{ minWidth: '44px', minHeight: '44px' }}>
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
          {user && (
            <Link 
              href="/tai-khoan/nap-tien" 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-full text-xs font-bold transition-all shadow-sm"
              style={{ minHeight: '44px' }}
            >
              <Wallet className="w-4 h-4" />
              <span>{Number(profile?.balance || 0).toLocaleString('vi-VN')}đ</span>
            </Link>
          )}

          {/* Theme Toggle Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="hover:bg-slate-100 rounded-full h-11 w-11 transition-colors relative cursor-pointer"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-slate-700 dark:text-slate-200 animate-in fade-in" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-700 dark:text-slate-200 animate-in fade-in" />
            <span className="sr-only">Chế độ tối</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(true)} 
            className="relative hover:bg-slate-100 rounded-full h-11 w-11 transition-colors hidden lg:flex cursor-pointer"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <ShoppingCart className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
            <span className="sr-only">Giỏ hàng</span>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1.5 pr-4 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-left cursor-pointer" style={{ minHeight: '44px' }}>
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
                <Button variant="ghost" className="rounded-full hover:bg-slate-100 font-medium" style={{ minHeight: '44px' }}>
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register" passHref legacyBehavior>
                <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-full font-medium shadow-sm hover:shadow transition-all" style={{ minHeight: '44px' }}>
                  Đăng ký
                </Button>
              </Link>
            </div>
          )}


        </div>
      </div>
      <CartSheet user={user} profile={profile} />
    </header>

    {/* Mobile Bottom Navigation Bar */}
    {(() => {
      const isProductDetail = pathname.startsWith('/san-pham/') && pathname.split('/').length > 2
      const isCheckout = pathname === '/thanh-toan'
      const isAuth = pathname === '/login' || pathname === '/register'
      const showBottomNav = !isProductDetail && !isCheckout && !isAuth

      return showBottomNav ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isCart = item.isCart
              const isActive = isCart ? false : pathname === item.href

              const content = (
                <span className="relative flex flex-col items-center justify-center w-full h-full text-xs font-medium gap-1 text-slate-500">
                  {isActive && (
                    <motion.span
                      layoutId="activeTab"
                      className="absolute inset-x-2 inset-y-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className={cn("relative p-1 rounded-xl transition-colors", isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
                    <Icon className="w-5 h-5" />
                    {isCart && cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </div>
                  <span className={cn("text-[9px] sm:text-[10px] tracking-tight", isActive ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-500')}>
                    {item.name}
                  </span>
                </span>
              )

              if (isCart) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setIsOpen(true)}
                    className="flex-1 flex items-center justify-center h-full focus:outline-none cursor-pointer"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    {content}
                  </button>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex-1 flex items-center justify-center h-full"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  {content}
                </Link>
              )
            })}
          </div>
        </div>
      ) : null
    })()}
    </>
  )
}
