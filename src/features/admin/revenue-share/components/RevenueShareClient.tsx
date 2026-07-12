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
import { Skeleton } from '@/components/ui/skeleton'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: number
  category_id?: string | null
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
  categories: Category[]
  variants: Variant[]
  users: User[]
}

type TabType = 'rules' | 'history' | 'retry' | 'permissions'

interface SelectedProduct {
  id: string // unique local key
  product_id?: string | null
  variant_id?: string | null
  name: string
  amount: number
  quantity: number
  discount: number
}

export function RevenueShareClient({ products, categories, variants, users }: Props) {
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

  // Filter states for product dropdown
  const [productSearchKeyword, setProductSearchKeyword] = useState('')
  const [productFilterCategoryId, setProductFilterCategoryId] = useState('all')

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

  // Form states for direct split (shopping cart of products)
  const [selectedProductsList, setSelectedProductsList] = useState<SelectedProduct[]>([])
  const [sharingMethod, setSharingMethod] = useState<'equal' | 'percentage' | 'fixed'>('equal')
  
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

  // Add product to the split list
  const handleAddProduct = (comboValue: string) => {
    if (!comboValue) return
    const parts = comboValue.split('|')
    const productId = parts[0]
    const variantId = parts[1] || null

    let name = ''
    let price = 0

    if (variantId) {
      const v = variants.find(varItem => varItem.id === variantId)
      if (v) {
        name = `${products.find(p => p.id === v.product_id)?.name} - Phân loại: ${v.name}`
        price = v.price || 0
      }
    } else {
      const p = products.find(prod => prod.id === productId)
      if (p) {
        name = p.name
        price = p.price
      }
    }

    if (!name) return

    setSelectedProductsList([
      ...selectedProductsList,
      {
        id: Math.random().toString(36).substring(7),
        product_id: variantId ? null : productId,
        variant_id: variantId,
        name,
        amount: price,
        quantity: 1,
        discount: 0
      }
    ])
  }

  const handleUpdateProductField = (id: string, field: 'amount' | 'quantity' | 'discount', value: number) => {
    setSelectedProductsList(selectedProductsList.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value }
      }
      return p
    }))
  }

  const handleDeleteProductFromList = (id: string) => {
    setSelectedProductsList(selectedProductsList.filter(p => p.id !== id))
  }

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

  // Calculate total net split cost
  const totalNetAmount = selectedProductsList.reduce((sum, p) => sum + Math.max(0, (p.amount * p.quantity) - p.discount), 0)

  // Live preview calculation helper
  const getPreviewCalculations = () => {
    const results = selectedRecipients.map(r => {
      const user = users.find(u => u.id === r.user_id)
      const name = user ? (user.full_name || user.email) : 'Người dùng ẩn danh'
      
      let amount = 0
      let displayPct = 0

      if (sharingMethod === 'equal') {
        displayPct = selectedRecipients.length > 0 ? (100 / selectedRecipients.length) : 0
        amount = selectedRecipients.length > 0 ? (totalNetAmount / selectedRecipients.length) : 0
      } else if (sharingMethod === 'percentage') {
        displayPct = r.percentage || 0
        amount = totalNetAmount * (displayPct / 100)
      } else if (sharingMethod === 'fixed') {
        amount = r.fixed_amount || 0
        displayPct = totalNetAmount > 0 ? (amount / totalNetAmount) * 100 : 0
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
      results,
      totalShared,
      totalPercentage
    }
  }

  const preview = getPreviewCalculations()

  // Execute Split Directly
  const handleExecuteSplit = async () => {
    if (selectedProductsList.length === 0) {
      return toast.error('Vui lòng chọn ít nhất một sản phẩm để chia')
    }
    if (selectedRecipients.length === 0) {
      return toast.error('Vui lòng chọn ít nhất một thành viên chia tiền')
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

    if (!confirm('Bạn có chắc chắn muốn thực hiện giao dịch chia tiền khấu trừ ví các thành viên ngay lập tức?')) return

    setLoading(true)
    const res = await executeDirectCostSplitAction({
      products: selectedProductsList.map(p => ({
        product_id: p.product_id,
        variant_id: p.variant_id,
        amount: p.amount,
        quantity: p.quantity,
        discount: p.discount
      })),
      sharing_method: sharingMethod,
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
    setSelectedProductsList([])
    setSharingMethod('equal')
    setSelectedRecipients([])
  }

  // Manual Compensating Rollback for a group of shares
  const handleRollbackShare = async (shareIds: string[]) => {
    if (!confirm('CẢNH BÁO: Bạn đang thực hiện giao dịch bù trừ để thu hồi tiền thủ công của chia sẻ này. Số dư ví người nhận sẽ bị trừ. Tiếp tục?')) return

    setLoading(true)
    let hasError = false
    for (const id of shareIds) {
      const res = await rollbackRevenueShareAction(id)
      if (!res.success) {
        hasError = true
        toast.error(res.error || 'Có lỗi xảy ra khi thu hồi một giao dịch')
      }
    }
    setLoading(false)

    if (!hasError) {
      toast.success('Thu hồi thành công giao dịch!')
    }
    loadStatsAndHistory()
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
                Lựa chọn một hoặc nhiều sản phẩm cần chia chi phí, sau đó thêm thành viên để thực hiện chia tiền khấu trừ ví trực tiếp ngay lập tức.
              </p>
            </div>

            <div className="space-y-4">
              {/* Product combobox dropdown (Product Adder) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">1. Chọn các sản phẩm cần chia chi phí (Thêm nhiều sản phẩm) *</label>
                
                <div className="border bg-white rounded-xl shadow-sm overflow-hidden flex flex-col mt-2">
                  {/* The search and category filter */}
                  <div className="flex flex-col sm:flex-row gap-2 p-2 border-b bg-slate-50/50">
                    <select
                      value={productFilterCategoryId}
                      onChange={(e) => setProductFilterCategoryId(e.target.value)}
                      className="sm:w-1/3 bg-white border p-2 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                    >
                      <option value="all">Tất cả danh mục</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm sản phẩm để thêm..."
                        value={productSearchKeyword}
                        onChange={(e) => setProductSearchKeyword(e.target.value)}
                        className="w-full bg-white border pl-9 p-2 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* List of products to click */}
                  <div className="max-h-[240px] overflow-y-auto p-2 bg-slate-50/30">
                    {products
                      .filter(p => {
                        if (productFilterCategoryId !== 'all' && p.category_id !== productFilterCategoryId) return false;
                        if (productSearchKeyword && !p.name.toLowerCase().includes(productSearchKeyword.toLowerCase())) return false;
                        return true;
                      })
                      .length === 0 ? (
                        <div className="text-xs text-slate-400 text-center py-6">Không tìm thấy sản phẩm nào phù hợp</div>
                      ) : (
                        <div className="space-y-1">
                          {products
                            .filter(p => {
                              if (productFilterCategoryId !== 'all' && p.category_id !== productFilterCategoryId) return false;
                              if (productSearchKeyword && !p.name.toLowerCase().includes(productSearchKeyword.toLowerCase())) return false;
                              return true;
                            })
                            .map(p => {
                              const productVariants = variants.filter(v => v.product_id === p.id)
                              return (
                                <div key={p.id} className="space-y-1">
                                  <button
                                    onClick={() => handleAddProduct(p.id)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-emerald-50 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors flex items-center justify-between group border border-transparent hover:border-emerald-100"
                                  >
                                    <span className="flex items-center gap-2"><span className="text-sm">📦</span> {p.name}</span>
                                    <span className="text-emerald-600 group-hover:text-emerald-700">{p.price.toLocaleString('vi-VN')}đ</span>
                                  </button>
                                  {productVariants.length > 0 && productVariants.map(v => (
                                    <button
                                      key={v.id}
                                      onClick={() => handleAddProduct(`${p.id}|${v.id}`)}
                                      className="w-full text-left pl-9 pr-3 py-2 rounded-lg hover:bg-emerald-50 text-xs font-medium text-slate-600 hover:text-emerald-700 transition-colors flex items-center justify-between group border border-transparent hover:border-emerald-100"
                                    >
                                      <span className="italic flex items-center gap-1.5"><span className="text-slate-400">↳</span> Phân loại: {v.name}</span>
                                      <span className="text-emerald-600 group-hover:text-emerald-700">{v.price ? v.price.toLocaleString('vi-VN') : p.price.toLocaleString('vi-VN')}đ</span>
                                    </button>
                                  ))}
                                </div>
                              )
                            })}
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>

              {/* Added products list */}
              {selectedProductsList.length > 0 && (
                <div className="space-y-2 pt-2 border border-slate-100 p-4 rounded-2xl bg-slate-50/30">
                  <span className="text-xs font-bold text-slate-600 block">Sản phẩm đang chọn ({selectedProductsList.length}):</span>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {selectedProductsList.map(p => (
                      <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white border rounded-xl shadow-xs">
                        <div className="font-semibold text-slate-700 text-xs truncate max-w-xs">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px]">
                          <div className="flex items-center gap-1 bg-slate-50 border px-2 py-1 rounded-lg">
                            <span className="text-[9px] text-slate-400">Đơn giá:</span>
                            <input 
                              type="number"
                              value={p.amount}
                              onChange={(e) => handleUpdateProductField(p.id, 'amount', Number(e.target.value))}
                              className="w-16 text-center font-bold text-slate-800 bg-transparent outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1 bg-slate-50 border px-2 py-1 rounded-lg">
                            <span className="text-[9px] text-slate-400">SL:</span>
                            <input 
                              type="number"
                              min="1"
                              value={p.quantity}
                              onChange={(e) => handleUpdateProductField(p.id, 'quantity', Math.max(1, Number(e.target.value)))}
                              className="w-8 text-center font-bold text-slate-800 bg-transparent outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1 bg-slate-50 border px-2 py-1 rounded-lg">
                            <span className="text-[9px] text-slate-400">Trừ:</span>
                            <input 
                              type="number"
                              min="0"
                              value={p.discount}
                              onChange={(e) => handleUpdateProductField(p.id, 'discount', Number(e.target.value))}
                              className="w-12 text-center font-bold text-slate-800 bg-transparent outline-none"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleDeleteProductFromList(p.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs font-black text-slate-700 pt-2 border-t border-dashed">
                    <span>TỔNG CHI PHÍ GỐC:</span>
                    <span className="text-emerald-700 font-mono text-sm">{totalNetAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              )}

              {/* Method select */}
              <div className="space-y-1.5 border-t pt-4">
                <label className="text-xs font-bold text-slate-700">2. Phương thức phân bổ chi phí *</label>
                <select 
                  value={sharingMethod}
                  onChange={(e) => setSharingMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="equal">Chia đều (Equal Split)</option>
                  <option value="percentage">Chia theo tỷ lệ %</option>
                  <option value="fixed">Khấu trừ số tiền cố định trực tiếp</option>
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
                  className="w-full bg-slate-50 border p-3 rounded-xl text-xs outline-none cursor-pointer"
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

              {/* Recipients list */}
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

                  {/* Submit actions */}
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
                      disabled={loading || selectedProductsList.length === 0}
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
                  Nhấp vào menu **"Chọn các sản phẩm cần chia"** để thêm một hoặc nhiều sản phẩm cần chia vào danh sách.
                </li>
                <li>
                  Mỗi sản phẩm được thêm có thể chỉnh sửa thủ công số lượng, đơn giá và chiết khấu ngay tại danh sách.
                </li>
                <li>
                  Thêm các thành viên tham gia gánh chi phí và chọn phương thức phân bổ.
                </li>
                <li>
                  Xem trước bảng tính phân bổ ở ô màu xanh để kiểm tra số tiền sẽ khấu trừ của từng người.
                </li>
                <li>
                  Nhấn **"Thực hiện chia tiền ngay"**. Hệ thống sẽ ngay lập tức trừ số dư ví của các thành viên này và tạo nhật ký giao dịch.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">

          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
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
                  <div className="py-4 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-8 w-1/5" />
                        <Skeleton className="h-8 w-1/5" />
                        <Skeleton className="h-8 w-1/5" />
                        <Skeleton className="h-8 w-1/5" />
                        <Skeleton className="h-8 w-1/5" />
                      </div>
                    ))}
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
                      {Object.values(
                        history.reduce((acc, item) => {
                          const timeKey = item.created_at.substring(0, 16)
                          const key = `${item.order_code_snapshot}_${item.product_name_snapshot}_${item.status}_${timeKey}`
                          if (!acc[key]) {
                            acc[key] = {
                              ...item,
                              groupedIds: [item.id],
                              recipients: [item.recipient_name_snapshot],
                              totalAmount: item.amount,
                              allPercentages: [item.percentage]
                            }
                          } else {
                            acc[key].groupedIds.push(item.id)
                            acc[key].recipients.push(item.recipient_name_snapshot)
                            acc[key].totalAmount += item.amount
                            acc[key].allPercentages.push(item.percentage)
                          }
                          return acc
                        }, {} as Record<string, any>)
                      )
                      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((item: any) => {
                        const date = new Date(item.created_at).toLocaleString('vi-VN')
                        const isReversal = item.status === 'reversed'
                        const isRefund = isReversal && item.totalAmount > 0
                        const isRevokedOriginal = isReversal && item.totalAmount < 0
                        const isSuccess = item.status === 'completed'
                        const isMulti = item.recipients.length > 1

                        return (
                          <tr key={item.groupedIds.join('-')} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 font-mono font-bold text-slate-700">{item.order_code_snapshot}</td>
                            <td className="py-3.5 font-medium text-slate-800">{item.product_name_snapshot}</td>
                            <td className="py-3.5 text-slate-700">
                              {isMulti ? (
                                <div className="flex flex-col">
                                  <span>{item.recipients.length} người</span>
                                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={item.recipients.join(', ')}>
                                    {item.recipients.join(', ')}
                                  </span>
                                </div>
                              ) : item.recipients[0]}
                            </td>
                            <td className="py-3.5">
                              <strong className={`font-mono font-black ${isRefund ? 'text-emerald-600' : isRevokedOriginal ? 'text-slate-400 line-through' : 'text-red-500'}`}>
                                {isRefund ? '+' : ''}{item.totalAmount.toLocaleString('vi-VN')}đ
                              </strong>
                            </td>
                            <td className="py-3.5 text-slate-500">
                              {isMulti ? (
                                item.allPercentages.every((p: any) => p === item.allPercentages[0]) && item.allPercentages[0] 
                                  ? `${item.allPercentages[0]}% mỗi người` 
                                  : 'Nhiều tỷ lệ'
                              ) : (item.percentage ? `${item.percentage}%` : '-')}
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isRefund ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                isRevokedOriginal ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {isRefund ? 'HOÀN TIỀN' : isRevokedOriginal ? 'BỊ THU HỒI' : 'THÀNH CÔNG'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              {!isReversal && (
                                <button 
                                  onClick={() => handleRollbackShare(item.groupedIds)}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[9px] font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer"
                                  title="Thực hiện giao dịch bù trừ để thu hồi toàn bộ"
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
      )}

      {/* RENDER TAB 3: RETRY QUEUE */}

    </div>
  )
}
