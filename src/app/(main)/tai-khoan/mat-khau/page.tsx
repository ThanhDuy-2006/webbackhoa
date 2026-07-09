'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from './actions'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

export default function MatKhauPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setSuccess(false)
    const result = await updatePassword(formData)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Đổi mật khẩu thành công')
      setSuccess(true)
      // Reset form
      const form = document.getElementById('change-password-form') as HTMLFormElement
      if (form) form.reset()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Đổi mật khẩu</h1>
        <p className="text-slate-500 mt-2">Cập nhật mật khẩu mới để bảo mật tài khoản của bạn.</p>
      </div>

      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <form id="change-password-form" action={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          {success && (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start gap-3 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                Mật khẩu của bạn đã được thay đổi thành công. Lần đăng nhập tiếp theo vui lòng sử dụng mật khẩu mới.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Mật khẩu mới</Label>
              <Input 
                id="new_password" 
                name="new_password" 
                type="password" 
                required 
                placeholder="Nhập mật khẩu mới..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
              <Input 
                id="confirm_password" 
                name="confirm_password" 
                type="password" 
                required 
                placeholder="Nhập lại mật khẩu mới..."
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 h-11 px-8 rounded-xl font-medium"
              disabled={loading}
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

