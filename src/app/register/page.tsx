'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { signup } from '../login/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MorphPasswordToggle } from '@/components/ui/morph-icon'
import { Sprout, Loader2, ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setInfoMessage(null)
    if (formData.get('password') !== formData.get('confirm_password')) {
      toast.error('Mật khẩu nhập lại không khớp!')
      return
    }

    setLoading(true)
    try {
      const result = await signup(formData)
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.needConfirmation && result?.message) {
        setInfoMessage(result.message)
        toast.success('Đăng ký thành công! Vui lòng xác nhận email.')
      }
    } catch {
      toast.error('Có lỗi xảy ra khi đăng ký')
    } finally {
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
              Tạo tài khoản mới
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Đăng ký để tham gia cộng đồng mua sắm và đăng bán tại Bách Hóa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {infoMessage ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl text-xs space-y-3">
                <p className="font-medium leading-relaxed">{infoMessage}</p>
                <Button 
                  onClick={() => router.push('/login')} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                >
                  Chuyển tới Đăng nhập
                </Button>
              </div>
            ) : (
              <form action={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Họ và tên</Label>
                  <Input 
                    id="full_name" 
                    name="full_name" 
                    type="text" 
                    placeholder="Nguyễn Văn A" 
                    required 
                    className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-sm"
                  />
                </div>
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
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mật khẩu</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      minLength={6} 
                      placeholder="Ít nhất 6 ký tự"
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
                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nhập lại mật khẩu</Label>
                  <div className="relative">
                    <Input 
                      id="confirm_password" 
                      name="confirm_password" 
                      type={showConfirmPassword ? "text" : "password"} 
                      required 
                      minLength={6} 
                      placeholder="Nhập lại mật khẩu"
                      className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 pr-10 text-sm"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <MorphPasswordToggle 
                        isVisible={showConfirmPassword} 
                        onToggle={() => setShowConfirmPassword(!showConfirmPassword)} 
                      />
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-sm font-bold shadow-xs cursor-pointer mt-2" 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo tài khoản...</>
                  ) : (
                    'Đăng ký tài khoản'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 py-3.5">
            <p className="text-xs text-slate-500">
              Đã có tài khoản?{' '}
              <Link href="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                Đăng nhập
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
