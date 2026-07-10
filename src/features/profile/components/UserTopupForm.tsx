'use client'

import { useState } from 'react'
import { submitTopupRequestAction } from '@/actions/user/topup.actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Info, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UserTopupForm({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number>(100000)
  
  // Create a unique content prefix for this user to track easily
  const shortId = userId.substring(0, 6).toUpperCase()
  const defaultContent = `NAPTIEN ${shortId}`
  const [content, setContent] = useState(defaultContent)
  const [proofImage, setProofImage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (amount <= 0) return toast.error('Số tiền không hợp lệ')
    if (!content.trim()) return toast.error('Vui lòng nhập nội dung CK')
    if (!proofImage.trim()) return toast.error('Vui lòng cung cấp link ảnh minh chứng (URL)')

    setLoading(true)
    try {
      const result = await submitTopupRequestAction({
        amount,
        transfer_content: content,
        proof_image_url: proofImage
      })

      if (result.success) {
        toast.success('Gửi yêu cầu thành công! Admin sẽ duyệt sớm nhất.')
        setAmount(100000)
        setContent(`${defaultContent} ${Math.floor(Math.random() * 1000)}`) // Add random suffix to avoid duplicate content error next time
        setProofImage('')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Gửi yêu cầu nạp tiền</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-slate-700 dark:text-slate-300">Số tiền nạp (VND) *</Label>
            <Input 
              id="amount"
              type="text"
              value={amount ? amount.toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setAmount(Number(val))
              }}
              required
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content" className="text-slate-700 dark:text-slate-300">Nội dung chuyển khoản *</Label>
            <Input 
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
            <p className="text-xs text-slate-400">
              Vui lòng giữ nguyên hoặc ghi nhớ nội dung này khi chuyển khoản. Mỗi yêu cầu cần một nội dung riêng biệt.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofImage" className="text-slate-700 dark:text-slate-300">Ảnh minh chứng (URL) *</Label>
            <Input 
              id="proofImage"
              placeholder="https://imgur.com/..."
              value={proofImage}
              onChange={(e) => setProofImage(e.target.value)}
              required
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
            <p className="text-xs text-slate-400">
              Trong thực tế, bạn có thể tích hợp Supabase Storage để user upload ảnh thay vì nhập URL.
            </p>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer h-11 font-bold rounded-xl shadow-sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Gửi yêu cầu xác nhận
          </Button>
        </form>
      </div>

      <div className="flex flex-col justify-center bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-900 pb-3">
          <Landmark className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-md font-extrabold text-slate-800 dark:text-slate-200">Thông tin chuyển khoản</h3>
        </div>

        <div className="space-y-3.5 text-sm">
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
            <span className="text-slate-500">Ngân hàng:</span>
            <strong className="text-slate-800 dark:text-slate-200">MB Bank (Quân Đội)</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
            <span className="text-slate-500">Số tài khoản:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono tracking-wider">0123456789</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
            <span className="text-slate-500">Chủ tài khoản:</span>
            <strong className="text-slate-800 dark:text-slate-200">NGUYEN VAN A</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
            <span className="text-slate-500">Nội dung CK:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{content}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Số tiền:</span>
            <strong className="text-red-600 dark:text-red-400">{amount ? amount.toLocaleString('vi-VN') : '0'} VND</strong>
          </div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50 flex gap-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-400">
          <Info className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>
            <strong>Hướng dẫn:</strong> Vui lòng chuyển tiền đúng thông tin tài khoản trên. Sau đó chụp màn hình chuyển khoản thành công và dán URL hình ảnh minh chứng vào ô bên cạnh để gửi yêu cầu duyệt nạp tiền.
          </p>
        </div>
      </div>
    </div>
  )
}
