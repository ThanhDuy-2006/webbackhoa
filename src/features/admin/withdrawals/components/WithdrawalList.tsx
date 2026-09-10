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
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Đã duyệt & Chuyển tiền', color: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Từ chối (Đã hoàn tiền)', color: 'bg-red-100 text-red-800 border-red-200' },
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
            className="rounded-xl"
          />
          <Button type="submit" variant="secondary" className="rounded-xl">
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
          <SelectTrigger className="w-[200px] rounded-xl">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="rejected">Từ chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      <div className="border rounded-2xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70">
              <TableHead className="font-bold">Ngày tạo</TableHead>
              <TableHead className="font-bold">Khách hàng</TableHead>
              <TableHead className="font-bold">Số tiền rút</TableHead>
              <TableHead className="font-bold">Thông tin ngân hàng nhận</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="font-bold">Ghi chú</TableHead>
              <TableHead className="text-right font-bold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-500 text-xs">
                  Không có yêu cầu rút tiền nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 text-xs">{item.profiles?.full_name || 'Khách hàng'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-rose-600 text-sm whitespace-nowrap">
                      -{formatCurrency(item.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {item.bank_name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">
                          {item.account_number}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.account_number, item.id)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                          title="Sao chép số tài khoản"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wide">
                        {item.account_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] font-semibold ${STATUS_MAP[item.status]?.color}`}>
                      {STATUS_MAP[item.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-xs">
                    {item.admin_note ? (
                      <span className={item.status === 'rejected' ? 'text-rose-600' : ''}>
                        {item.admin_note}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {item.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-200 hover:bg-green-50 rounded-xl font-bold text-xs gap-1"
                          disabled={loading === item.id}
                          onClick={() => handleApprove(item)}
                        >
                          <CheckCircle className="h-4 w-4" /> Duyệt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold text-xs gap-1"
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
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Từ chối yêu cầu rút tiền
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs text-slate-600">
            <p>
              Bạn đang từ chối yêu cầu rút <strong className="text-slate-900">{formatCurrency(rejectDialog.amount)}</strong> của <strong className="text-slate-900">{rejectDialog.user}</strong>.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
              ⚠️ Số tiền <strong>{formatCurrency(rejectDialog.amount)}</strong> sẽ được <strong>tự động hoàn trả ngay lập tức</strong> vào ví của người dùng sau khi xác nhận.
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectReason" className="font-bold text-slate-800 text-xs">
                Lý do từ chối (Gửi thông báo đến người dùng) *
              </Label>
              <Textarea
                id="rejectReason"
                placeholder="Ví dụ: Số tài khoản ngân hàng không tồn tại, tên chủ tài khoản không khớp..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="rounded-xl min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, id: null, amount: 0, user: '' })}
              className="rounded-xl"
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
