'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserProfile } from '@/types/user.type'
import { updateUserRoleAction, updateUserBlockStatusAction } from '@/actions/admin/user.actions'
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
import { Search, ShieldAlert, ShieldCheck, Lock, Unlock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface UserListProps {
  initialData: UserProfile[]
  total: number
}

export function UserList({ initialData, total }: UserListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggleRole = async (user: UserProfile) => {
    if (!confirm(`Bạn muốn đổi quyền của ${user.email} thành ${user.role === 'admin' ? 'USER' : 'ADMIN'}?`)) return
    
    setLoading(user.id)
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin'
      const result = await updateUserRoleAction(user.id, newRole)
      if (result.success) {
        toast.success('Đổi quyền thành công')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    } finally {
      setLoading(null)
    }
  }

  const handleToggleBlock = async (user: UserProfile) => {
    const actionName = user.is_blocked ? 'Mở khóa' : 'Khóa'
    if (!confirm(`Bạn chắc chắn muốn ${actionName.toLowerCase()} tài khoản ${user.email}?`)) return
    
    setLoading(user.id)
    try {
      const result = await updateUserBlockStatusAction(user.id, !user.is_blocked)
      if (result.success) {
        toast.success(`${actionName} tài khoản thành công`)
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
            placeholder="Tìm email, tên, sđt..." 
            defaultValue={searchParams.get('search') || ''}
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        
        <div className="flex gap-2">
          <Select 
            value={searchParams.get('role') || 'all'} 
            onValueChange={(val) => {
              const params = new URLSearchParams(searchParams.toString())
              if (val && val !== 'all') params.set('role', val)
              else params.delete('role')
              router.push(`?${params.toString()}`)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tất cả quyền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả quyền</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={searchParams.get('status') || 'all'} 
            onValueChange={(val) => {
              const params = new URLSearchParams(searchParams.toString())
              if (val && val !== 'all') params.set('status', val)
              else params.delete('status')
              router.push(`?${params.toString()}`)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="blocked">Đã khóa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Số dư ví</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-slate-500">
                  Không tìm thấy người dùng nào
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{user.full_name || 'Khách'}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-emerald-600">
                    {user.balance.toLocaleString('vi-VN')} VND
                  </TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <Badge variant="destructive">Đã khóa</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Hoạt động</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      title={user.role === 'admin' ? 'Hạ quyền thành User' : 'Nâng quyền Admin'}
                      disabled={loading === user.id}
                      onClick={() => handleToggleRole(user)}
                    >
                      {user.role === 'admin' ? <ShieldAlert className="h-4 w-4 text-orange-500" /> : <ShieldCheck className="h-4 w-4 text-purple-600" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      title={user.is_blocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                      disabled={loading === user.id}
                      onClick={() => handleToggleBlock(user)}
                    >
                      {user.is_blocked ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-red-600" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
