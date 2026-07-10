'use client'

import React, { useState, useEffect } from 'react'
import { 
  getRevenueSharesHistoryAction,
  getRevenueShareStatsAction,
  getRevenueRulesAction,
  rollbackRevenueShareAction,
  updateUserRevenueRoleAction,
  getFailedSharingOrdersAction,
  retryOrderRevenueSharingAction,
  executeDirectCostSplitAction
} from '@/actions/admin/revenue-share.actions'
import { toast } from 'sonner'
import { 
  Coins, Percent, Landmark, Plus, Trash2, Edit2, Copy, Download, Search, 
  Calendar, DollarSign, Users, Award, TrendingUp, X, Check, Shield, Clock, 
  RotateCcw, AlertTriangle, FileText, ArrowRight, UserPlus
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
  role?: string | null
  revenue_role?: string | null
}

interface Props {
  products: Product[]
  variants: Variant[]
  users: User[]
}

type TabType = 'rules' | 'history' | 'retry' | 'permissions'

export function RevenueShareClient({ products, variants, users }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('rules')
  
  // States
  const [history, setHistory] = useState<any[]>([])
  const [failedOrders, setFailedOrders] = useState<any[]>([])
  const [userList, setUserList] = useState<User[]>(users)
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  // Current logged in admin role permissions
  const [userRole, setUserRole] = useState<string>('super_admin')

  // Stats dashboard state
  const [stats, setStats] = useState({
    totalAmount: 0,
    todayAmount: 0,
    thisMonthAmount: 0,
    topProducts: [] as { name: string; amount: number }[],
    topRecipients: [] as { id: string; name: string; amount: number }[]
  })

  // Filter states for history
  const [filterProductId, setFilterProductId] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterOrderCode, setFilterOrderCode] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // Form states for direct split
  const [selectedProductCombo, setSelectedProductCombo] = useState('')
  const [sharingMethod, setSharingMethod] = useState<'equal' | 'percentage' | 'fixed'>('equal')
  const [previewPrice, setPreviewPrice] = useState(100000)
  const [previewQty, setPreviewQty] = useState(1)
  const [previewDiscount, setPreviewDiscount] = useState(0)
  
  // Recipient tag selection
  const [selectedRecipients, setSelectedRecipients] = useState<{
    user_id: string
    percentage?: number
    fixed_amount?: number
  }[]>([])

  // Fetch initial configs, roles, stats
  const initializeClientData = async () => {
    setLoading(true)
    const rulesRes = await getRevenueRulesAction()
    if (rulesRes.success) {
      if (rulesRes.userRevenueRole) {
        setUserRole(rulesRes.userRevenueRole)
      }
    }
    setLoading(false)
  }

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

  const loadRetryQueue = async () => {
    setRetryLoading(true)
    const retryRes = await getFailedSharingOrdersAction()
    if (retryRes.success && retryRes.data) {
      setFailedOrders(retryRes.data)
    }
    setRetryLoading(false)
  }

  useEffect(() => {
    initializeClientData()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      loadStatsAndHistory()
    } else if (activeTab === 'retry') {
      loadRetryQueue()
    }
  }, [activeTab, filterProductId, filterUserId, filterOrderCode, filterStartDate, filterEndDate])

  // Helper to resolve the price of the selected product or variant
  const getSelectedPrice = () => {
    if (!selectedProductCombo) return 0
    const parts = selectedProductCombo.split('|')
    const productId = parts[0]
    const variantId = parts[1] || null

    if (variantId) {
      const variant = variants.find(v => v.id === variantId)
      if (variant && variant.price !== null) return variant.price
    }
    const product = products.find(p => p.id === productId)
    return product ? product.price : 0
  }

  // Update preview price automatically when product selection changes
  useEffect(() => {
    const price = getSelectedPrice()
    setPreviewPrice(price > 0 ? price : 100000)
  }, [selectedProductCombo])

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

  // Execute Split Directly
  const handleExecuteSplit = async () => {
    if (!selectedProductCombo) {
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

    const parts = selectedProductCombo.split('|')
    const productId = parts[0]
    const variantId = parts[1] || null

    if (!confirm('Bạn có chắc chắn muốn thực hiện giao dịch chia tiền khấu trừ ví các thành viên ngay lập tức?')) return

    setLoading(true)
    const res = await executeDirectCostSplitAction({
      product_id: variantId ? null : productId,
      variant_id: variantId,
      sharing_method: sharingMethod,
      amount: previewPrice,
      quantity: previewQty,
      discount: previewDiscount,
      recipients: selectedRecipients.map(r => ({
        user_id: r.user_id,
        percentage: sharingMethod === 'percentage' ? r.percentage : null,
        fixed_amount: sharingMethod === 'fixed' ? r.fixed_amount : null
      }))
    })
    setLoading(false)

    if (res.success) {
      toast.success('Khấu trừ và chia tiền trực tiếp thành công!')
      handleResetForm()
    } else {
      toast.error(res.error || 'Có lỗi xảy ra')
    }
  }

  const handleResetForm = () => {
    setSelectedProductCombo('')
    setSharingMethod('equal')
    setPreviewPrice(100000)
    setPreviewQty(1)
    setPreviewDiscount(0)
    setSelectedRecipients([])
  }

  // Manual Compensating Rollback
  const handleRollbackShare = async (shareId: string) => {
    if (!confirm('CẢNH BÁO: Bạn đang thực hiện giao dịch bù trừ để thu hồi tiền thủ công của chia sẻ này. Số dư ví người nhận sẽ bị trừ. Tiếp tục?')) return

    setLoading(true)
    const res = await rollbackRevenueShareAction(shareId)
    setLoading(false)

    if (res.success) {
      toast.success('Thu hồi và thực hiện giao dịch bù trừ thành công!')
      loadStatsAndHistory()
    } else {
      toast.error(res.error)
    }
  }

  // Permissions Role Change
  const handleUpdateRevenueRole = async (userId: string, newRole: any) => {
    setPermissionsLoading(true)
    const res = await updateUserRevenueRoleAction(userId, newRole)
    setPermissionsLoading(false)

    if (res.success) {
      toast.success('Cập nhật vai trò thành công!')
      setUserList(userList.map(u => u.id === userId ? { ...u, revenue_role: newRole } : u))
    } else {
      toast.error(res.error)
    }
  }

  // Retry processing
  const handleRetrySharing = async (orderId: string) => {
    setRetryLoading(true)
    const res = await retryOrderRevenueSharingAction(orderId)
    setRetryLoading(false)

    if (res.success) {
      toast.success('Thực hiện lại tiến trình chia tiền thành công!')
      loadRetryQueue()
    } else {
      toast.error(res.error || 'Lỗi xử lý')
    }
  }

  // Exports
  const handleExportCSV = () => {
    if (history.length === 0) return toast.info('Không có dữ liệu')
    const headers = 'STT,Ma Don Hang,San Pham,Nguoi Nhan,So Tien Nhan,Ty Le,Trang Thai,Thoi Gian\n'
    const rows = history.map((h, i) => {
      const date = new Date(h.created_at).toLocaleString('vi-VN')
      return `${i + 1},${h.order_code_snapshot},"${h.product_name_snapshot}","${h.recipient_name_snapshot}",${h.amount},${h.percentage || ''},${h.status === 'completed' ? 'Thanh cong' : 'Thu hoi'},"${date}"`
    }).join('\n')

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `lich-su-chia-tien-${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
  }

  const handleExportExcel = () => {
    if (history.length === 0) return toast.info('Không có dữ liệu')

    let excelTemplate = `<?xml version="1.0" encoding="utf-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss.ID="Default" ss.Name="Normal">
      <Alignment ss.Vertical="Bottom"/>
      <Borders/>
      <Font ss.FontName="Calibri" x.CharSet="163" x.Family="Swiss" ss.Size="11" ss.Color="#000000"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss.ID="Header">
      <Font ss.Bold="1" ss.Color="#FFFFFF"/>
      <Interior ss.Color="#059669" ss.Pattern="Solid"/>
      <Alignment ss.Horizontal="Center"/>
    </Style>
    <Style ss.ID="Monetary">
      <NumberFormat ss.Format="#,##0"/>
    </Style>
  </Styles>
  <Worksheet ss.Name="Bao Cao Chia Tien">
    <Table>
      <Column ss.Width="120"/>
      <Column ss.Width="200"/>
      <Column ss.Width="150"/>
      <Column ss.Width="100"/>
      <Column ss.Width="80"/>
      <Column ss.Width="100"/>
      <Column ss.Width="150"/>
      <Row ss.Height="25">
        <Cell ss.StyleID="Header"><Data ss.Type="String">Mã Đơn Hàng</Data></Cell>
        <Cell ss.StyleID="Header"><Data ss.Type="String">Sản Phẩm</Data></Cell>
        <Cell ss.StyleID="Header"><Data ss.Type="String">Người Nhận</Data></Cell>
        <Cell ss.StyleID="Header"><Data ss.Type="String">Số Tiền (VND)</Data></Cell>
        <Cell ss.StyleID="Header"><Data ss.Type="String">Tỷ Lệ (%)</Data></Cell>
        <Cell ss.StyleID="Header"><Data ss.Type="String">Trạng Thái</Data></Cell>
        <Cell ss.StyleID="Header"><Data ss.Type="String">Thời Gian</Data></Cell>
      </Row>`

    history.forEach(h => {
      const date = new Date(h.created_at).toLocaleString('vi-VN')
      excelTemplate += `
      <Row>
        <Cell><Data ss.Type="String">${h.order_code_snapshot}</Data></Cell>
        <Cell><Data ss.Type="String">${h.product_name_snapshot}</Data></Cell>
        <Cell><Data ss.Type="String">${h.recipient_name_snapshot}</Data></Cell>
        <Cell ss.StyleID="Monetary"><Data ss.Type="Number">${h.amount}</Data></Cell>
        <Cell><Data ss.Type="String">${h.percentage ? h.percentage + '%' : '-'}</Data></Cell>
        <Cell><Data ss.Type="String">${h.status === 'completed' ? 'Thành công' : 'Đã thu hồi'}</Data></Cell>
        <Cell><Data ss.Type="String">${date}</Data></Cell>
      </Row>`
    })

    excelTemplate += `
    </Table>
  </Worksheet>
</Workbook>`

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `bao-cao-chia-tien-bach-hoa-${new Date().toISOString().split('T')[0]}.xls`)
    link.click()
  }

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const dateStr = new Date().toLocaleDateString('vi-VN')
    let tableRows = ''
    history.forEach((h, idx) => {
      const date = new Date(h.created_at).toLocaleString('vi-VN')
      tableRows += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${h.order_code_snapshot}</strong></td>
          <td>${h.product_name_snapshot}</td>
          <td>${h.recipient_name_snapshot}</td>
          <td style="text-align: right; font-weight: bold; color: ${h.amount < 0 ? '#ef4444' : '#10b981'}">
            ${h.amount.toLocaleString('vi-VN')}đ
          </td>
          <td>${h.percentage ? h.percentage + '%' : '-'}</td>
          <td><span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${h.status === 'completed' ? '#ecfdf5; color: #047857' : '#fef2f2; color: #b91c1c'}">${h.status === 'completed' ? 'THÀNH CÔNG' : 'THU HỒI'}</span></td>
          <td>${date}</td>
        </tr>`
    })

    printWindow.document.write(`
<html>
<head>
  <title>Báo cáo chia tiền sản phẩm</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; color: #1e293b; padding: 20px; }
    h1 { color: #047857; margin-bottom: 5px; }
    p { font-size: 12px; color: #64748b; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th { background-color: #059669; color: white; padding: 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #64748b; }
  </style>
</head>
<body onload="window.print(); window.close();">
  <h1>BÁO CÁO CHIA TIỀN SẢN PHẨM</h1>
  <p>Ngày xuất báo cáo: ${dateStr} | Tổng số giao dịch: ${history.length} | Tổng tiền đã chia: ${stats.totalAmount.toLocaleString('vi-VN')}đ</p>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Mã Đơn Hàng</th>
        <th>Sản phẩm</th>
        <th>Người nhận</th>
        <th>Số tiền</th>
        <th>Tỷ lệ</th>
        <th>Trạng thái</th>
        <th>Thời gian</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="footer">
    <p>Người xuất báo cáo: Quản trị viên hệ thống</p>
    <p>Trang Bách Hóa Cửa Hàng</p>
  </div>
</body>
</html>`)
    printWindow.document.close()
  }

  return (
    <div className="space-y-8">
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'rules' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Chia tiền trực tiếp
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'history' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Lịch sử thực tế
        </button>
        <button
          onClick={() => setActiveTab('retry')}
          className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'retry' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Thử lại lỗi chia
          {failedOrders.length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold animate-pulse">
              {failedOrders.length}
            </span>
          )}
        </button>
        {userRole === 'super_admin' && (
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'permissions' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Phân quyền Module
          </button>
        )}
      </div>

      {/* RENDER TAB 1: DIRECT SPLIT FORM (NO SAVED CONFIGURATIONS) */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Direct Split Form Card */}
          <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-600" /> Công cụ Chia tiền Sản phẩm trực tiếp
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lựa chọn sản phẩm, thành viên và phương thức để thực hiện trừ tiền trực tiếp trên ví của các thành viên ngay lập tức.
              </p>
            </div>

            <div className="space-y-4">
              {/* Product combobox dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">1. Chọn Sản phẩm hoặc Phân loại cần chia *</label>
                <select
                  value={selectedProductCombo}
                  onChange={(e) => setSelectedProductCombo(e.target.value)}
                  className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">-- Bấm để chọn sản phẩm --</option>
                  {products.map(p => {
                    const productVariants = variants.filter(v => v.product_id === p.id)
                    return (
                      <React.Fragment key={p.id}>
                        <option value={p.id} className="font-bold text-slate-900">
                          📦 {p.name} ({p.price.toLocaleString('vi-VN')}đ)
                        </option>
                        {productVariants.map(v => (
                          <option key={v.id} value={`${p.id}|${v.id}`} className="text-slate-600 italic">
                            &nbsp;&nbsp;&nbsp;&nbsp;↳ Phân loại: {v.name} {v.price ? `(${v.price.toLocaleString('vi-VN')}đ)` : ''}
                          </option>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </select>
              </div>

              {/* Price adjustments & Method */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mức giá sản phẩm (đ)</label>
                  <input 
                    type="number" 
                    value={previewPrice}
                    onChange={(e) => setPreviewPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Số lượng</label>
                  <input 
                    type="number" 
                    min="1"
                    value={previewQty}
                    onChange={(e) => setPreviewQty(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs font-bold outline-none text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Khấu trừ/Giảm giá (đ)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={previewDiscount}
                    onChange={(e) => setPreviewDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs font-bold outline-none text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">2. Phương thức phân bổ chi phí *</label>
                <select 
                  value={sharingMethod}
                  onChange={(e) => setSharingMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="equal">Chia đều (Equal Split)</option>
                  <option value="percentage">Chia theo tỷ lệ %</option>
                  <option value="fixed">Khấu trừ số tiền cố định</option>
                </select>
              </div>

              {/* Recipient tag selector */}
              <div className="space-y-2 border-t pt-4">
                <label className="text-xs font-bold text-slate-700">3. Chọn các thành viên chia tiền *</label>
                <select
                  value=""
                  onChange={(e) => {
                    const userId = e.target.value
                    if (userId) {
                      handleToggleUser(userId)
                    }
                  }}
                  className="w-full bg-slate-50 border p-3 rounded-xl text-xs outline-none"
                >
                  <option value="">-- Chọn thành viên từ danh sách để thêm --</option>
                  {users
                    .filter(u => !selectedRecipients.some(r => r.user_id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        👤 {u.full_name || 'Không tên'} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              {/* Recipients detail configuration */}
              {selectedRecipients.length > 0 ? (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-600 block">Thành viên tham gia chia ({selectedRecipients.length}):</span>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedRecipients.map(r => {
                      const user = users.find(u => u.id === r.user_id)
                      return (
                        <div key={r.user_id} className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                            {user?.full_name || user?.email}
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            {sharingMethod === 'percentage' && (
                              <div className="flex items-center gap-1 bg-white border px-2 py-1 rounded-lg">
                                <input 
                                  type="number" 
                                  min="1"
                                  max="100"
                                  value={r.percentage || ''}
                                  onChange={(e) => handleUpdateRecipientValue(r.user_id, 'percentage', Number(e.target.value))}
                                  className="w-10 text-center font-bold text-slate-800 outline-none"
                                />
                                <span className="text-[10px] text-slate-400">%</span>
                              </div>
                            )}

                            {sharingMethod === 'fixed' && (
                              <div className="flex items-center gap-1 bg-white border px-2 py-1 rounded-lg">
                                <input 
                                  type="number" 
                                  min="1000"
                                  step="1000"
                                  value={r.fixed_amount || ''}
                                  onChange={(e) => handleUpdateRecipientValue(r.user_id, 'fixed_amount', Number(e.target.value))}
                                  className="w-16 text-center font-bold text-slate-800 outline-none"
                                />
                                <span className="text-[10px] text-slate-400">đ</span>
                              </div>
                            )}

                            <button 
                              type="button" 
                              onClick={() => handleToggleUser(r.user_id)} 
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Preview box */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-xs text-emerald-800 space-y-2">
                    <div className="flex justify-between font-bold items-center border-b pb-2 border-emerald-100">
                      <span>Xem trước phân chia khấu trừ ví thành viên:</span>
                      <span className="font-mono">-{preview.totalShared.toLocaleString('vi-VN')}đ ({preview.totalPercentage}%)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-relaxed pt-1 space-y-0.5">
                      {preview.results.map((res) => (
                        <div key={res.userId} className="flex justify-between">
                          <span>{res.name} ({res.percentage}):</span>
                          <strong className="text-red-600">-{res.amount.toLocaleString('vi-VN')}đ</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action submit buttons */}
                  <div className="flex gap-3 pt-3 border-t">
                    <button 
                      type="button" 
                      onClick={handleResetForm}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Xóa trắng Form
                    </button>
                    <button 
                      type="button" 
                      onClick={handleExecuteSplit}
                      disabled={loading}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {loading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                      Thực hiện chia tiền ngay
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed rounded-2xl flex items-center justify-center text-xs text-slate-400 bg-slate-50/50">
                  Hãy thêm thành viên để xem trước phân bổ
                </div>
              )}
            </div>
          </div>

          {/* Guide card on the right */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-600" /> Hướng dẫn nhanh
              </h4>
              <ul className="list-decimal list-inside text-xs text-slate-500 space-y-3 leading-relaxed">
                <li>
                  Chọn sản phẩm cần chia chi phí từ danh sách (hoặc gõ số tiền trực tiếp vào ô giá).
                </li>
                <li>
                  Thêm các thành viên tham gia gánh chi phí này.
                </li>
                <li>
                  Xem trước bảng tính phân bổ ở ô màu xanh để kiểm tra số tiền sẽ khấu trừ của từng người.
                </li>
                <li>
                  Nhấn **"Thực hiện chia tiền ngay"**. Hệ thống sẽ ngay lập tức trừ số dư ví của các thành viên này và tạo nhật ký giao dịch.
                </li>
                <li>
                  Nếu chia nhầm, bạn có thể sang tab **"Lịch sử thực tế"** và nhấn **"Thu hồi"** để hoàn trả lại tiền cho mọi người.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chi phí chia sẻ trong ngày</span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">
                  {Math.abs(stats.todayAmount).toLocaleString('vi-VN')}đ
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-extrabold mt-4">
                <TrendingUp className="h-4 w-4" /> Hoạt động chia sẻ 24h
              </div>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chi phí chia sẻ trong tháng</span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">
                  {Math.abs(stats.thisMonthAmount).toLocaleString('vi-VN')}đ
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600 text-xs font-extrabold mt-4">
                <Calendar className="h-4 w-4" /> Tổng tháng này
              </div>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng chi phí chia sẻ lũy kế</span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">
                  {Math.abs(stats.totalAmount).toLocaleString('vi-VN')}đ
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-extrabold mt-4">
                <Coins className="h-4 w-4" /> Tổng chi phí sau hoàn/hủy
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm md:col-span-2 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" /> Thành viên gánh chi phí hàng đầu
              </h4>
              <div className="space-y-2">
                {stats.topRecipients.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu</p>
                ) : (
                  stats.topRecipients.map((tr) => (
                    <button
                      key={tr.id}
                      onClick={() => setFilterUserId(tr.id)}
                      className="w-full flex items-center justify-between text-left p-2 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
                    >
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-600 truncate max-w-[150px]">
                        {tr.name}
                      </span>
                      <strong className="text-xs text-red-500 font-bold font-mono">
                        -{Math.abs(tr.amount).toLocaleString('vi-VN')}đ
                      </strong>
                    </button>
                  ))
                )}
              </div>
              {filterUserId && (
                <button 
                  onClick={() => setFilterUserId('')} 
                  className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-0.5 mt-2"
                >
                  <X className="h-3 w-3" /> Bỏ lọc drill-down thành viên
                </button>
              )}
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm md:col-span-3 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 border-slate-100 gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Lịch sử chia tiền thực tế</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Danh sách giao dịch phân phối doanh thu bất biến.</p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button 
                    onClick={handleExportCSV} 
                    disabled={history.length === 0}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    title="Xuất file CSV"
                  >
                    CSV
                  </button>
                  <button 
                    onClick={handleExportExcel} 
                    disabled={history.length === 0}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    title="Xuất file Excel"
                  >
                    EXCEL
                  </button>
                  <button 
                    onClick={handlePrintPDF} 
                    disabled={history.length === 0}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    title="In PDF báo cáo"
                  >
                    PDF
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sản phẩm</label>
                  <select
                    value={filterProductId}
                    onChange={(e) => setFilterProductId(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl text-xs"
                  >
                    <option value="">Tất cả</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mã đơn hàng</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Mã đơn..."
                      value={filterOrderCode}
                      onChange={(e) => setFilterOrderCode(e.target.value)}
                      className="w-full bg-slate-50 border pl-8 pr-3 py-1.5 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Từ ngày</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-slate-50 border p-1.5 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đến ngày</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-slate-50 border p-1.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {historyLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <span className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    Đang tải dữ liệu...
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">Không tìm thấy bản ghi lịch sử chia tiền.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="py-3 font-bold">Mã Đơn</th>
                        <th className="py-3 font-bold">Sản phẩm</th>
                        <th className="py-3 font-bold">Người nhận</th>
                        <th className="py-3 font-bold">Số tiền</th>
                        <th className="py-3 font-bold">Tỷ lệ</th>
                        <th className="py-3 font-bold">Trạng thái</th>
                        <th className="py-3 font-bold text-right">Thao tác</th>
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
                              <strong className={`font-mono font-black ${isReversal ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isReversal ? '+' : ''}{item.amount.toLocaleString('vi-VN')}đ
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
                            <td className="py-3.5 text-right">
                              {!isReversal && (
                                <button 
                                  onClick={() => handleRollbackShare(item.id)}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[9px] font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer"
                                  title="Thực hiện giao dịch bù trừ để thu hồi"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" /> Thu hồi
                                </button>
                              )}
                              {isReversal && <span className="text-[10px] text-slate-400 font-medium">Bù trừ xong</span>}
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
        </div>
      )}

      {/* RENDER TAB 3: RETRY QUEUE */}
      {activeTab === 'retry' && (
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Bảng thử lại lỗi phân phối tiền đơn hàng
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hiển thị danh sách các đơn hàng đã Hoàn thành trong vòng 30 ngày nhưng có sản phẩm thuộc diện chia tiền chưa được ghi nhận phân phối (Do tạo cấu hình muộn hoặc lỗi tiến trình).
            </p>
          </div>

          <div className="overflow-x-auto">
            {retryLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                Đang quét đơn hàng lỗi...
              </div>
            ) : failedOrders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Tuyệt vời! Không phát hiện đơn hàng lỗi chia tiền nào.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="py-3 font-bold">Mã Đơn Hàng</th>
                    <th className="py-3 font-bold">Tổng Giá Trị</th>
                    <th className="py-3 font-bold">Ngày Đặt Hàng</th>
                    <th className="py-3 font-bold">Các Sản Phẩm Chưa Chia</th>
                    <th className="py-3 text-right font-bold">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {failedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-mono font-bold text-slate-800">{order.order_code}</td>
                      <td className="py-4 font-bold font-mono">{order.total_amount.toLocaleString('vi-VN')}đ</td>
                      <td className="py-4 text-slate-500">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1">
                          {order.unshared_items.map((item: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-md text-[10px] font-bold">
                              {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleRetrySharing(order.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" /> Chạy lại chia tiền
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* RENDER TAB 4: PERMISSIONS */}
      {activeTab === 'permissions' && (
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Quản lý quyền hạn Module chia tiền</h3>
            <p className="text-xs text-slate-500 mt-1">Super Admin có thể cấp quyền hạn điều hành cho các thành viên hệ thống khác.</p>
          </div>

          <div className="overflow-x-auto">
            {permissionsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                Đang cập nhật...
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="py-3 font-bold">Thành viên</th>
                    <th className="py-3 font-bold">Email</th>
                    <th className="py-3 font-bold">Quyền hạn hệ thống hiện tại</th>
                    <th className="py-3 text-right font-bold">Vai trò phân quyền Module</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {userList.map((u) => {
                    const resolvedRole = u.revenue_role || 'none'
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-bold text-slate-800">{u.full_name || 'Chưa thiết lập'}</td>
                        <td className="py-4 text-slate-500 font-mono">{u.email}</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">
                            {u.role?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <select
                            value={resolvedRole}
                            onChange={(e) => handleUpdateRevenueRole(u.id, e.target.value as any)}
                            className="bg-slate-50 border p-1.5 rounded-lg text-xs"
                          >
                            <option value="none">Không cấp quyền (None)</option>
                            <option value="revenue_viewer">Chỉ xem (Viewer)</option>
                            <option value="revenue_manager">Quản lý chia tiền (Manager)</option>
                            <option value="super_admin">Quản trị tối cao (Super Admin)</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
