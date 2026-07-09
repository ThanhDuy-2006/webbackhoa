'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { signup } from '../login/actions'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    if (formData.get('password') !== formData.get('confirm_password')) {
      toast.error('Mật khẩu nhập lại không khớp!')
      return
    }

    setLoading(true)
    const result = await signup(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Đăng ký</CardTitle>
          <CardDescription className="text-center">
            Tạo tài khoản mới để mua sắm dễ dàng hơn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input id="full_name" name="full_name" type="text" placeholder="Nguyễn Văn A" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Nhập lại mật khẩu</Label>
              <Input id="confirm_password" name="confirm_password" type="password" required minLength={6} />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={loading}>
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-slate-500">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-emerald-600 hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
