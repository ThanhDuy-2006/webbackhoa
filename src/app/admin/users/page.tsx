import { Metadata } from 'next'
import { UserRepository } from '@/repositories/user.repository'
import { UserList } from '@/features/admin/users/components/UserList'
import { AdminHeader } from '@/components/layout/AdminHeader'

export const metadata: Metadata = {
  title: 'Quản lý người dùng | Admin',
}

interface PageProps {
  searchParams: Promise<{
    role?: string
    status?: string
    search?: string
    page?: string
  }>
}

export default async function AdminUsersPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const limit = 20
  
  const filter = {
    role: searchParams.role,
    status: searchParams.status,
    search: searchParams.search,
    page,
    limit,
  }

  const { data: users, count } = await UserRepository.getUsers(filter)

  return (
    <div className="space-y-6">
      <AdminHeader 
        title="Quản lý người dùng" 
        description="Quản lý danh sách khách hàng, cập nhật quyền hạn hoặc khóa tài khoản." 
      />
      
      <UserList initialData={users} total={count} />
    </div>
  )
}
