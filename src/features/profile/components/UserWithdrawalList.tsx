'use client'

import { WithdrawalRequest } from '@/types/withdrawal.type'
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
import { formatCurrency } from '@/lib/utils'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'

interface UserWithdrawalListProps {
  data: WithdrawalRequest[]
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  approved: { label: 'Đã chuyển tiền', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Từ chối', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle },
}

export function UserWithdrawalList({ data }: UserWithdrawalListProps) {
  return (
    <div className="border rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/70 dark:bg-slate-950/40">
            <TableHead className="font-bold">Ngày gửi</TableHead>
            <TableHead className="font-bold">Ngân hàng</TableHead>
            <TableHead className="font-bold">Tài khoản nhận</TableHead>
            <TableHead className="font-bold">Số tiền rút</TableHead>
            <TableHead className="font-bold">Trạng thái</TableHead>
            <TableHead className="font-bold">Ghi chú từ Admin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-32 text-slate-500 text-xs">
                Bạn chưa có yêu cầu rút tiền nào
              </TableCell>
            </TableRow>
          ) : (
            data.map((req) => {
              const statusInfo = STATUS_MAP[req.status] || STATUS_MAP.pending
              const Icon = statusInfo.icon

              return (
                <TableRow key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                    {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {req.bank_name}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300 font-bold">
                        {req.account_number}
                      </code>
                      <p className="text-[11px] text-slate-500 font-bold uppercase">{req.account_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                    -{formatCurrency(req.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 font-semibold text-[11px] ${statusInfo.color}`}>
                      <Icon className="w-3 h-3" />
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                    {req.admin_note ? (
                      <span className={req.status === 'rejected' ? 'text-rose-600 font-medium' : ''}>
                        {req.admin_note}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
