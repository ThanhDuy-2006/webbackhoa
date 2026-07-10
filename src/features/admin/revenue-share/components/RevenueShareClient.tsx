'use client'

import { useState, useEffect } from 'react'
import { 
  saveRevenueRuleAction, 
  deleteRevenueRuleAction, 
  copyRevenueRuleAction, 
  getRevenueSharesHistoryAction,
  getRevenueShareStatsAction,
  getRevenueRulesAction
} from '@/actions/admin/revenue-share.actions'
import { toast } from 'sonner'
import { 
  Coins, Percent, Landmark, Plus, Trash2, Edit2, Copy, Download, Search, 
  Filter, Calendar, DollarSign, Users, Award, TrendingUp, X, Check, CheckSquare, Square
} from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
}

interface Variant {
  id: string
  name: string
  price: number | null
  product_id: string
}

interface User {
  id: string
  full_name: string | null
  email: string
}

interface Rule {
  id: string
  product_id?: string | null
  variant_id?: string | null
  sharing_method: 'equal' | 'percentage' | 'fixed'
  status: 'draft' | 'active' | 'paused' | 'expired'
  start_date?: string | null
  end_date?: string | null
  products?: { id: string; name: string; price: number } | null
  product_variants?: { id: string; name: string; price: number | null; product_id: string } | null
  recipients: {
    id: string
    rule_id: string
    user_id: string
    percentage: number | null
    fixed_amount: number | null
    profiles?: { id: string; full_name: string | null; email: string } | null
  }[]
}

interface Props {
  products: Product[]
  variants: Variant[]
  users: User[]
  initialRules: Rule[]
}

export function RevenueShareClient({ products, variants, users, initialRules }: Props) {
  // State lists
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  
  // Stats state
  const [stats, setStats] = useState({
    totalAmount: 0,
    todayAmount: 0,
    thisMonthAmount: 0,
    topProducts: [] as { name: string; amount: number }[],
    topRecipients: [] as { id: string; name: string; amount: number }[]
  })

  // Filter states
  const [filterProductId, setFilterProductId] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterOrderCode, setFilterOrderCode] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [sharingMethod, setSharingMethod] = useState<'equal' | 'percentage' | 'fixed'>('equal')
  const [ruleStatus, setRuleStatus] = useState<'draft' | 'active' | 'paused' | 'expired'>('active')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Recipient form states
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState<{
    user_id: string
    percentage?: number
    fixed_amount?: number
  }[]>([])

  // Copy rule states
  const [copyingRule, setCopyingRule] = useState<Rule | null>(null)
  const [copyTargetProductId, setCopyTargetProductId] = useState('')
  const [copyTargetVariantId, setCopyTargetVariantId] = useState('')

  // Live preview reference calculation values
  const [previewPrice, setPreviewPrice] = useState(100000)
  const [previewQty, setPreviewQty] = useState(1)
  const [previewDiscount, setPreviewDiscount] = useState(0)

  // Fetch stats and history
  const loadStatsAndHistory = async () => {
    setHistoryLoading(true)
    const statsRes = await getRevenueShareStatsAction()
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data)
    }

    const historyRes = await getRevenueSharesHistoryAction({
      productId: filterProductId || undefined,
      userId: filterUserId || undefined,
      orderCode: filterOrderCode || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined
    })

    if (historyRes.success && historyRes.data) {
      setHistory(historyRes.data)
    }
    setHistoryLoading(false)
  }

  useEffect(() => {
    loadStatsAndHistory()
  }, [filterProductId, filterUserId, filterOrderCode, filterStartDate, filterEndDate])

  // Get matching variants for selected product
  const availableVariants = variants.filter(v => v.product_id === selectedProductId)

  // Recipient operations
  const handleToggleUser = (userId: string) => {
    const exists = selectedRecipients.some(r => r.user_id === userId)
    if (exists) {
      setSelectedRecipients(selectedRecipients.filter(r => r.user_id !== userId))
    } else {
      setSelectedRecipients([...selectedRecipients, {
        user_id: userId,
        percentage: sharingMethod === 'percentage' ? Math.round(100 / (selectedRecipients.length + 1)) : undefined,
        fixed_amount: sharingMethod === 'fixed' ? 10000 : undefined
      }])
    }
  }

  const handleUpdateRecipientValue = (userId: string, field: 'percentage' | 'fixed_amount', value: number) => {
    setSelectedRecipients(selectedRecipients.map(r => {
      if (r.user_id === userId) {
        return { ...r, [field]: value }
      }
      return r
    }))
  }

  // Auto-allocate percentages equally if method switches or recipients change
  const redistributePercentages = () => {
    if (selectedRecipients.length === 0) return
    const equalShare = Math.floor(100 / selectedRecipients.length)
    let remainder = 100 - (equalShare * selectedRecipients.length)
    
    setSelectedRecipients(selectedRecipients.map((r, i) => ({
      ...r,
      percentage: equalShare + (i === 0 ? remainder : 0) // Give remainder to first recipient
    })))
  }

  // Verify and submit form
  const handleSaveRule = async () => {
    if (!selectedProductId && !selectedVariantId) {
      return toast.error('Vui lòng chọn sản phẩm hoặc phân loại')
    }
    if (selectedRecipients.length === 0) {
      return toast.error('Vui lòng chọn ít nhất một người nhận')
    }

    if (sharingMethod === 'percentage') {
      const totalPct = selectedRecipients.reduce((sum, r) => sum + (r.percentage || 0), 0)
      if (Math.round(totalPct) !== 100) {
        return toast.error('Tổng tỷ lệ chia phải bằng đúng 100%')
      }
    } else if (sharingMethod === 'fixed') {
      for (const r of selectedRecipients) {
        if (!r.fixed_amount || r.fixed_amount <= 0) {
          return toast.error('Số tiền cố định của mỗi người nhận phải lớn hơn 0')
        }
      }
    }

    setLoading(true)
    const ruleData = {
      id: editingRuleId || undefined,
      product_id: selectedVariantId ? null : selectedProductId,
      variant_id: selectedVariantId || null,
      sharing_method: sharingMethod,
      status: ruleStatus,
      start_date: startDate || null,
      end_date: endDate || null,
      recipients: selectedRecipients.map(r => ({
        user_id: r.user_id,
        percentage: sharingMethod === 'percentage' ? r.percentage : null,
        fixed_amount: sharingMethod === 'fixed' ? r.fixed_amount : null
      }))
    }

    const res = await saveRevenueRuleAction(ruleData)
    setLoading(false)

    if (res.success) {
      toast.success(editingRuleId ? 'Cập nhật cấu hình thành công!' : 'Tạo cấu hình chia tiền thành công!')
      // Refresh list
      const rulesRes = await getRevenueRulesAction()
      if (rulesRes.success && rulesRes.data) {
        setRules(rulesRes.data)
      }
      loadStatsAndHistory()
      handleCloseForm()
    } else {
      toast.error(res.error || 'Có lỗi xảy ra')
    }
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRuleId(rule.id)
    setSelectedProductId(rule.product_id || '')
    setSelectedVariantId(rule.variant_id || '')
    setSharingMethod(rule.sharing_method)
    setRuleStatus(rule.status)
    setStartDate(rule.start_date ? rule.start_date.substring(0, 16) : '')
    setEndDate(rule.end_date ? rule.end_date.substring(0, 16) : '')
    
    setSelectedRecipients(rule.recipients.map(r => ({
      user_id: r.user_id,
      percentage: r.percentage || undefined,
      fixed_amount: r.fixed_amount || undefined
    })))
    
    setShowForm(true)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa luật chia sẻ doanh thu này?')) return

    setLoading(true)
    const res = await deleteRevenueRuleAction(id)
    setLoading(false)

    if (res.success) {
      toast.success('Xóa cấu hình thành công')
      setRules(rules.filter(r => r.id !== id))
      loadStatsAndHistory()
    } else {
      toast.error(res.error)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRuleId(null)
    setSelectedProductId('')
    setSelectedVariantId('')
    setSharingMethod('equal')
    setRuleStatus('active')
    setStartDate('')
    setEndDate('')
    setSelectedRecipients([])
    setSearchUserQuery('')
  }

  // Copy rule functionality
  const handleConfirmCopy = async () => {
    if (!copyingRule) return
    if (!copyTargetProductId && !copyTargetVariantId) {
      return toast.error('Vui lòng chọn sản phẩm hoặc phân loại đích để sao chép')
    }

    setLoading(true)
    const res = await copyRevenueRuleAction(copyingRule.id, {
      product_id: copyTargetVariantId ? null : copyTargetProductId,
      variant_id: copyTargetVariantId || null
    })
    setLoading(false)

    if (res.success) {
      toast.success('Sao chép cấu hình chia tiền thành công!')
      // Refresh list
      const rulesRes = await getRevenueRulesAction()
      if (rulesRes.success && rulesRes.data) {
        setRules(rulesRes.data)
      }
      setCopyingRule(null)
      setCopyTargetProductId('')
      setCopyTargetVariantId('')
    } else {
      toast.error(res.error)
    }
  }

  // CSV Export
  const handleExportCSV = () => {
    if (history.length === 0) return toast.info('Không có dữ liệu lịch sử để xuất')
    
    const headers = 'STT,Ma Don Hang,San Pham,Nguoi Nhan,So Tien Nhan,Ty Le,Trang Thai,Thoi Gian\n'
    const rows = history.map((h, i) => {
      const date = new Date(h.created_at).toLocaleString('vi-VN')
      return `${i + 1},${h.order_code_snapshot},"${h.product_name_snapshot}","${h.recipient_name_snapshot}",${h.amount},${h.percentage || ''},${h.status === 'completed' ? 'Thanh cong' : 'Thu hoi'},"${date}"`
    }).join('\n')

    // UTF-8 BOM to prevent excel Vietnamese font crash
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `lich-su-chia-tien-bach-hoa-${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
  }

  // Live preview calculation helper
  const getPreviewCalculations = () => {
    const netAmount = Math.max(0, (previewPrice * previewQty) - previewDiscount)
    const results = selectedRecipients.map(r => {
      const user = users.find(u => u.id === r.user_id)
      const name = user ? (user.full_name || user.email) : 'Người dùng ẩn danh'
      
      let amount = 0
      let displayPct = 0

      if (sharingMethod === 'equal') {
        displayPct = selectedRecipients.length > 0 ? (100 / selectedRecipients.length) : 0
        amount = selectedRecipients.length > 0 ? (netAmount / selectedRecipients.length) : 0
      } else if (sharingMethod === 'percentage') {
        displayPct = r.percentage || 0
        amount = netAmount * (displayPct / 100)
      } else if (sharingMethod === 'fixed') {
        amount = (r.fixed_amount || 0) * previewQty
        displayPct = netAmount > 0 ? (amount / netAmount) * 100 : 0
      }

      return {
        userId: r.user_id,
        name,
        percentage: displayPct.toFixed(1) + '%',
        amount: Math.round(amount)
      }
    })

    const totalShared = results.reduce((sum, res) => sum + res.amount, 0)
    const totalPercentage = sharingMethod === 'percentage' 
      ? selectedRecipients.reduce((sum, r) => sum + (r.percentage || 0), 0)
      : parseFloat(results.reduce((sum, res) => sum + parseFloat(res.percentage), 0).toFixed(1))

    return {
      netAmount,
      results,
      totalShared,
      totalPercentage
    }
  }

  const preview = getPreviewCalculations()

  return (
    <div className="space-y-8">
      {/* 1. Statistics drill-down dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Overview stats */}
        <div className="space-y-6 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hôm nay</span>
              <h3 className="text-2xl font-black text-slate-800 mt-2">
                {stats.todayAmount.toLocaleString('vi-VN')}đ
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-extrabold mt-4">
              <TrendingUp className="h-4 w-4" /> Hoạt động chia sẻ 24h
            </div>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tháng này</span>
              <h3 className="text-2xl font-black text-slate-800 mt-2">
                {stats.thisMonthAmount.toLocaleString('vi-VN')}đ
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 text-xs font-extrabold mt-4">
              <Calendar className="h-4 w-4" /> Tổng tháng này
            </div>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng tiền tích lũy</span>
              <h3 className="text-2xl font-black text-slate-800 mt-2">
                {stats.totalAmount.toLocaleString('vi-VN')}đ
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-extrabold mt-4">
              <Coins className="h-4 w-4" /> Thực nhận sau hoàn/hủy
            </div>
          </div>
        </div>

        {/* Right column: top list */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" /> Nhận tiền nhiều nhất
            </h4>
            <div className="mt-3 space-y-2">
              {stats.topRecipients.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu</p>
              ) : (
                stats.topRecipients.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => setFilterUserId(tr.id)}
                    className="w-full flex items-center justify-between text-left p-1.5 rounded-lg hover:bg-slate-50 transition-all group"
                  >
                    <span className="text-xs font-medium text-slate-700 group-hover:text-emerald-600 truncate max-w-[120px]">
                      {tr.name}
                    </span>
                    <strong className="text-xs text-slate-900 font-bold font-mono">
                      +{tr.amount.toLocaleString('vi-VN')}đ
                    </strong>
                  </button>
                ))
              )}
            </div>
          </div>
          {filterUserId && (
            <button 
              onClick={() => setFilterUserId('')} 
              className="text-[10px] text-red-500 font-bold hover:underline self-end flex items-center gap-0.5 mt-2"
            >
              <X className="h-3 w-3" /> Bỏ lọc drill-down
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Products list */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm md:col-span-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Sản phẩm tạo doanh thu nhiều nhất
          </h4>
          <div className="space-y-3">
            {stats.topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Chưa có dữ liệu thống kê sản phẩm</p>
            ) : (
              stats.topProducts.map((tp, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-b-0">
                  <span className="text-xs text-slate-600 truncate max-w-[180px]">{tp.name}</span>
                  <strong className="text-xs text-slate-800 font-bold font-mono">{tp.amount.toLocaleString('vi-VN')}đ</strong>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Existing rules listing */}
        <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm md:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-sm">Danh sách Luật chia tiền</h3>
            <button 
              onClick={() => setShowForm(true)} 
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thiết lập mới
            </button>
          </div>

          <div className="overflow-x-auto">
            {rules.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Chưa có luật chia tiền nào được thiết lập.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="py-2.5 font-bold">Đối tượng áp dụng</th>
                    <th className="py-2.5 font-bold">Phương thức</th>
                    <th className="py-2.5 font-bold">Trạng thái</th>
                    <th className="py-2.5 font-bold">Người nhận</th>
                    <th className="py-2.5 text-right font-bold">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rules.map((rule) => {
                    const isProduct = !!rule.product_id
                    const name = isProduct 
                      ? rule.products?.name || 'Sản phẩm đã bị xóa'
                      : `${rule.product_variants?.name} (Phân loại)`
                    
                    const method = rule.sharing_method === 'equal' ? 'Chia đều' 
                      : rule.sharing_method === 'percentage' ? 'Tỷ lệ %' 
                      : 'Số tiền cố định'

                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-semibold text-slate-800 truncate max-w-[140px]" title={name}>
                          {name}
                        </td>
                        <td className="py-3 text-slate-600">{method}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rule.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            rule.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                            rule.status === 'paused' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {rule.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 font-mono text-[11px]">
                          {rule.recipients.length} thành viên
                        </td>
                        <td className="py-3 text-right space-x-1">
                          <button 
                            onClick={() => setCopyingRule(rule)} 
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" 
                            title="Sao chép cấu hình"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleEditRule(rule)} 
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors" 
                            title="Sửa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteRule(rule.id)} 
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors" 
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 3. Setup/Edit rule Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                {editingRuleId ? 'Cập nhật cấu hình chia tiền' : 'Thiết lập luật chia tiền sản phẩm'}
              </h3>
              <button onClick={handleCloseForm} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Rule Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Chọn sản phẩm gốc *</label>
                  <select 
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value)
                      setSelectedVariantId('') // reset variant when product changes
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString('vi-VN')}đ)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Áp dụng cho Phân loại (Tùy chọn - Độ ưu tiên cao hơn)</label>
                  <select 
                    value={selectedVariantId}
                    disabled={!selectedProductId || availableVariants.length === 0}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="">-- Áp dụng cho cả sản phẩm (Không chọn phân loại) --</option>
                    {availableVariants.map(v => (
                      <option key={v.id} value={v.id}>{v.name} {v.price ? `(${v.price.toLocaleString('vi-VN')}đ)` : ''}</option>
                    ))}
                  </select>
                  {selectedProductId && availableVariants.length === 0 && (
                    <p className="text-[10px] text-slate-400">Sản phẩm này không có phân loại biến thể</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Phương thức chia tiền *</label>
                    <select 
                      value={sharingMethod}
                      onChange={(e) => {
                        const val = e.target.value as any
                        setSharingMethod(val)
                        // Trigger recalculate or defaults on method change
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="equal">Chia đều (Equal)</option>
                      <option value="percentage">Chia theo % (Percentage)</option>
                      <option value="fixed">Số tiền cố định (Fixed)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Trạng thái *</label>
                    <select 
                      value={ruleStatus}
                      onChange={(e) => setRuleStatus(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="draft">Bản nháp (Draft)</option>
                      <option value="active">Đang kích hoạt (Active)</option>
                      <option value="paused">Tạm dừng (Paused)</option>
                      <option value="expired">Hết hạn (Expired)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Ngày bắt đầu</label>
                    <input 
                      type="datetime-local" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Ngày kết thúc</label>
                    <input 
                      type="datetime-local" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Recipient select with search */}
                <div className="space-y-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Chọn thành viên nhận tiền *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Tìm thành viên theo tên/email..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950/50 space-y-1.5 custom-scrollbar">
                    {users
                      .filter(u => 
                        !searchUserQuery || 
                        (u.full_name && u.full_name.toLowerCase().includes(searchUserQuery.toLowerCase())) ||
                        u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
                      )
                      .map(u => {
                        const isSelected = selectedRecipients.some(r => r.user_id === u.id)
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => handleToggleUser(u.id)}
                            className="w-full flex items-center justify-between text-left p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-all text-xs"
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {u.full_name || 'Không tên'} <span className="text-[10px] text-slate-400">({u.email})</span>
                            </span>
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300" />
                            )}
                          </button>
                        )
                      })}
                  </div>
                </div>
              </div>

              {/* Right Column: Preview and Recipient Config */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 border-b pb-1">Cấu hình chi tiết & Xem trước</h4>
                  
                  {selectedRecipients.length === 0 ? (
                    <div className="h-48 border border-dashed rounded-2xl flex items-center justify-center text-slate-400 text-xs text-center p-4">
                      Vui lòng chọn thành viên nhận tiền để hiển thị cấu hình & xem trước
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Recipient values entry */}
                      <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                        {selectedRecipients.map(r => {
                          const user = users.find(u => u.id === r.user_id)
                          return (
                            <div key={r.user_id} className="flex items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                {user?.full_name || user?.email || 'Thành viên'}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {sharingMethod === 'percentage' && (
                                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border px-2 py-1 rounded-lg">
                                    <input 
                                      type="number" 
                                      min="1"
                                      max="100"
                                      value={r.percentage || ''}
                                      onChange={(e) => handleUpdateRecipientValue(r.user_id, 'percentage', Number(e.target.value))}
                                      className="w-10 text-center font-bold text-slate-800 dark:text-slate-200 outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400">%</span>
                                  </div>
                                )}

                                {sharingMethod === 'fixed' && (
                                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border px-2 py-1 rounded-lg">
                                    <input 
                                      type="number" 
                                      min="1000"
                                      step="1000"
                                      value={r.fixed_amount || ''}
                                      onChange={(e) => handleUpdateRecipientValue(r.user_id, 'fixed_amount', Number(e.target.value))}
                                      className="w-16 text-center font-bold text-slate-800 dark:text-slate-200 outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400">đ</span>
                                  </div>
                                )}

                                <button 
                                  type="button" 
                                  onClick={() => handleToggleUser(r.user_id)} 
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Live preview calculator */}
                      <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/30 space-y-3">
                        <div className="flex items-center justify-between text-[11px] border-b pb-2 border-emerald-100/50">
                          <span className="font-extrabold text-emerald-800 dark:text-emerald-400">XEM TRƯỚC PHÂN BỔ</span>
                          <span className="font-bold text-slate-500">Giả định: 100k/sản phẩm</span>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          {preview.results.map(res => (
                            <div key={res.userId} className="flex justify-between">
                              <span className="text-slate-500">{res.name} ({res.percentage}):</span>
                              <strong className="text-slate-800 dark:text-slate-200">+{res.amount.toLocaleString('vi-VN')}đ</strong>
                            </div>
                          ))}
                          <div className="border-t border-dashed my-2 pt-1 flex justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>Tổng chia ({preview.totalPercentage}%):</span>
                            <span>{preview.totalShared.toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 border-t pt-4 border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={handleCloseForm}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveRule}
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {loading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Copy configuration Dialog */}
      {copyingRule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 text-md">Sao chép cấu hình chia tiền</h3>
              <button onClick={() => setCopyingRule(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn đang sao chép cấu hình chia tiền (cùng danh sách người nhận và phương thức) từ sản phẩm/phân loại gốc. Vui lòng chọn đích sao chép:
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Sản phẩm đích *</label>
                <select
                  value={copyTargetProductId}
                  onChange={(e) => {
                    setCopyTargetProductId(e.target.value)
                    setCopyTargetVariantId('')
                  }}
                  className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Phân loại đích (Tùy chọn)</label>
                <select
                  value={copyTargetVariantId}
                  disabled={!copyTargetProductId}
                  onChange={(e) => setCopyTargetVariantId(e.target.value)}
                  className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs disabled:opacity-50"
                >
                  <option value="">-- Áp dụng cả sản phẩm --</option>
                  {variants.filter(v => v.product_id === copyTargetProductId).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button 
                type="button" 
                onClick={() => setCopyingRule(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button 
                type="button" 
                onClick={handleConfirmCopy}
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Xác nhận Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. History table with filters */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 border-slate-100 gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Lịch sử chia sẻ doanh thu thực tế</h3>
            <p className="text-xs text-slate-400 mt-0.5">Lịch sử các giao dịch hoàn thành và không thể xóa bỏ sửa đổi.</p>
          </div>
          <button 
            onClick={handleExportCSV} 
            disabled={history.length === 0}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <Download className="h-4 w-4" /> Xuất file CSV
          </button>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Product filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sản phẩm</label>
            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              className="w-full bg-slate-50 border p-2 rounded-xl text-xs"
            >
              <option value="">Tất cả sản phẩm</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thành viên nhận</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full bg-slate-50 border p-2 rounded-xl text-xs"
            >
              <option value="">Tất cả thành viên</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Order code search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã đơn hàng</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã đơn..."
                value={filterOrderCode}
                onChange={(e) => setFilterOrderCode(e.target.value)}
                className="w-full bg-slate-50 border pl-8 pr-3 py-1.5 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Date range start */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Từ ngày</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-50 border p-1.5 rounded-xl text-xs"
            />
          </div>

          {/* Date range end */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đến ngày</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-50 border p-1.5 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <span className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
              Đang tải dữ liệu...
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">Không tìm thấy bản ghi lịch sử nào khớp bộ lọc.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="py-3 font-bold">Mã Đơn Hàng</th>
                  <th className="py-3 font-bold">Sản phẩm</th>
                  <th className="py-3 font-bold">Người nhận</th>
                  <th className="py-3 font-bold">Số tiền nhận</th>
                  <th className="py-3 font-bold">Tỷ lệ chia</th>
                  <th className="py-3 font-bold">Trạng thái</th>
                  <th className="py-3 font-bold text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((item) => {
                  const date = new Date(item.created_at).toLocaleString('vi-VN')
                  const isReversal = item.status === 'reversed'

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-mono font-bold text-slate-700">{item.order_code_snapshot}</td>
                      <td className="py-3.5 font-medium text-slate-800">{item.product_name_snapshot}</td>
                      <td className="py-3.5 text-slate-700">{item.recipient_name_snapshot}</td>
                      <td className="py-3.5">
                        <strong className={`font-mono font-black ${isReversal ? 'text-red-500' : 'text-emerald-600'}`}>
                          {isReversal ? '' : '+'}{item.amount.toLocaleString('vi-VN')}đ
                        </strong>
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
