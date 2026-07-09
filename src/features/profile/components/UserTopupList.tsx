'use client'

import { TopupRequest } from '@/types/topup.type'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface UserTopupListProps {
  data: TopupRequest[]
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800 border-red-200' },
}

export function UserTopupList({ data }: UserTopupListProps) {
  return (
    <div className="border rounded-md bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày gửi</TableHead>
            <TableHead>Nội dung CK</TableHead>
            <TableHead>Số tiền</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ghi chú từ Admin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-32 text-slate-500">
                Bạn chưa có lịch sử nạp tiền nào
              </TableCell>
            </TableRow>
          ) : (
            data.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {req.transfer_content}
                  </code>
                </TableCell>
                <TableCell className="font-medium text-emerald-600">
                  +{req.amount.toLocaleString('vi-VN')} VND
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_MAP[req.status]?.color}>
                    {STATUS_MAP[req.status]?.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {req.admin_note || '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
