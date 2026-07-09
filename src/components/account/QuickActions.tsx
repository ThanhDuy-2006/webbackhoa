import Link from 'next/link'
import { User, Lock, MapPin, ShoppingBag, CreditCard, HeadphonesIcon } from 'lucide-react'

export function QuickActions() {
  const actions = [
    { label: 'Chỉnh sửa hồ sơ', href: '/tai-khoan', icon: User },
    { label: 'Đổi mật khẩu', href: '/tai-khoan/mat-khau', icon: Lock },
    { label: 'Quản lý địa chỉ', href: '/tai-khoan/dia-chi', icon: MapPin },
    { label: 'Xem đơn hàng', href: '/tai-khoan/don-hang', icon: ShoppingBag },
    { label: 'Nạp tiền', href: '/tai-khoan/nap-tien', icon: CreditCard },
    { label: 'Liên hệ hỗ trợ', href: '#', icon: HeadphonesIcon },
  ]

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 md:p-8 h-full">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Thao tác nhanh</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon
          return (
            <Link
              key={idx}
              href={action.href}
              className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors gap-3 group text-center"
            >
              <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
