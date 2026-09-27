import Link from 'next/link'
import { Sprout } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Mission */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xs">
                <Sprout className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                Bách Hóa
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Hệ thống quản lý thực phẩm, theo dõi tồn kho và chia sẻ đồ dùng gia đình tiện lợi.
            </p>
          </div>

          {/* Quick Real Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Sản phẩm
            </Link>
            <Link href="/bang-xep-hang" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Bảng xếp hạng
            </Link>
            <Link href="/quet-hoa-don" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Quét AI
            </Link>
            <Link href="/tai-khoan" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Tài khoản
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center md:text-right">
            <p>© {new Date().getFullYear()} Bách Hóa. Mọi quyền được bảo lưu.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
