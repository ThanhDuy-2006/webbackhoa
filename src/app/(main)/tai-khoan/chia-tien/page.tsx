'use client'

import { useState, useEffect } from 'react'
import { getUserRevenueSharesAction, getRevenueShareDetailAction } from '@/actions/user/revenue-share.actions'
import { Coins, HelpCircle, ArrowUpRight, ArrowDownRight, Search, X, Loader2 } from 'lucide-react'

export default function UserRevenueSharePage() {
  const [shares, setShares] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ totalReceived: 0 })
  const [loading, setLoading] = useState(true)

  // Detail Modal states
  const [selectedShare, setSelectedShare] = useState<any | null>(null)
  const [coShares, setCoShares] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadShares = async () => {
    setLoading(true)
    const res = await getUserRevenueSharesAction()
    if (res.success && res.data) {
      setShares(res.data)
      setStats(res.stats || { totalReceived: 0 })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadShares()
  }, [])

  const handleRowClick = async (share: any) => {
    setSelectedShare(share)
    setCoShares([])
    setDetailLoading(true)

    const res = await getRevenueShareDetailAction(share.order_item_id)
    if (res.success && res.data) {
      setCoShares(res.data)
    }
    setDetailLoading(false)
  }

  // Filtered list
  const filteredShares = shares.filter(s => 
    !searchQuery ||
    s.order_code_snapshot.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.product_name_snapshot.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 text-sm bg-white rounded-2xl border">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
        Đang tải thông tin chia sẻ doanh thu...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Khấu trừ chi phí</h1>
        <p className="text-slate-500 mt-2">Theo dõi các khoản tiền chi phí sản phẩm đã được phân bổ và khấu trừ từ số dư của bạn.</p>
      </div>

      {/* Overview Stat Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[24px] text-white shadow-md flex items-center justify-between col-span-1 md:col-span-2">
          <div className="space-y-2">
            <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Tổng chi phí sản phẩm đã khấu trừ</span>
            <h2 className="text-3xl md:text-4xl font-black">
              {stats.totalReceived.toLocaleString('vi-VN')} VND
            </h2>
            <p className="text-[11px] text-emerald-100/90 leading-relaxed font-medium">
              Tiền chi phí sản phẩm được tự động trừ trực tiếp vào số dư ví của bạn mỗi khi có đơn hàng chứa sản phẩm cấu hình hoàn thành.
            </p>
          </div>
          <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center shrink-0">
            <Coins className="h-9 w-9 text-emerald-100" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-slate-400" /> Thông tin khấu trừ
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mt-2.5">
              Chi phí sản phẩm được tự động trừ vào số dư ví của bạn. Vui lòng nạp đủ số dư để không bị gián đoạn hoặc âm quỹ tài khoản.
            </p>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-extrabold text-slate-800 text-sm">Lịch sử trừ tiền chi tiết</h3>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm/đơn hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border pl-9 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredShares.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Không tìm thấy giao dịch nào.
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
                {filteredShares.map((item: any) => {
                  const date = new Date(item.created_at).toLocaleString('vi-VN')
                  const isReversal = item.status === 'reversed'

                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => handleRowClick(item)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      title="Nhấn để xem chi tiết cách phân bổ"
                    >
                      <td className="py-3.5 font-mono font-bold text-slate-700">{item.order_code_snapshot}</td>
                      <td className="py-3.5 font-semibold text-slate-800">{item.product_name_snapshot}</td>
                      <td className="py-3.5 text-slate-500">{item.admin_name_snapshot}</td>
                      <td className="py-3.5">
                        <span className="flex items-center gap-1">
                          {item.amount < 0 ? (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                          <strong className={`font-mono font-bold ${item.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString('vi-VN')}đ
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

      {/* DETAIL DRILL-DOWN REPORT MODAL */}
      {selectedShare && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 space-y-5 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Chi tiết khấu trừ chi phí</h3>
              <button onClick={() => setSelectedShare(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b pb-2 border-slate-50">
                <span className="text-slate-400">Mã Đơn Hàng:</span>
                <strong className="text-slate-800 font-mono">{selectedShare.order_code_snapshot}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50">
                <span className="text-slate-400">Sản phẩm:</span>
                <strong className="text-slate-800 text-right max-w-[200px] truncate">{selectedShare.product_name_snapshot}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50">
                <span className="text-slate-400">Số tiền bị trừ:</span>
                <strong className={`font-mono font-black ${selectedShare.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {selectedShare.amount > 0 ? '+' : ''}{selectedShare.amount.toLocaleString('vi-VN')} VND
                </strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-slate-50">
                <span className="text-slate-400">Thời gian duyệt:</span>
                <span className="text-slate-600">{new Date(selectedShare.created_at).toLocaleString('vi-VN')}</span>
              </div>

              {/* Drill-down of all co-recipients splits */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 mb-2">Phân chia toàn đơn (Chi tiết co-recipients)</h4>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  {detailLoading ? (
                    <div className="flex items-center justify-center gap-1.5 py-4 text-slate-400 text-[10px]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      Đang tải danh sách phân bổ...
                    </div>
                  ) : coShares.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2">Không có thêm thông tin phân bổ</p>
                  ) : (
                    coShares.map((co: any) => (
                      <div key={co.id} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 font-semibold">{co.recipient_name_snapshot}</span>
                        <strong className="text-slate-700 font-mono">
                          {co.amount >= 0 ? '+' : ''}{co.amount.toLocaleString('vi-VN')}đ {co.percentage ? `(${co.percentage}%)` : ''}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button 
                onClick={() => setSelectedShare(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
