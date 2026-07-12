'use client'

import { useState, useTransition } from 'react'
import { Edit, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '@/actions/user/profile.actions'
import { toast } from 'sonner'

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
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
  })

  const memberSince = new Date(profile.created_at).toLocaleDateString('vi-VN')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateProfile(formData)
      if (res?.success) {
        toast.success('Cập nhật hồ sơ thành công')
        setIsOpen(false)
      } else {
        toast.error(res?.error || 'Có lỗi xảy ra')
      }
    })
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Hồ sơ cá nhân</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Thông tin cơ bản và liên hệ của bạn</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="shrink-0 rounded-xl font-medium cursor-pointer dark:bg-slate-900 dark:border-slate-700">
              <Edit className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-slate-100">Chỉnh sửa hồ sơ</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="dark:text-slate-300">Họ và tên</Label>
                <Input 
                  id="full_name" 
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nhập họ và tên..."
                  className="dark:bg-slate-950 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="dark:text-slate-300">Số điện thoại</Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Nhập số điện thoại..."
                  className="dark:bg-slate-950 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Email</Label>
                <Input 
                  value={profile.email}
                  disabled
                  className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                />
                <p className="text-[10px] text-slate-400">Email không thể thay đổi</p>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700">
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-950 shadow-md overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-slate-300 dark:text-slate-500 font-bold">
                  {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button className="absolute bottom-1 right-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-full shadow-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-600 dark:hover:border-emerald-500 transition-colors cursor-pointer">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Họ và tên</label>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100 text-base">{profile.full_name || 'Chưa cập nhật'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</label>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100 text-base">{profile.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Số điện thoại</label>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100 text-base">{profile.phone || 'Chưa cập nhật'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Ngày tham gia</label>
            <p className="mt-1 font-medium text-slate-900 dark:text-slate-100 text-base">{memberSince}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Vai trò</label>
            <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full inline-block text-sm">
              {profile.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
