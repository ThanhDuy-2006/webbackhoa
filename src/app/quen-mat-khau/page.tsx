'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { resetPassword } from './actions'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Sprout, Loader2 } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50/40 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative">
      {/* Top brand link */}
      <Link href="/login" className="absolute top-6 left-6 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại đăng nhập</span>
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
          {isSuccess ? (
            <CardHeader className="space-y-3 text-center py-8">
              <div className="mx-auto w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Đã gửi email khôi phục!
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 max-w-[320px] mx-auto leading-relaxed">
                Chúng tôi đã gửi liên kết đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).
              </CardDescription>
              <div className="pt-3">
                <Link href="/login">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs font-bold">
                    Quay lại trang Đăng nhập
                  </Button>
                </Link>
              </div>
            </CardHeader>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4 text-center">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Quên mật khẩu?
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Nhập địa chỉ email đăng ký để nhận liên kết khôi phục mật khẩu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email của bạn</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      placeholder="ten_ban@example.com" 
                      required 
                      className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 text-sm"
                    />
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-sm font-bold shadow-xs cursor-pointer" 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi yêu cầu...</>
                    ) : (
                      'Gửi email khôi phục'
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 py-3.5">
                <Link href="/login" className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Quay lại đăng nhập
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
