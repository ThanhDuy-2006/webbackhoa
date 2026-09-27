'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TopupRequest } from '@/types/topup.type'
import { approveTopupAction, rejectTopupAction } from '@/actions/admin/topup.actions'
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
import { Search, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

interface TopupListProps {
  initialData: TopupRequest[]
  total: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Đã duyệt', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  rejected: { label: 'Từ chối', color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
}

export function TopupList({ initialData, total }: TopupListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState<string | null>(null)
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean, id: string | null }>({ open: false, id: null })
  const [rejectNote, setRejectNote] = useState('')

  const handleApprove = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn duyệt và cộng tiền cho giao dịch này?')) return
    
    setLoading(id)
    try {
      const result = await approveTopupAction(id)
      if (result.success) {
        toast.success('Duyệt giao dịch thành công. Tiền đã được cộng vào ví user.')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.id || !rejectNote.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }
    
    setLoading(rejectDialog.id)
    try {
      const result = await rejectTopupAction(rejectDialog.id, rejectNote)
      if (result.success) {
        toast.success('Đã từ chối giao dịch')
        setRejectDialog({ open: false, id: null })
        setRejectNote('')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
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
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <Input 
            name="q" 
            placeholder="Tìm theo nội dung chuyển khoản..." 
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
          <SelectTrigger className="w-[180px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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

      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <TableHead className="font-bold">Ngày tạo</TableHead>
              <TableHead className="font-bold">Khách hàng</TableHead>
              <TableHead className="font-bold">Số tiền</TableHead>
              <TableHead className="font-bold">Nội dung CK</TableHead>
              <TableHead className="font-bold">Minh chứng</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="text-right font-bold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-400 dark:text-slate-500 text-xs">
                  Không có yêu cầu nạp tiền nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((topup) => (
                <TableRow key={topup.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(topup.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{topup.profiles?.full_name || 'Khách'}</p>
                      <p className="text-[11px] text-slate-400">{topup.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(topup.amount)}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700">
                      {topup.transfer_content}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedImage(topup.proof_image_url)}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg text-xs"
                    >
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Xem ảnh
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_MAP[topup.status]?.color}>
                      {STATUS_MAP[topup.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1.5">
                    {topup.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl"
                          disabled={loading === topup.id}
                          onClick={() => handleApprove(topup.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-red-600 border-red-200 dark:border-red-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                          disabled={loading === topup.id}
                          onClick={() => {
                            setRejectDialog({ open: true, id: topup.id })
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Ảnh minh chứng chuyển khoản</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {selectedImage && (
              <img src={selectedImage} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, id: null })}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Từ chối nạp tiền</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Lý do từ chối</Label>
              <Textarea 
                placeholder="Ví dụ: Không nhận được tiền, nội dung sai..." 
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })} className="rounded-xl border-slate-200 dark:border-slate-800">
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={loading === rejectDialog.id || !rejectNote.trim()}
              className="rounded-xl"
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
