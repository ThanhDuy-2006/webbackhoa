'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { WithdrawalRequest } from '@/types/withdrawal.type'
import { approveWithdrawalAction, rejectWithdrawalAction } from '@/actions/admin/withdrawal.actions'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Search, CheckCircle, XCircle, Copy, Check, Clock, User, Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

interface WithdrawalListProps {
  initialData: WithdrawalRequest[]
  total: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Đã duyệt & Chuyển tiền', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  rejected: { label: 'Từ chối (Đã hoàn tiền)', color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
}

export function WithdrawalList({ initialData, total }: WithdrawalListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null; amount: number; user: string }>({
    open: false,
    id: null,
    amount: 0,
    user: ''
  })
  const [rejectNote, setRejectNote] = useState('')

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success(`Đã sao chép số tài khoản: ${text}`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    if (!confirm(`Bạn xác nhận đã chuyển khoản thành công ${formatCurrency(withdrawal.amount)} cho ${withdrawal.account_name} (${withdrawal.bank_name} - ${withdrawal.account_number})?`)) {
      return
    }

    setLoading(withdrawal.id)
    try {
      const result = await approveWithdrawalAction(withdrawal.id)
      if (result.success) {
        toast.success('Duyệt yêu cầu rút tiền thành công!')
        router.refresh()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error: any) {
      toast.error('Có lỗi xảy ra khi xử lý')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.id || !rejectNote.trim()) {
      toast.error('Vui lòng nhập lý do từ chối yêu cầu rút tiền')
      return
    }

    setLoading(rejectDialog.id)
    try {
      const result = await rejectWithdrawalAction(rejectDialog.id, rejectNote)
      if (result.success) {
        toast.success('Đã từ chối yêu cầu. Số tiền đã được tự động hoàn trả lại ví cho khách hàng!')
        setRejectDialog({ open: false, id: null, amount: 0, user: '' })
        setRejectNote('')
        router.refresh()
      } else {
        toast.error(result.error || 'Có lỗi xảy ra')
      }
    } catch (error: any) {
      toast.error('Có lỗi xảy ra khi xử lý')
    } finally {
      setLoading(null)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = formData.get('q') as string

    const params = new URLSearchParams(searchParams.toString())
    if (q) params.set('search', q)
    else params.delete('search')

    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <Input
            name="q"
            placeholder="Tìm theo STK, chủ tài khoản, ngân hàng..."
            defaultValue={searchParams.get('search') || ''}
            className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
          <Button type="submit" variant="secondary" className="rounded-xl cursor-pointer">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select
          value={searchParams.get('status') || 'all'}
          onValueChange={(val) => {
            const params = new URLSearchParams(searchParams.toString())
            if (val && val !== 'all') params.set('status', val)
            else params.delete('status')
            router.push(`?${params.toString()}`)
          }}
        >
          <SelectTrigger className="w-[200px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="rejected">Từ chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <TableHead className="font-bold">Ngày tạo</TableHead>
              <TableHead className="font-bold">Khách hàng</TableHead>
              <TableHead className="font-bold">Số tiền rút</TableHead>
              <TableHead className="font-bold">Thông tin ngân hàng nhận</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="font-bold">Ghi chú</TableHead>
              <TableHead className="text-right font-bold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-400 dark:text-slate-500 text-xs">
                  Không có yêu cầu rút tiền nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{item.profiles?.full_name || 'Khách hàng'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                      -{formatCurrency(item.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {item.bank_name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.account_number}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.account_number, item.id)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
                          title="Sao chép số tài khoản"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide">
                        {item.account_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] font-semibold ${STATUS_MAP[item.status]?.color}`}>
                      {STATUS_MAP[item.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                    {item.admin_note ? (
                      <span className={item.status === 'rejected' ? 'text-rose-600 dark:text-rose-400' : ''}>
                        {item.admin_note}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {item.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl font-bold text-xs gap-1"
                          disabled={loading === item.id}
                          onClick={() => handleApprove(item)}
                        >
                          <CheckCircle className="h-4 w-4" /> Duyệt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 dark:border-red-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl font-bold text-xs gap-1"
                          disabled={loading === item.id}
                          onClick={() => {
                            setRejectDialog({
                              open: true,
                              id: item.id,
                              amount: item.amount,
                              user: item.account_name || item.profiles?.full_name || 'khách hàng'
                            })
                          }}
                        >
                          <XCircle className="h-4 w-4" /> Từ chối
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, id: null, amount: 0, user: '' })}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Từ chối yêu cầu rút tiền
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs text-slate-600 dark:text-slate-400">
            <p>
              Bạn đang từ chối yêu cầu rút <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(rejectDialog.amount)}</strong> của <strong className="text-slate-900 dark:text-slate-100">{rejectDialog.user}</strong>.
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              ⚠️ Số tiền <strong>{formatCurrency(rejectDialog.amount)}</strong> sẽ được <strong>tự động hoàn trả ngay lập tức</strong> vào ví của người dùng sau khi xác nhận.
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectReason" className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Lý do từ chối (Gửi thông báo đến người dùng) *
              </Label>
              <Textarea
                id="rejectReason"
                placeholder="Ví dụ: Số tài khoản ngân hàng không tồn tại, tên chủ tài khoản không khớp..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="rounded-xl min-h-[90px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, id: null, amount: 0, user: '' })}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading === rejectDialog.id || !rejectNote.trim()}
              className="rounded-xl font-bold"
            >
              Xác nhận từ chối & Hoàn tiền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
