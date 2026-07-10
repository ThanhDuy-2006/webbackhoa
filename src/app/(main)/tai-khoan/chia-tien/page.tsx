import { getUserRevenueSharesAction } from '@/actions/user/revenue-share.actions'
import { Coins, HelpCircle, ArrowUpRight, ArrowDownRight, Landmark } from 'lucide-react'

export const revalidate = 0

export default async function UserRevenueSharePage() {
  const result = await getUserRevenueSharesAction()
  
  if (!result.success) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
        {result.error || 'Vui lòng đăng nhập để xem lịch sử chia sẻ doanh thu.'}
      </div>
    )
  }

  const shares = result.data || []
  const stats = result.stats || { totalReceived: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Doanh thu chia sẻ</h1>
        <p className="text-slate-500 mt-2">Theo dõi các khoản tiền hoa hồng chia sẻ từ các sản phẩm được phân bổ của bạn.</p>
      </div>

      {/* Overview Stat Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[24px] text-white shadow-md flex items-center justify-between col-span-1 md:col-span-2">
          <div className="space-y-2">
            <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Tổng số dư tích lũy nhận được</span>
            <h2 className="text-3xl md:text-4xl font-black">
              {stats.totalReceived.toLocaleString('vi-VN')} VND
            </h2>
            <p className="text-[11px] text-emerald-100/90 leading-relaxed">
              Tiền được tự động cộng dồn trực tiếp vào số dư ví của bạn mỗi khi có đơn hàng chứa sản phẩm cấu hình hoàn thành.
            </p>
          </div>
          <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center shrink-0">
            <Coins className="h-9 w-9 text-emerald-100" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-slate-400" /> Hướng dẫn rút tiền
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mt-2.5">
              Số dư chia sẻ được tích hợp trực tiếp vào Ví mua hàng. Bạn có thể sử dụng số tiền này để thanh toán các đơn hàng mới hoặc liên hệ ban quản trị để thực hiện rút tiền mặt về tài khoản ngân hàng.
            </p>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm">Lịch sử nhận tiền chi tiết</h3>

        <div className="overflow-x-auto">
          {shares.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Bạn chưa nhận được khoản tiền chia sẻ doanh thu sản phẩm nào.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="py-3 font-bold">Mã Đơn Hàng</th>
                  <th className="py-3 font-bold">Sản phẩm gốc</th>
                  <th className="py-3 font-bold">Người duyệt chia</th>
                  <th className="py-3 font-bold">Số tiền</th>
                  <th className="py-3 font-bold">Tỷ lệ</th>
                  <th className="py-3 font-bold">Trạng thái</th>
                  <th className="py-3 font-bold text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shares.map((item: any) => {
                  const date = new Date(item.created_at).toLocaleString('vi-VN')
                  const isReversal = item.status === 'reversed'

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-mono font-bold text-slate-700">{item.order_code_snapshot}</td>
                      <td className="py-3.5 font-semibold text-slate-800">{item.product_name_snapshot}</td>
                      <td className="py-3.5 text-slate-500">{item.admin_name_snapshot}</td>
                      <td className="py-3.5">
                        <span className="flex items-center gap-1">
                          {isReversal ? (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                          <strong className={`font-mono font-bold ${isReversal ? 'text-red-500' : 'text-emerald-600'}`}>
                            {isReversal ? '' : '+'}{item.amount.toLocaleString('vi-VN')}đ
                          </strong>
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500">{item.percentage ? `${item.percentage}%` : '-'}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isReversal ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {isReversal ? 'THU HỒI' : 'THÀNH CÔNG'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-slate-400 font-medium">{date}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
