'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { login } from './actions'
import { toast } from 'sonner'
import { MorphPasswordToggle } from '@/components/ui/morph-icon'
import { Sprout, Loader2, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await login(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50/40 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative">
      {/* Top brand link */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Về trang chủ</span>
      </Link>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-200 dark:shadow-none transition-transform group-hover:scale-105 duration-300">
              <Sprout className="h-6 w-6 text-white" />
            </div>
          </Link>
          <h1 className="font-black text-2xl tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            Bách Hóa
          </h1>
        </div>

        {/* Card */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Chào mừng trở lại!
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Đăng nhập để tiếp tục mua sắm và quản lý tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="ten_ban@example.com" 
                  required 
                  className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mật khẩu</Label>
                  <Link href="/quen-mat-khau" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="••••••••"
                    className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 pr-10 text-sm"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <MorphPasswordToggle 
                      isVisible={showPassword} 
                      onToggle={() => setShowPassword(!showPassword)} 
                    />
                  </div>
                </div>
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-sm font-bold shadow-xs cursor-pointer" 
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang đăng nhập...</>
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 py-3.5">
            <p className="text-xs text-slate-500">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
