'use client'

import React, { useState, useEffect } from 'react'
import { 
  saveRevenueRuleAction, 
  deleteRevenueRuleAction, 
  copyRevenueRuleAction, 
  getRevenueSharesHistoryAction,
  getRevenueShareStatsAction,
  getRevenueRulesAction,
  submitRuleForApprovalAction,
  approveRevenueRuleAction,
  rollbackRevenueShareAction,
  updateUserRevenueRoleAction,
  getRuleVersionsAction,
  getFailedSharingOrdersAction,
  retryOrderRevenueSharingAction
} from '@/actions/admin/revenue-share.actions'
import { toast } from 'sonner'
import { 
  Coins, Percent, Landmark, Plus, Trash2, Edit2, Copy, Download, Search, 
  Filter, Calendar, DollarSign, Users, Award, TrendingUp, X, Check, CheckSquare, 
  Square, Shield, Clock, RotateCcw, AlertTriangle, FileText, ArrowRight, Eye, ChevronDown
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
  revenue_role?: string | null
}

interface Rule {
  id: string
  product_id?: string | null
  variant_id?: string | null
  sharing_method: 'equal' | 'percentage' | 'fixed'
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'expired' | 'archived'
  version: number
  approved_by?: string | null
  approved_at?: string | null
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

type TabType = 'rules' | 'history' | 'retry' | 'permissions'

export function RevenueShareClient({ products, variants, users, initialRules }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('rules')
  
  // Rule lists & histories
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [history, setHistory] = useState<any[]>([])
  const [failedOrders, setFailedOrders] = useState<any[]>([])
  const [userList, setUserList] = useState<User[]>(users)
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  // Current logged in admin role permissions
  const [userRole, setUserRole] = useState<string>('revenue_viewer')

  // Stats dashboard state
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
  const [showArchivedRules, setShowArchivedRules] = useState(false)

  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [sharingMethod, setSharingMethod] = useState<'equal' | 'percentage' | 'fixed'>('equal')
  const [ruleStatus, setRuleStatus] = useState<Rule['status']>('draft')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Recipient form selection
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

  // Rule Version history states
  const [viewingVersionRule, setViewingVersionRule] = useState<Rule | null>(null)
  const [ruleVersions, setRuleVersions] = useState<any[]>([])
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null)

  // Live preview assumptions
  const [previewPrice, setPreviewPrice] = useState(100000)
  const [previewQty, setPreviewQty] = useState(1)
  const [previewDiscount, setPreviewDiscount] = useState(0)

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

  // Fetch initial configs, roles, stats
  const initializeClientData = async () => {
    setLoading(true)
    const rulesRes = await getRevenueRulesAction()
    if (rulesRes.success && rulesRes.data) {
      setRules(rulesRes.data)
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

  // Recipient updates
  const availableVariants = variants.filter(v => v.product_id === selectedProductId)

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

  const redistributePercentages = () => {
    if (selectedRecipients.length === 0) return
    const equalShare = Math.floor(100 / selectedRecipients.length)
    let remainder = 100 - (equalShare * selectedRecipients.length)
    setSelectedRecipients(selectedRecipients.map((r, i) => ({
      ...r,
      percentage: equalShare + (i === 0 ? remainder : 0)
    })))
  }

  // Save rule
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
    const res = await saveRevenueRuleAction({
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
    })
    setLoading(false)

    if (res.success) {
      toast.success(editingRuleId ? 'Cập nhật luật chia tiền thành công!' : 'Tạo mới luật chia tiền thành công!')
      initializeClientData()
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

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRuleId(null)
    setSelectedProductId('')
    setSelectedVariantId('')
    setSharingMethod('equal')
    setRuleStatus('draft')
    setStartDate('')
    setEndDate('')
    setSelectedRecipients([])
    setSearchUserQuery('')
  }

  // Delete/Archive Rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn lưu trữ (soft delete) luật chia sẻ doanh thu này?')) return

    setLoading(true)
    const res = await deleteRevenueRuleAction(id)
    setLoading(false)

    if (res.success) {
      toast.success('Lưu trữ luật chia tiền thành công')
      initializeClientData()
    } else {
      toast.error(res.error)
    }
  }

  // Submission / Approval
  const handleSubmitForApproval = async (id: string) => {
    setLoading(true)
    const res = await submitRuleForApprovalAction(id)
    setLoading(false)

    if (res.success) {
      toast.success('Đã gửi yêu cầu phê duyệt luật thành công!')
      initializeClientData()
    } else {
      toast.error(res.error)
    }
  }

  const handleApproveRule = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn phê duyệt hoạt động cho luật chia sẻ doanh thu này?')) return

    setLoading(true)
    const res = await approveRevenueRuleAction(id)
    setLoading(false)

    if (res.success) {
      toast.success('Phê duyệt và kích hoạt luật thành công!')
      initializeClientData()
    } else {
      toast.error(res.error)
    }
  }

  // Copy rule
  const handleConfirmCopy = async () => {
    if (!copyingRule) return
    if (!copyTargetProductId && !copyTargetVariantId) {
      return toast.error('Vui lòng chọn đích sao chép')
    }

    setLoading(true)
    const res = await copyRevenueRuleAction(copyingRule.id, {
      product_id: copyTargetVariantId ? null : copyTargetProductId,
      variant_id: copyTargetVariantId || null
    })
    setLoading(false)

    if (res.success) {
      toast.success('Sao chép cấu hình chia tiền thành công!')
      initializeClientData()
      setCopyingRule(null)
      setCopyTargetProductId('')
      setCopyTargetVariantId('')
    } else {
      toast.error(res.error)
    }
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

  // Fetch Versions
  const handleViewVersions = async (rule: Rule) => {
    setViewingVersionRule(rule)
    setRuleVersions([])
    setSelectedVersionIndex(null)

    const res = await getRuleVersionsAction(rule.id)
    if (res.success && res.data) {
      setRuleVersions(res.data)
      if (res.data.length > 0) {
        setSelectedVersionIndex(0)
      }
    }
  }

  // CSV, Excel and PDF Export
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

    // Generate XML Spreadsheet format to open natively in Microsoft Excel
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
  <title>Báo cáo doanh thu chia sẻ sản phẩm</title>
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
  <h1>BÁO CÁO PHÂN CHIA DOANH THU SẢN PHẨM</h1>
  <p>Ngày xuất báo cáo: ${dateStr} | Tổng số giao dịch: ${history.length} | Tổng thực chia: ${stats.totalAmount.toLocaleString('vi-VN')}đ</p>
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

  // Custom SVG Donut Chart for sharing methods proportion
  const getSharingMethodsProportions = () => {
    let equalCount = 0
    let percentageCount = 0
    let fixedCount = 0

    rules.filter(r => r.status !== 'archived').forEach(r => {
      if (r.sharing_method === 'equal') equalCount++
      else if (r.sharing_method === 'percentage') percentageCount++
      else if (r.sharing_method === 'fixed') fixedCount++
    })

    const total = equalCount + percentageCount + fixedCount
    if (total === 0) return { equal: 0, percentage: 0, fixed: 0, total: 0 }

    return {
      equal: Math.round((equalCount / total) * 100),
      percentage: Math.round((percentageCount / total) * 100),
      fixed: Math.round((fixedCount / total) * 100),
      total
    }
  }

  const chartData = getSharingMethodsProportions()

  // Parse Version comparisons diff logs
  const getVersionDiffMarkup = () => {
    if (selectedVersionIndex === null || ruleVersions.length === 0) return null
    const log = ruleVersions[selectedVersionIndex]
    const { old_value, new_value } = log.metadata || {}

    if (!new_value) return <p className="text-xs text-slate-400">Không có dữ liệu chi tiết phiên bản này.</p>

    const changes: React.ReactNode[] = []

    // Check basic rule modifications
    if (old_value) {
      if (old_value.sharing_method !== new_value.sharing_method) {
        changes.push(
          <div key="method" className="flex items-center gap-1.5 text-xs text-slate-700 bg-amber-50 p-2 rounded-lg border border-amber-100">
            <span className="font-bold">Phương thức:</span>
            <span className="line-through text-red-500">{old_value.sharing_method}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-emerald-600 font-bold">{new_value.sharing_method}</span>
          </div>
        )
      }
      if (old_value.status !== new_value.status) {
        changes.push(
          <div key="status" className="flex items-center gap-1.5 text-xs text-slate-700 bg-amber-50 p-2 rounded-lg border border-amber-100">
            <span className="font-bold">Trạng thái:</span>
            <span className="line-through text-red-500">{old_value.status}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-emerald-600 font-bold">{new_value.status}</span>
          </div>
        )
      }
      if (old_value.start_date !== new_value.start_date || old_value.end_date !== new_value.end_date) {
        changes.push(
          <div key="dates" className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
            <strong>Thời hạn hiệu lực:</strong>
            <div>Cũ: {old_value.start_date ? new Date(old_value.start_date).toLocaleDateString() : 'N/A'} - {old_value.end_date ? new Date(old_value.end_date).toLocaleDateString() : 'N/A'}</div>
            <div>Mới: <span className="text-emerald-600">{new_value.start_date ? new Date(new_value.start_date).toLocaleDateString() : 'N/A'} - {new_value.end_date ? new Date(new_value.end_date).toLocaleDateString() : 'N/A'}</span></div>
          </div>
        )
      }

      // Check recipient updates
      const oldRecipients = old_value.recipients || []
      const newRecipients = new_value.recipients || []

      // Added recipients
      newRecipients.forEach((nr: any) => {
        const matchingOld = oldRecipients.find((or: any) => or.user_id === nr.user_id)
        const user = users.find(u => u.id === nr.user_id)
        const name = user ? (user.full_name || user.email) : 'Thành viên'
        
        if (!matchingOld) {
          changes.push(
            <div key={`add-${nr.user_id}`} className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
              <span className="font-bold text-emerald-600">[+] Thêm người nhận:</span>
              <span>{name} ({nr.percentage ? `${nr.percentage}%` : nr.fixed_amount ? `${nr.fixed_amount.toLocaleString()}đ` : 'chia đều'})</span>
            </div>
          )
        } else {
          // Changed values
          const valChanged = matchingOld.percentage !== nr.percentage || matchingOld.fixed_amount !== nr.fixed_amount
          if (valChanged) {
            changes.push(
              <div key={`edit-${nr.user_id}`} className="text-xs text-slate-700 bg-blue-50 p-2 rounded-lg border border-blue-100 space-y-1">
                <strong>Thay đổi định mức cho {name}:</strong>
                <div>Cũ: {matchingOld.percentage ? `${matchingOld.percentage}%` : matchingOld.fixed_amount ? `${matchingOld.fixed_amount.toLocaleString()}đ` : 'chia đều'}</div>
                <div>Mới: <span className="text-emerald-600 font-bold">{nr.percentage ? `${nr.percentage}%` : nr.fixed_amount ? `${nr.fixed_amount.toLocaleString()}đ` : 'chia đều'}</span></div>
              </div>
            )
          }
        }
      })

      // Removed recipients
      oldRecipients.forEach((or: any) => {
        const existsInNew = newRecipients.some((nr: any) => nr.user_id === or.user_id)
        if (!existsInNew) {
          const user = users.find(u => u.id === or.user_id)
          const name = user ? (user.full_name || user.email) : 'Thành viên'
          changes.push(
            <div key={`remove-${or.user_id}`} className="text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-1.5">
              <span className="font-bold text-red-600">[-] Xóa người nhận:</span>
              <span>{name} ({or.percentage ? `${or.percentage}%` : or.fixed_amount ? `${or.fixed_amount.toLocaleString()}đ` : 'chia đều'})</span>
            </div>
          )
        }
      })
    } else {
      changes.push(
        <div key="init" className="text-xs text-emerald-700 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
          <span className="font-bold">Thiết lập luật ban đầu (Version 1)</span>
          <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
            <li>Phương thức: {new_value.sharing_method}</li>
            <li>Trạng thái: {new_value.status}</li>
            <li>Số lượng người nhận: {new_value.recipients?.length || 0}</li>
          </ul>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 border-b pb-2">
          <span>Hành động: <strong>{log.action === 'create_revenue_rule' ? 'TẠO MỚI' : log.action === 'update_revenue_rule' ? 'CẬP NHẬT' : 'SAO CHÉP'}</strong></span>
          <span>Thực hiện bởi: <strong>{log.metadata?.admin_name}</strong></span>
        </div>
        <div className="space-y-2">
          {changes.length === 0 ? (
            <p className="text-xs text-slate-400">Không phát hiện thay đổi cấu hình giữa các phiên bản.</p>
          ) : (
            changes
          )}
        </div>
      </div>
    )
  }

  // Active / non-archived rules
  const activeRulesList = rules.filter(r => showArchivedRules ? true : r.status !== 'archived')

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
          Luật chia tiền
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

      {/* RENDER TAB 1: RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Dashboard Summary charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-600" /> Vai trò phân quyền của bạn
                </h3>
                <p className="text-xs text-slate-500">Cấp phép hiện tại định danh các hành động khả dụng của bạn trên hệ thống.</p>
                
                <div className="mt-4 flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border">
                  <div className={`p-2.5 rounded-xl ${
                    userRole === 'super_admin' ? 'bg-emerald-50 text-emerald-600' :
                    userRole === 'revenue_manager' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700 font-mono">
                      {userRole === 'super_admin' ? 'Super Admin (Tối cao)' :
                       userRole === 'revenue_manager' ? 'Revenue Manager' : 'Revenue Viewer (Chỉ xem)'}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      {userRole === 'super_admin' ? 'Có toàn quyền sửa đổi cấu hình, gửi duyệt, phê duyệt kích hoạt luật và rollback hoàn tiền thủ công.' :
                       userRole === 'revenue_manager' ? 'Được tạo, sửa đổi và gửi duyệt luật chia sẻ doanh thu. Cần Super Admin duyệt để luật có hiệu lực.' :
                       'Chỉ có quyền xem thông tin số liệu cấu hình và lịch sử giao dịch. Không thể thao tác.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom SVG Donut Chart */}
            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-800 text-sm">Phân bổ Phương thức</h3>
                <p className="text-[10px] text-slate-400">Tỷ lệ các phương thức chia trong cấu hình hoạt động.</p>
                <div className="space-y-1 text-xs pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" />
                    <span>Chia đều: {chartData.equal}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" />
                    <span>Tỷ lệ %: {chartData.percentage}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block" />
                    <span>Cố định: {chartData.fixed}%</span>
                  </div>
                </div>
              </div>
              
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                {/* SVG circular donut visualization */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  
                  {chartData.total > 0 ? (
                    <>
                      {/* Equal segment */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" 
                        strokeDasharray={`${chartData.equal} ${100 - chartData.equal}`} 
                        strokeDashoffset="0" 
                      />
                      {/* Percentage segment */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3" 
                        strokeDasharray={`${chartData.percentage} ${100 - chartData.percentage}`} 
                        strokeDashoffset={-chartData.equal} 
                      />
                      {/* Fixed segment */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6366f1" strokeWidth="3" 
                        strokeDasharray={`${chartData.fixed} ${100 - chartData.fixed}`} 
                        strokeDashoffset={-(chartData.equal + chartData.percentage)} 
                      />
                    </>
                  ) : (
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="100 0" />
                  )}
                </svg>
                <div className="absolute font-bold text-xs text-slate-800">
                  {chartData.total} Luật
                </div>
              </div>
            </div>
          </div>

          {/* Rules List table panel */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Danh sách Luật cấu hình chia sẻ doanh thu</h3>
                <p className="text-xs text-slate-400 mt-0.5">Lưu ý: Chỉ những luật ở trạng thái APPROVED + ACTIVE mới được chạy chia tiền tự động.</p>
              </div>
              
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showArchivedRules} 
                    onChange={(e) => setShowArchivedRules(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  Hiển thị đã lưu trữ (Archived)
                </label>
                
                {userRole !== 'revenue_viewer' && (
                  <button 
                    onClick={() => {
                      setRuleStatus('draft')
                      setShowForm(true)
                    }} 
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Thiết lập luật mới
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeRulesList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">Không tìm thấy cấu hình luật chia tiền nào hoạt động.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="py-3 font-bold">Đối tượng áp dụng</th>
                      <th className="py-3 font-bold">Phương thức</th>
                      <th className="py-3 font-bold">Phê duyệt</th>
                      <th className="py-3 font-bold">Trạng thái</th>
                      <th className="py-3 font-bold">Phiên bản</th>
                      <th className="py-3 font-bold">Thời hạn hiệu lực</th>
                      <th className="py-3 font-bold">Người nhận</th>
                      <th className="py-3 text-right font-bold">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeRulesList.map((rule) => {
                      const isProduct = !!rule.product_id
                      const name = isProduct 
                        ? rule.products?.name || 'Sản phẩm đã bị xóa'
                        : `${rule.product_variants?.name} (Phân loại)`
                      
                      const method = rule.sharing_method === 'equal' ? 'Chia đều' 
                        : rule.sharing_method === 'percentage' ? 'Tỷ lệ %' 
                        : 'Số tiền cố định'

                      const isApproved = !!rule.approved_by

                      return (
                        <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-semibold text-slate-800 truncate max-w-[160px]" title={name}>
                            {name}
                          </td>
                          <td className="py-4 text-slate-600">{method}</td>
                          <td className="py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isApproved ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {isApproved ? 'ĐÃ DUYỆT' : 'CHƯA PHÊ DUYỆT'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                              rule.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              rule.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                              rule.status === 'pending_approval' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              rule.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700'
                            }`}>
                              {rule.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 font-bold text-slate-500">v{rule.version}</td>
                          <td className="py-4 text-slate-400 font-medium">
                            {rule.start_date ? new Date(rule.start_date).toLocaleDateString() : 'Bất đầu'} - {rule.end_date ? new Date(rule.end_date).toLocaleDateString() : 'Vĩnh viễn'}
                          </td>
                          <td className="py-4 text-slate-500 font-mono text-[11px]">
                            {rule.recipients.length} thành viên
                          </td>
                          <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleViewVersions(rule)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-all inline-block"
                              title="Lịch sử phiên bản & So sánh"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                            
                            {userRole === 'super_admin' && rule.status === 'pending_approval' && (
                              <button
                                onClick={() => handleApproveRule(rule.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black transition-all inline-block"
                                title="Phê duyệt kích hoạt"
                              >
                                Phê duyệt
                              </button>
                            )}

                            {userRole !== 'revenue_viewer' && rule.status === 'draft' && (
                              <button
                                onClick={() => handleSubmitForApproval(rule.id)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black transition-all inline-block"
                                title="Gửi yêu cầu duyệt"
                              >
                                Gửi duyệt
                              </button>
                            )}

                            {userRole !== 'revenue_viewer' && rule.status !== 'archived' && (
                              <>
                                <button 
                                  onClick={() => setCopyingRule(rule)} 
                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors inline-block" 
                                  title="Sao chép cấu hình"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleEditRule(rule)} 
                                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors inline-block" 
                                  title="Chỉnh sửa cấu hình"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRule(rule.id)} 
                                  className="p-1 text-slate-400 hover:text-red-600 transition-colors inline-block" 
                                  title="Lưu trữ (Soft Delete)"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
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

      {/* RENDER TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Summary statistical indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doanh thu chia trong ngày</span>
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
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doanh thu chia trong tháng</span>
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
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng tiền tích lũy lũy kế</span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">
                  {stats.totalAmount.toLocaleString('vi-VN')}đ
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-extrabold mt-4">
                <Coins className="h-4 w-4" /> Thực nhận sau hoàn/hủy
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Top metrics list */}
            <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm md:col-span-2 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" /> Thành viên nhận tiền hàng đầu
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
                      <strong className="text-xs text-slate-900 font-bold font-mono">
                        +{tr.amount.toLocaleString('vi-VN')}đ
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

            {/* History Table component */}
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
                            <td className="py-3 font-mono font-bold text-slate-700">{item.order_code_snapshot}</td>
                            <td className="py-3 font-medium text-slate-800">{item.product_name_snapshot}</td>
                            <td className="py-3 text-slate-700">{item.recipient_name_snapshot}</td>
                            <td className="py-3">
                              <strong className={`font-mono font-black ${isReversal ? 'text-red-500' : 'text-emerald-600'}`}>
                                {isReversal ? '' : '+'}{item.amount.toLocaleString('vi-VN')}đ
                              </strong>
                            </td>
                            <td className="py-3 text-slate-500">{item.percentage ? `${item.percentage}%` : '-'}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isReversal ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {isReversal ? 'THU HỒI' : 'THÀNH CÔNG'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {userRole === 'super_admin' && !isReversal && (
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
              Hiển thị danh sách các đơn hàng đã Hoàn thành trong vòng 30 ngày nhưng có sản phẩm thuộc diện chia tiền chưa được ghi nhận phân phối (Do tạo luật muộn hoặc lỗi tiến trình).
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
                        {userRole !== 'revenue_viewer' && (
                          <button
                            onClick={() => handleRetrySharing(order.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" /> Chạy lại chia tiền
                          </button>
                        )}
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
      {activeTab === 'permissions' && userRole === 'super_admin' && (
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
                            {u.id === initialRules[0]?.approved_by ? 'ADMIN' : 'USER'}
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
                            <option value="revenue_manager">Quản lý luật (Manager)</option>
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

      {/* RULE EDIT/CREATE MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-lg font-black text-slate-800">
                {editingRuleId ? 'Cập nhật cấu hình chia tiền' : 'Thiết lập luật chia tiền sản phẩm'}
              </h3>
              <button onClick={handleCloseForm} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Form fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Chọn sản phẩm gốc *</label>
                  <select 
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value)
                      setSelectedVariantId('')
                    }}
                    className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs"
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.price.toLocaleString('vi-VN')}đ)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Áp dụng cho Phân loại (Tùy chọn - Độ ưu tiên cao nhất)</label>
                  <select 
                    value={selectedVariantId}
                    disabled={!selectedProductId || availableVariants.length === 0}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs disabled:opacity-50"
                  >
                    <option value="">-- Áp dụng cho cả sản phẩm --</option>
                    {availableVariants.map(v => (
                      <option key={v.id} value={v.id}>{v.name} {v.price ? `(${v.price.toLocaleString('vi-VN')}đ)` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Phương thức chia tiền *</label>
                    <select 
                      value={sharingMethod}
                      onChange={(e) => setSharingMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs"
                    >
                      <option value="equal">Chia đều (Equal)</option>
                      <option value="percentage">Chia theo % (Percentage)</option>
                      <option value="fixed">Số tiền cố định (Fixed)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Trạng thái cấu hình *</label>
                    <select 
                      value={ruleStatus}
                      onChange={(e) => setRuleStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs"
                    >
                      <option value="draft">Bản nháp (Draft)</option>
                      <option value="pending_approval">Chờ phê duyệt (Pending)</option>
                      {userRole === 'super_admin' && (
                        <>
                          <option value="approved">Đã phê duyệt (Approved)</option>
                          <option value="active">Đang hoạt động (Active)</option>
                          <option value="paused">Tạm dừng (Paused)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Ngày bắt đầu hiệu lực</label>
                    <input 
                      type="datetime-local" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Ngày kết thúc hiệu lực</label>
                    <input 
                      type="datetime-local" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 border p-2.5 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <label className="text-xs font-bold text-slate-500">Chọn thành viên nhận tiền *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm thành viên..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="w-full bg-slate-50 border pl-10 pr-4 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-xl p-2 bg-slate-50 space-y-1">
                    {userList
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
                            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white text-xs text-left"
                          >
                            <span className="font-semibold text-slate-700">
                              {u.full_name || 'Chưa đặt tên'} <span className="text-[10px] text-slate-400">({u.email})</span>
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

              {/* Right Preview and Recipient Config */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-3 border-b pb-1">Cấu hình chi tiết & Xem trước chia tiền</h4>
                  
                  {selectedRecipients.length === 0 ? (
                    <div className="h-48 border border-dashed rounded-2xl flex items-center justify-center text-slate-400 text-xs text-center p-4">
                      Vui lòng chọn thành viên để hiển thị xem trước cấu hình
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {selectedRecipients.map(r => {
                          const user = users.find(u => u.id === r.user_id)
                          return (
                            <div key={r.user_id} className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border">
                              <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                                {user?.full_name || user?.email}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
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
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-3">
                        <div className="flex items-center justify-between text-[11px] border-b pb-2 border-emerald-200">
                          <span className="font-extrabold text-emerald-800">XEM TRƯỚC PHÂN BỔ</span>
                          <span className="font-bold text-slate-500">Giả định: 100k/sản phẩm</span>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          {preview.results.map(res => (
                            <div key={res.userId} className="flex justify-between">
                              <span className="text-slate-500">{res.name} ({res.percentage}):</span>
                              <strong className="text-slate-800">+{res.amount.toLocaleString('vi-VN')}đ</strong>
                            </div>
                          ))}
                          <div className="border-t border-dashed my-2 pt-1 flex justify-between font-bold text-slate-800">
                            <span>Tổng chia ({preview.totalPercentage}%):</span>
                            <span>{preview.totalShared.toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 border-t pt-4">
                  <button 
                    type="button" 
                    onClick={handleCloseForm}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
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

      {/* COPY CONFIGURATION DIALOG */}
      {copyingRule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 space-y-5 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 text-md">Sao chép cấu hình chia tiền</h3>
              <button onClick={() => setCopyingRule(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Vui lòng chọn sản phẩm/phân loại đích để thực hiện sao chép:
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
                Xác nhận Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY AND COMPARISON MODAL */}
      {viewingVersionRule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-2xl w-full p-6 space-y-5 shadow-2xl border max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-800 text-base">Lịch sử sửa đổi & So sánh phiên bản</h3>
              <button onClick={() => setViewingVersionRule(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Left Column: Revision selector */}
              <div className="sm:col-span-1 border-r pr-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phiên bản sửa đổi</label>
                {ruleVersions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Chưa ghi nhận lịch sử.</p>
                ) : (
                  ruleVersions.map((log, idx) => (
                    <button
                      key={log.id}
                      onClick={() => setSelectedVersionIndex(idx)}
                      className={`w-full text-left p-2 rounded-xl text-xs font-medium transition-all ${
                        selectedVersionIndex === idx ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600 font-bold' : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      v{log.metadata?.version || 1} - {new Date(log.created_at).toLocaleDateString()}
                    </button>
                  ))
                )}
              </div>

              {/* Right Column: Diff viewer */}
              <div className="sm:col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Các thay đổi chi tiết</label>
                <div className="p-3 bg-slate-50 rounded-2xl border min-h-[160px] overflow-y-auto max-h-[300px] custom-scrollbar">
                  {getVersionDiffMarkup()}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setViewingVersionRule(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
