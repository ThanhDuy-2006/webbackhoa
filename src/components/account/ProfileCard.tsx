import { Edit, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Profile {
  full_name: string | null
  email: string
  phone: string | null
  role: string
  avatar_url?: string | null
  created_at: string
}

interface ProfileCardProps {
  profile: Profile
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const memberSince = new Date(profile.created_at).toLocaleDateString('vi-VN')

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Hồ sơ cá nhân</h2>
          <p className="text-slate-500 text-sm mt-1">Thông tin cơ bản và liên hệ của bạn</p>
        </div>
        <Button variant="outline" className="shrink-0 rounded-xl font-medium">
          <Edit className="w-4 h-4 mr-2" />
          Chỉnh sửa
        </Button>
      </div>
      
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-slate-300 font-bold">
                  {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button className="absolute bottom-1 right-1 bg-white border border-slate-200 p-2 rounded-full shadow-sm text-slate-600 hover:text-emerald-600 hover:border-emerald-600 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div>
            <label className="text-sm font-medium text-slate-500">Họ và tên</label>
            <p className="mt-1 font-medium text-slate-900 text-base">{profile.full_name || 'Chưa cập nhật'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">Email</label>
            <p className="mt-1 font-medium text-slate-900 text-base">{profile.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">Số điện thoại</label>
            <p className="mt-1 font-medium text-slate-900 text-base">{profile.phone || 'Chưa cập nhật'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">Giới tính</label>
            <p className="mt-1 font-medium text-slate-900 text-base">Chưa cập nhật</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">Ngày sinh</label>
            <p className="mt-1 font-medium text-slate-900 text-base">Chưa cập nhật</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">Ngày tham gia</label>
            <p className="mt-1 font-medium text-slate-900 text-base">{memberSince}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">Vai trò</label>
            <p className="mt-1 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block text-sm">
              {profile.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
