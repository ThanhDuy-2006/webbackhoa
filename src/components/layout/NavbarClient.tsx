'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ShoppingCart, 
  User as UserIcon, 
  LogOut, 
  Package, 
  Settings, 
  Wallet, 
  ShoppingBag, 
  Sprout, 
  Trophy, 
  Store, 
  Camera, 
  Landmark 
} from 'lucide-react'
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
import { logout } from '@/app/login/actions'
import { useCartStore } from '@/store/useCartStore'
import { CartSheet } from './CartSheet'
import { cn } from '@/lib/utils'
import { StorefrontSearch } from './StorefrontSearch'
import { useTheme } from 'next-themes'
import { MorphThemeToggle } from '@/components/ui/morph-icon'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'

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
  const [balance, setBalance] = useState<number>(Number(profile?.balance || 0))

  useEffect(() => {
    setBalance(Number(profile?.balance || 0))
  }, [profile?.balance])

  useEffect(() => {
    const handleBalanceChanged = (e: any) => {
      if (e?.detail?.newBalance !== undefined) {
        setBalance(Number(e.detail.newBalance))
      }
    }
    window.addEventListener('wallet-balance-changed', handleBalanceChanged)
    return () => window.removeEventListener('wallet-balance-changed', handleBalanceChanged)
  }, [])

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const channel = supabase
      .channel(`public:profiles:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new && payload.new.balance !== undefined) {
            setBalance(Number(payload.new.balance))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 5 essential items for Mobile Bottom Navigation
  const mobileNavItems = [
    { name: 'Sản phẩm', href: '/', icon: Package },
    { name: 'Bảng vinh danh', href: '/bang-xep-hang', icon: Trophy },
    { 
      name: 'Quét AI', 
      href: user ? '/tai-khoan/san-pham-cua-toi/import?scan=true' : '/login', 
      icon: Camera, 
      isSpecial: true 
    },
    { name: 'Giỏ hàng', href: '#cart', icon: ShoppingCart, isCart: true },
    { name: 'Tài khoản', href: user ? '/tai-khoan' : '/login', icon: UserIcon },
  ]

  return (
    <>
      <header 
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs' 
            : 'bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex h-[70px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          
          {/* Left: Brand & Primary Links */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group" style={{ minWidth: '44px', minHeight: '44px' }}>
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-200 dark:shadow-none transition-transform group-hover:scale-105 duration-300">
                <Sprout className="h-5 w-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tight hidden sm:inline-block bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                Bách Hóa
              </span>
            </Link>

            <nav className="hidden lg:flex gap-5 items-center text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Link 
                href="/" 
                className={cn(
                  "transition-colors hover:text-emerald-600 dark:hover:text-emerald-400",
                  pathname === '/' ? "text-emerald-600 dark:text-emerald-400" : ""
                )}
              >
                Sản phẩm
              </Link>
              <Link 
                href="/bang-xep-hang" 
                className={cn(
                  "transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5",
                  pathname === '/bang-xep-hang' ? "text-emerald-600 dark:text-emerald-400" : ""
                )}
              >
                <Trophy className="w-4 h-4 text-amber-500" /> 
                Bảng xếp hạng
              </Link>
              <Link 
                href={user ? "/tai-khoan/san-pham-cua-toi/import?scan=true" : "/login"} 
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/80 dark:border-amber-800/80 text-xs font-semibold transition-all"
              >
                <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Quét AI</span>
              </Link>
            </nav>
          </div>

          {/* Center: Storefront Search Bar */}
          <div className="flex-1 max-w-lg mx-2 flex justify-center">
            <StorefrontSearch />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Wallet Pill for logged in users */}
            {user && (
              <Link 
                href="/tai-khoan/nap-tien" 
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-100 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold transition-all shadow-2xs"
                title="Số dư ví của bạn - Bấm để nạp thêm"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{formatCurrency(balance)}</span>
              </Link>
            )}

            {/* Theme Toggle */}
            <MorphThemeToggle 
              theme={theme} 
              onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            />

            {/* Cart Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(true)} 
              className="relative hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full h-10 w-10 transition-colors flex items-center justify-center cursor-pointer text-slate-700 dark:text-slate-200"
              style={{ minWidth: '40px', minHeight: '40px' }}
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </Button>

            {/* User Dropdown or Guest Login */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-1.5 pr-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-left cursor-pointer"
                  style={{ minHeight: '40px' }}
                >
                  <div className="w-7 h-7 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full shrink-0 font-bold text-xs">
                    {(profile?.full_name as string)?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 max-w-[100px] truncate hidden sm:inline-block">
                    {(profile?.full_name as string) || user?.email?.split('@')[0] || 'Tài khoản'}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-lg border-slate-100 dark:border-slate-800 dark:bg-slate-900 p-1.5">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-3 py-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{(profile?.full_name as string) || user?.email || 'Người dùng'}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="my-1" />
                  
                  {profile?.role === 'admin' && (
                    <DropdownMenuItem className="rounded-xl cursor-pointer">
                      <Link href="/admin" className="flex w-full items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Trang quản trị (Admin)</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem className="rounded-xl cursor-pointer">
                    <Link href="/tai-khoan" className="flex w-full items-center text-xs">
                      <UserIcon className="mr-2 h-4 w-4 text-slate-500" />
                      <span>Thông tin tài khoản</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="rounded-xl cursor-pointer">
                    <Link href="/tai-khoan/don-hang" className="flex w-full items-center text-xs">
                      <ShoppingBag className="w-4 h-4 mr-2 text-slate-500" />
                      <span>Đơn mua của tôi</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="rounded-xl cursor-pointer">
                    <Link href="/tai-khoan/san-pham-cua-toi" className="flex w-full items-center text-xs">
                      <Store className="w-4 h-4 mr-2 text-slate-500" />
                      <span>Sản phẩm của tôi</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="rounded-xl cursor-pointer">
                    <Link href="/tai-khoan/nap-tien" className="flex w-full items-center text-xs">
                      <Wallet className="mr-2 h-4 w-4 text-slate-500" />
                      <span>Nạp tiền vào ví</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="rounded-xl cursor-pointer">
                    <Link href="/tai-khoan/rut-tien" className="flex w-full items-center text-xs">
                      <Landmark className="mr-2 h-4 w-4 text-slate-500" />
                      <span>Rút tiền về ngân hàng</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={() => logout()} className="rounded-xl text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 focus:bg-red-50 text-xs font-semibold">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="rounded-xl text-xs font-semibold h-9 px-3.5 hover:bg-slate-100">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register" className="hidden sm:inline-block">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold h-9 px-3.5 shadow-xs">
                    Đăng ký
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
        <CartSheet user={user} profile={profile} />
      </header>

      {/* Mobile Bottom Navigation Bar (5 essential items) */}
      {(() => {
        const isProductDetail = pathname.startsWith('/san-pham/') && pathname.split('/').length > 2
        const isCheckout = pathname === '/thanh-toan'
        const isAuth = pathname === '/login' || pathname === '/register'
        const showBottomNav = !isProductDetail && !isCheckout && !isAuth

        return showBottomNav ? (
          <nav 
            aria-label="Mobile Bottom Navigation"
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
              {mobileNavItems.map((item) => {
                const Icon = item.icon
                const isCart = item.isCart
                const isSpecial = item.isSpecial
                const isActive = isCart ? false : pathname === item.href

                const content = (
                  <span className="relative flex flex-col items-center justify-center w-full h-full text-xs font-medium gap-0.5">
                    {isActive && (
                      <motion.span
                        layoutId="activeTab"
                        className="absolute inset-x-1 inset-y-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div 
                      className={cn(
                        "relative p-1 rounded-xl transition-colors flex items-center justify-center",
                        isSpecial
                          ? "bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          : isActive 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {isCart && cartCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center"
                        >
                          {cartCount}
                        </motion.span>
                      )}
                    </div>
                    <span 
                      className={cn(
                        "text-[10px] font-medium tracking-tight truncate max-w-[64px] text-center",
                        isSpecial 
                          ? "text-amber-700 dark:text-amber-400 font-semibold"
                          : isActive 
                            ? "text-emerald-700 dark:text-emerald-300 font-bold" 
                            : "text-slate-500 dark:text-slate-400"
                      )}
                    >
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
                      aria-label="Mở giỏ hàng"
                    >
                      {content}
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex-1 flex items-center justify-center h-full focus:outline-none"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                    aria-label={item.name}
                  >
                    {content}
                  </Link>
                )
              })}
            </div>
          </nav>
        ) : null
      })()}
    </>
  )
}
