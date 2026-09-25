'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Trash2, 
  Eye, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Server,
  FileText,
  History,
  HardDrive,
  Info,
  ChevronRight,
  X,
  Code
} from 'lucide-react'
import { 
  getDatabaseMaintenanceStats, 
  previewDatabaseCleanup, 
  executeDatabaseCleanup, 
  getDatabaseMaintenanceHistory 
} from '@/actions/admin/maintenance.actions'
import { toast } from 'sonner'

interface Props {
  initialStats: any
  initialHistory: any[]
}

export function DatabaseMaintenanceClient({ initialStats, initialHistory }: Props) {
  const [statsData, setStatsData] = useState<any>(initialStats)
  const [history, setHistory] = useState<any[]>(initialHistory || [])
  const [retentionDays, setRetentionDays] = useState<number>(180)
  const [batchSize, setBatchSize] = useState<number>(5000)
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [cleanupResult, setCleanupResult] = useState<any | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [selectedRunDetail, setSelectedRunDetail] = useState<any | null>(null)

  const summary = statsData?.summary || {}
  const tableList: any[] = statsData?.tables || []

  const handleRefresh = async () => {
    setIsLoadingStats(true)
    try {
      const [statsRes, historyRes] = await Promise.all([
        getDatabaseMaintenanceStats(),
        getDatabaseMaintenanceHistory(15)
      ])

      if (statsRes.success) {
        setStatsData(statsRes.data)
      }
      if (historyRes.success) {
        setHistory(historyRes.data)
      }
      toast.success('Đã làm mới thông số database & lịch sử')
    } catch {
      toast.error('Có lỗi xảy ra khi làm mới thông tin')
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleDryRun = async () => {
    setIsProcessing(true)
    try {
      const res = await previewDatabaseCleanup(retentionDays, batchSize)
      if (res.success) {
        setCleanupResult(res.data)
        toast.success('Đã quét xong xem trước (Dry Run)')
      } else {
        toast.error(res.error || 'Lỗi khi quét xem trước')
      }
    } catch {
      toast.error('Có lỗi xảy ra khi xem trước dọn dẹp')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExecuteCleanup = async () => {
    setShowConfirmModal(false)
    setIsProcessing(true)
    try {
      const res = await executeDatabaseCleanup(retentionDays, batchSize)
      if (res.success) {
        setCleanupResult(res.data)
        toast.success(`Dọn dẹp hoàn tất! Đã xóa ${res.data.total_rows.toLocaleString('vi-VN')} bản ghi rác.`)
        // Refresh stats & history
        const [statsRes, historyRes] = await Promise.all([
          getDatabaseMaintenanceStats(),
          getDatabaseMaintenanceHistory(15)
        ])
        if (statsRes.success) setStatsData(statsRes.data)
        if (historyRes.success) setHistory(historyRes.data)
      } else {
        toast.error(res.error || 'Lỗi khi thực hiện dọn dẹp')
      }
    } catch {
      toast.error('Có lỗi xảy ra khi dọn dẹp database')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bảo trì & Dọn dẹp Database</h1>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-xs">
              PostgreSQL Maintenance
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Kiểm soát Dead Tuples, thu hồi tài nguyên, dọn dẹp dữ liệu rác và bảo vệ toàn vẹn lịch sử giao dịch.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoadingStats || isProcessing}
          className="rounded-xl h-10 gap-2 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          Làm mới số liệu
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-100 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng bảng theo dõi</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {summary.tracked_tables_count || tableList.length || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                PostgreSQL Public Schema
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Tuples (Bản ghi)</p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">
                {Number(summary.total_live_tuples || 0).toLocaleString('vi-VN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dữ liệu đang hoạt động
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dead Tuples (Rác MVCC)</p>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
                {Number(summary.total_dead_tuples || 0).toLocaleString('vi-VN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tỷ lệ rác: {summary.avg_dead_tuple_percent || 0}%
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dung lượng Database</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {summary.total_size_pretty || 'N/A'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bao gồm bảng & Indexes
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Architectural Banner: Application Pruning vs Autovacuum */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Nguyên tắc vận hành: Application Pruning & PostgreSQL Autovacuum</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          Khi hệ thống thực hiện <strong>DELETE</strong> các bản ghi rác (Application Pruning), dữ liệu sẽ được đánh dấu thành <strong>Dead Tuples</strong>. Trình nền <strong>PostgreSQL Autovacuum</strong> sẽ định kỳ tái chế các không gian này để ghi đè dữ liệu mới, ngăn chặn kích thước tệp vật lý phình to không giới hạn mà không cần khóa bảng (Zero Downtime).
        </p>
      </div>

      {/* Operation Controls & Preview / Result */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration & Controls */}
        <Card className="lg:col-span-1 rounded-2xl border-slate-100 shadow-xs bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              Thiết lập dọn dẹp
            </CardTitle>
            <CardDescription className="text-xs">Cấu hình thời hạn lưu trữ nhật ký trước khi dọn dẹp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Thời hạn lưu trữ nhật ký (Log Retention)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 90, label: '90 ngày', desc: 'Ngắn hạn' },
                  { value: 180, label: '180 ngày', desc: 'Mặc định' },
                  { value: 365, label: '365 ngày', desc: 'Dài hạn' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRetentionDays(item.value)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      retentionDays === item.value
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1.5 border border-slate-100">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Chính sách an toàn dữ liệu (Zero Data Loss):
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500">
                <li><strong>Sản phẩm:</strong> Sản phẩm đã có đơn hàng/đánh giá <u>tuyệt đối KHÔNG</u> bị hard-delete.</li>
                <li><strong>Nhật ký kho:</strong> Giữ tối thiểu 180 ngày để đảm bảo đối soát.</li>
                <li><strong>Giỏ hàng:</strong> Chỉ xóa giỏ hàng không hoạt động &gt; 30 ngày.</li>
                <li><strong>Session ảnh AI:</strong> Dọn dẹp session đã hết hạn &gt; 24 giờ.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-700 gap-2 cursor-pointer text-xs"
                onClick={handleDryRun}
                disabled={isProcessing}
              >
                <Eye className="w-4 h-4 text-blue-600" />
                {isProcessing ? 'Đang phân tích...' : 'Xem trước dọn dẹp (Dry Run)'}
              </Button>

              <Button
                className="w-full h-11 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white gap-2 shadow-xs cursor-pointer text-xs"
                onClick={() => setShowConfirmModal(true)}
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4" />
                {isProcessing ? 'Đang thực thi...' : 'Dọn dẹp database ngay'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Results / Dry Run Card */}
        <div className="lg:col-span-2 space-y-4">
          {cleanupResult ? (
            <Card className="rounded-2xl border-slate-100 shadow-xs bg-white overflow-hidden">
              <div className={`p-4 border-b flex items-center justify-between ${
                cleanupResult.dry_run ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100'
              }`}>
                <div className="flex items-center gap-2">
                  {cleanupResult.dry_run ? (
                    <Eye className="w-5 h-5 text-blue-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {cleanupResult.dry_run ? 'Kết quả xem trước (Dry Run - Chưa xóa thật)' : 'Đã dọn dẹp hoàn tất'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Thời gian: {cleanupResult.duration_ms}ms • Kích hoạt: {cleanupResult.trigger_type || 'manual'}
                    </p>
                  </div>
                </div>
                <Badge className={cleanupResult.dry_run ? 'bg-blue-600 text-xs' : 'bg-emerald-600 text-xs'}>
                  {cleanupResult.total_rows.toLocaleString('vi-VN')} bản ghi
                </Badge>
              </div>

              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Phiên ảnh AI hết hạn</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {cleanupResult.cleanup?.candidate_sessions || 0} phiên ({cleanupResult.cleanup?.candidate_items || 0} ảnh)
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Giỏ hàng bỏ quên (&gt;30d)</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {cleanupResult.cleanup?.abandoned_carts || 0}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Thông báo cũ</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {cleanupResult.cleanup?.notifications || 0}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Nhật ký Admin Logs</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {cleanupResult.cleanup?.admin_logs || 0}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Nhật ký Kho Logs</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {cleanupResult.cleanup?.inventory_logs || 0}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Cache ảnh không dùng</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {cleanupResult.cleanup?.image_cache || 0}
                    </div>
                  </div>
                </div>

                {/* Soft-deleted breakdown */}
                <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100/80">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1">
                    Bản ghi xóa mềm đủ điều kiện Purge (&gt;60 ngày, không có lịch sử đơn hàng):
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs text-amber-800">
                    <span>Sản phẩm: <strong>{cleanupResult.cleanup?.soft_deleted?.products || 0}</strong></span>
                    <span>Danh mục: <strong>{cleanupResult.cleanup?.soft_deleted?.categories || 0}</strong></span>
                    <span>Mã giảm giá: <strong>{cleanupResult.cleanup?.soft_deleted?.coupons || 0}</strong></span>
                    <span>Luật chia tiền: <strong>{cleanupResult.cleanup?.soft_deleted?.revenue_rules || 0}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-slate-100 shadow-xs bg-white p-6 text-center">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Chưa có lượt quét nào gần đây</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Bấm "Xem trước dọn dẹp" để phân tích số lượng bản ghi có thể giải phóng hoặc "Dọn dẹp ngay" để thực thi.
              </p>
            </Card>
          )}

          {/* Cron Automation Guide */}
          <Card className="rounded-2xl border-slate-100 shadow-xs bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                Thiết lập Cron Job tự động (Automated Schedule)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <p className="text-[11px]">
                Bạn có thể chạy tự động dọn dẹp hàng ngày lúc 03:00 sáng bằng cách gọi API route với <code>CRON_SECRET</code>:
              </p>
              <div className="p-2.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] overflow-x-auto">
                GET /api/cron/db-cleanup?retention=180
                <br />
                Authorization: Bearer &lt;CRON_SECRET&gt;
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PostgreSQL Table Statistics Table */}
      <Card className="rounded-2xl border-slate-100 shadow-xs bg-white overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Chi tiết bảng PostgreSQL (Table Statistics)</CardTitle>
            <CardDescription className="text-xs">Theo dõi số lượng dòng, dead tuples và trạng thái autovacuum từng bảng</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {tableList.length} tables
          </Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Tên bảng</th>
                <th className="py-3 px-3 text-right">Live Tuples</th>
                <th className="py-3 px-3 text-right">Dead Tuples</th>
                <th className="py-3 px-3 text-center">Tỷ lệ rác (%)</th>
                <th className="py-3 px-3 text-right">Dung lượng</th>
                <th className="py-3 px-4">Last Autovacuum</th>
                <th className="py-3 px-4">Last Autoanalyze</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tableList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Đang tải hoặc chưa có thông số thống kê từ PostgreSQL.
                  </td>
                </tr>
              ) : (
                tableList.map((tbl: any) => {
                  const deadPct = Number(tbl.dead_tuple_percent || 0)
                  return (
                    <tr key={tbl.table_name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                        {tbl.table_name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {Number(tbl.live_tuples || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                        {Number(tbl.dead_tuples || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          deadPct > 25 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : deadPct > 10 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {deadPct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {tbl.total_size_pretty || 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {tbl.last_autovacuum 
                          ? new Date(tbl.last_autovacuum).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                          : <span className="text-slate-400 italic">Chưa chạy</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {tbl.last_autoanalyze 
                          ? new Date(tbl.last_autoanalyze).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                          : <span className="text-slate-400 italic">Chưa chạy</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Maintenance History */}
      <Card className="rounded-2xl border-slate-100 shadow-xs bg-white overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base font-bold text-slate-900">Lịch sử dọn dẹp & bảo trì (Maintenance Runs)</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {history.length} lượt gần nhất
          </Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-3">Loại kích hoạt</th>
                <th className="py-3 px-3">Chế độ</th>
                <th className="py-3 px-3 text-right">Số dòng đã xóa</th>
                <th className="py-3 px-3 text-right">Thời gian chạy</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Chưa có lịch sử chạy bảo trì nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                history.map((run: any) => (
                  <tr key={run.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {new Date(run.started_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-600">
                      {run.trigger_type}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        run.dry_run ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {run.dry_run ? 'Dry Run' : 'Execute'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      {Number(run.rows_deleted || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {run.duration_ms ? `${run.duration_ms} ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        run.status === 'success' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : run.status === 'failed' 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {run.status === 'success' ? 'Thành công' : run.status === 'failed' ? 'Thất bại' : 'Đang chạy'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                        onClick={() => setSelectedRunDetail(run)}
                      >
                        <Code className="w-3.5 h-3.5 mr-1" />
                        JSON
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận dọn dẹp Database</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ xóa các bản ghi rác và nhật ký cũ.</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-100 space-y-1.5 leading-relaxed">
              <p>
                Hệ thống sẽ xóa các bản ghi nhật ký cũ hơn <strong>{retentionDays} ngày</strong>, các giỏ hàng bỏ quên, phiên ảnh tạm hết hạn và thông báo cũ.
              </p>
              <p className="font-semibold text-amber-900">
                Lưu ý: Toàn bộ đơn hàng, số dư ví và sản phẩm có lịch sử giao dịch đều được bảo vệ 100%.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button 
                onClick={handleExecuteCleanup}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Tiến hành dọn dẹp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Detail Modal */}
      {selectedRunDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-3 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Chi tiết kết quả chạy #{selectedRunDetail.id?.slice(0, 8)}</h3>
              <button 
                onClick={() => setSelectedRunDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px]">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedRunDetail.result || selectedRunDetail, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedRunDetail(null)}
                className="rounded-xl h-9 px-4 text-xs cursor-pointer"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
