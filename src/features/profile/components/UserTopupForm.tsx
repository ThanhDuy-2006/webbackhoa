'use client'

import { useState } from 'react'
import { submitTopupRequestAction } from '@/actions/user/topup.actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Info, Landmark } from 'lucide-react'
import { motion } from 'framer-motion'

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
      {/* Left Column: Transfer Info & Form */}
      <div className="space-y-6">
        {/* Bank Details Card (Integrated at the top) */}
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
            <Landmark className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Thông tin chuyển khoản</h4>
          </div>
          <div className="grid grid-cols-2 gap-y-2.5 text-xs">
            <span className="text-slate-500">Ngân hàng:</span>
            <strong className="text-right text-slate-800 dark:text-slate-200">MB Bank (Quân Đội)</strong>
            <span className="text-slate-500">Số tài khoản:</span>
            <strong className="text-right text-slate-800 dark:text-slate-200 font-mono tracking-wider">0123456789</strong>
            <span className="text-slate-500">Chủ tài khoản:</span>
            <strong className="text-right text-slate-800 dark:text-slate-200">NGUYEN VAN A</strong>
            <span className="text-slate-500">Nội dung CK:</span>
            <strong className="text-right text-emerald-600 dark:text-emerald-400 font-mono">{content}</strong>
          </div>
        </div>

        {/* Guide Notice */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50 flex gap-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-400">
          <Info className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>
            <strong>Hướng dẫn:</strong> Vui lòng chuyển tiền đúng thông tin tài khoản trên. Sau đó chụp màn hình chuyển khoản thành công và nhập đường dẫn hình ảnh minh chứng để gửi yêu cầu duyệt nạp tiền.
          </p>
        </div>

        {/* Form Inputs */}
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
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer h-11 font-bold rounded-xl shadow-sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Gửi yêu cầu xác nhận
          </Button>
        </form>
      </div>

      {/* Right Column: Beautiful Payment Wallet Animation */}
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-slate-100 dark:border-slate-900 min-h-[350px] relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Credit Card and Wallet Animation */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Outer rotating ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-emerald-500/20 dark:border-emerald-500/10 rounded-full"
          />

          {/* Floating shield representing security */}
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3 z-10"
          >
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
              <Landmark className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Thanh Toán An Toàn</span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Gửi Yêu Cầu Duyệt Nạp</p>
            </div>
          </motion.div>

          {/* Floating Coin 1 */}
          <motion.div
            animate={{
              y: [0, -15, 0],
              x: [0, 5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute top-6 right-6 bg-amber-400 text-amber-950 w-8 h-8 rounded-full flex items-center justify-center font-black shadow-md border-2 border-white z-20"
          >
            $
          </motion.div>

          {/* Floating Coin 2 */}
          <motion.div
            animate={{
              y: [0, -12, 0],
              x: [0, -5, 0],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute bottom-6 left-6 bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-black shadow-md border-2 border-white z-20"
          >
            ✓
          </motion.div>
        </div>

        <div className="text-center space-y-2 max-w-xs mt-6 z-10">
          <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Giao dịch bảo mật 256-bit</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Yêu cầu nạp tiền của bạn sẽ được chuyển tiếp đến trang quản trị để phê duyệt ngay khi nhận được minh chứng chuyển khoản của bạn.
          </p>
        </div>
      </div>
    </div>
  )
}
