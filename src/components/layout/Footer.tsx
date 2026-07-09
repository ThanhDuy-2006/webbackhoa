import Link from 'next/link'
import { Package, MapPin, Phone, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-16 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <Package className="h-8 w-8 text-emerald-600" />
              <span className="font-extrabold text-2xl text-slate-900 tracking-tight">Bách Hóa</span>
            </Link>
            <p className="text-base text-slate-500 mb-8 max-w-sm leading-relaxed">
              Hệ thống siêu thị thực phẩm trực tuyến hàng đầu, mang đến rau củ quả tươi sạch và thực phẩm an toàn mỗi ngày cho gia đình bạn.
            </p>
            <div className="flex gap-4">
              <a href="#" className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                FB
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                IG
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                X
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                YT
              </a>
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Về Bách Hóa</h4>
            <ul className="space-y-4 text-slate-500">
              <li><Link href="/gioi-thieu" className="hover:text-emerald-600 transition-colors">Giới thiệu công ty</Link></li>
              <li><Link href="/tuyen-dung" className="hover:text-emerald-600 transition-colors">Tuyển dụng</Link></li>
              <li><Link href="/dieu-khoan" className="hover:text-emerald-600 transition-colors">Điều khoản sử dụng</Link></li>
              <li><Link href="/chinh-sach-bao-mat" className="hover:text-emerald-600 transition-colors">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Hỗ trợ khách hàng</h4>
            <ul className="space-y-4 text-slate-500">
              <li><Link href="/faq" className="hover:text-emerald-600 transition-colors">Câu hỏi thường gặp</Link></li>
              <li><Link href="/huong-dan-mua-hang" className="hover:text-emerald-600 transition-colors">Hướng dẫn mua hàng</Link></li>
              <li><Link href="/chinh-sach-bao-hanh" className="hover:text-emerald-600 transition-colors">Chính sách bảo hành</Link></li>
              <li><Link href="/chinh-sach-doi-tra" className="hover:text-emerald-600 transition-colors">Chính sách đổi trả</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Liên hệ</h4>
            <ul className="space-y-4 text-slate-500">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">123 Đường Số 1, Phường An Phú, Quận 2, TP.HCM</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                <span>1900 1234</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                <span>support@bachhoa.vn</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Bách Hóa. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-3">
            {/* Fake Payment Icons */}
            <div className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-blue-800 bg-white">VISA</div>
            <div className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-orange-500 bg-white">MasterCard</div>
            <div className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-pink-600 bg-white">MoMo</div>
            <div className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 bg-white">COD</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
