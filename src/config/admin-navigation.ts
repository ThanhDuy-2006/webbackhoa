import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Landmark, 
  Percent, 
  Database, 
  Settings 
} from 'lucide-react'

export interface AdminNavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface AdminNavSection {
  title: string
  items: AdminNavItem[]
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: 'TỔNG QUAN',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ]
  },
  {
    title: 'KINH DOANH',
    items: [
      { name: 'Sản phẩm', href: '/admin/products', icon: Package },
      { name: 'Danh mục', href: '/admin/categories', icon: Tags },
      { name: 'Đơn hàng', href: '/admin/orders', icon: ShoppingBag },
    ]
  },
  {
    title: 'NGƯỜI DÙNG',
    items: [
      { name: 'Khách hàng', href: '/admin/users', icon: Users },
    ]
  },
  {
    title: 'TÀI CHÍNH',
    items: [
      { name: 'Duyệt nạp tiền', href: '/admin/topups', icon: CreditCard },
      { name: 'Duyệt rút tiền', href: '/admin/withdrawals', icon: Landmark },
      { name: 'Chia tiền sản phẩm', href: '/admin/revenue-share', icon: Percent },
    ]
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { name: 'Dọn dẹp Database', href: '/admin/settings/database', icon: Database },
      { name: 'Cài đặt hệ thống', href: '/admin/settings', icon: Settings },
    ]
  }
]
