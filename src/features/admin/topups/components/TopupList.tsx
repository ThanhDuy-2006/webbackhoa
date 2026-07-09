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

interface TopupListProps {
  initialData: TopupRequest[]
  total: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800 border-red-200' },
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
          />
          <Button type="submit" variant="secondary">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="rejected">Từ chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Nội dung CK</TableHead>
              <TableHead>Minh chứng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-slate-500">
                  Không có yêu cầu nạp tiền nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((topup) => (
                <TableRow key={topup.id}>
                  <TableCell>
                    {format(new Date(topup.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{topup.profiles?.full_name || 'Khách'}</p>
                      <p className="text-xs text-slate-500">{topup.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-emerald-600">
                    +{topup.amount.toLocaleString('vi-VN')} VND
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-pink-600">
                      {topup.transfer_content}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedImage(topup.proof_image_url)}
                      className="text-emerald-600 hover:text-emerald-800"
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
                  <TableCell className="text-right space-x-2">
                    {topup.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          disabled={loading === topup.id}
                          onClick={() => handleApprove(topup.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-red-600 border-red-200 hover:bg-red-50"
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ảnh minh chứng chuyển khoản</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {selectedImage && (
              <img src={selectedImage} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded-md" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, id: null })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Từ chối nạp tiền</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Lý do từ chối</Label>
              <Textarea 
                placeholder="Ví dụ: Không nhận được tiền, nội dung sai..." 
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={loading === rejectDialog.id || !rejectNote.trim()}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
