'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { resetPassword } from './actions'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await resetPassword(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      setIsSuccess(true)
      setLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center py-8">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Đã gửi email khôi phục</CardTitle>
            <CardDescription className="text-base mx-auto max-w-[300px]">
              Chúng tôi đã gửi một liên kết khôi phục mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư đến (và mục thư rác).
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-4">
            <Link href="/login" className="text-emerald-600 font-medium hover:underline flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Quên mật khẩu</CardTitle>
          <CardDescription className="text-center">
            Nhập email tài khoản của bạn để nhận liên kết khôi phục mật khẩu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={loading}>
              {loading ? 'Đang gửi yêu cầu...' : 'Gửi liên kết khôi phục'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-emerald-600 hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Quay lại trang đăng nhập
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
