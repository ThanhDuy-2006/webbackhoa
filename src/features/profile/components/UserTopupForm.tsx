'use client'

import { useState } from 'react'
import { submitTopupRequestAction } from '@/actions/user/topup.actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

// Dummy QR Code generator for demo. In real app, use VietQR API.
const getVietQRUrl = (amount: number, content: string) => {
  // Thay thế bằng số tài khoản thật của bạn
  const bankId = 'MB'
  const accountNo = '0123456789'
  const accountName = 'NGUYEN VAN A'
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`
}

export function UserTopupForm({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number>(100000)
  
  // Create a unique content prefix for this user to track easily
  const shortId = userId.substring(0, 6).toUpperCase()
  const defaultContent = `NAPTIEN ${shortId}`
  const [content, setContent] = useState(defaultContent)
  const [proofImage, setProofImage] = useState('')

  const qrUrl = getVietQRUrl(amount, content)

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
    <div className="bg-white p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Gửi yêu cầu nạp tiền</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền nạp (VND) *</Label>
            <Input 
              id="amount"
              type="text"
              value={amount ? amount.toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setAmount(Number(val))
              }}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Nội dung chuyển khoản *</Label>
            <Input 
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500">
              Vui lòng giữ nguyên hoặc ghi nhớ nội dung này khi chuyển khoản. Mỗi yêu cầu cần một nội dung riêng biệt.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofImage">Ảnh minh chứng (URL) *</Label>
            <Input 
              id="proofImage"
              placeholder="https://imgur.com/..."
              value={proofImage}
              onChange={(e) => setProofImage(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500">
              Trong thực tế, bạn có thể tích hợp Supabase Storage để user upload ảnh thay vì nhập URL.
            </p>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Gửi yêu cầu xác nhận
          </Button>
        </form>
      </div>

      <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-lg border border-dashed border-slate-300">
        <h3 className="text-md font-medium text-slate-700 mb-4">Quét mã QR để chuyển khoản nhanh</h3>
        <div className="bg-white p-2 rounded-lg shadow-sm">
          <img src={qrUrl} alt="VietQR" className="w-64 h-64 object-contain" />
        </div>
        <div className="mt-4 text-sm text-center text-slate-600 space-y-1">
          <p>Ngân hàng: <strong>MB Bank</strong></p>
          <p>STK: <strong>0123456789</strong></p>
          <p>Chủ tài khoản: <strong>NGUYEN VAN A</strong></p>
        </div>
      </div>
    </div>
  )
}
