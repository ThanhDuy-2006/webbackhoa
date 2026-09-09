'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Sparkles, Loader2, CheckCircle2, AlertCircle, RefreshCw, ShoppingBag, X } from 'lucide-react'
import { scanReceiptAction, ScannedReceiptItem } from '@/actions/receipt-scanner.actions'
import { toast } from 'sonner'

interface ReceiptScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportItems: (items: ScannedReceiptItem[]) => void
}

export function ReceiptScannerDialog({ open, onOpenChange, onImportItems }: ReceiptScannerDialogProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedResult, setScannedResult] = useState<{
    merchant?: string
    items: ScannedReceiptItem[]
    totalBill?: number
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  // Handle file selection (upload or camera)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WebP)!')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setSelectedImage(base64)
      setScannedResult(null)
      setErrorMessage(null)
      // Auto-trigger scanning
      handleScanImage(base64)
    }
    reader.readAsDataURL(file)
  }

  // Trigger Gemini AI scanning
  const handleScanImage = async (base64: string) => {
    setIsScanning(true)
    setErrorMessage(null)
    try {
      const res = await scanReceiptAction(base64)
      if (res.success && res.items && res.items.length > 0) {
        setScannedResult({
          merchant: res.merchantName,
          items: res.items,
          totalBill: res.totalBill,
        })
        toast.success(`Đã nhận diện thành công ${res.items.length} sản phẩm từ hóa đơn!`)
      } else {
        setErrorMessage(res.error || 'Không nhận diện được sản phẩm nào.')
        toast.error(res.error || 'Không nhận diện được sản phẩm.')
      }
    } catch (err: unknown) {
      const error = err as Error
      setErrorMessage(error.message || 'Lỗi khi quét hóa đơn')
      toast.error('Lỗi khi quét hóa đơn')
    } finally {
      setIsScanning(false)
    }
  }

  // Confirm import
  const handleConfirm = () => {
    if (!scannedResult || scannedResult.items.length === 0) return
    onImportItems(scannedResult.items)
    onOpenChange(false)
    // Reset state
    setSelectedImage(null)
    setScannedResult(null)
  }

  const handleReset = () => {
    setSelectedImage(null)
    setScannedResult(null)
    setErrorMessage(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
            Quét hóa đơn siêu thị / chợ bằng AI
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Chụp hoặc tải ảnh phiếu mua hàng (Bách Hóa Xanh, WinMart, Co.opmart, Chợ...), AI sẽ tự động trích xuất tên, số lượng, giá và gợi ý hạn sử dụng.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden inputs */}
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange} 
        />
        <input 
          ref={cameraInputRef} 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFileChange} 
        />

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          {!selectedImage ? (
            /* Upload & Camera Buttons */
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center min-h-[260px]">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-800 text-base mb-1">
                Tải ảnh hoặc chụp hóa đơn mua sắm
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6">
                Hỗ trợ ảnh chụp rõ nét từ hóa đơn in nhiệt, phiếu tính tiền siêu thị hoặc phiếu mua đồ ở chợ.
              </p>

              <div className="flex flex-wrap gap-3 justify-center">
                <Button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Tải ảnh từ máy
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => cameraInputRef.current?.click()}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm"
                >
                  <Camera className="w-4 h-4 mr-2 text-emerald-600" />
                  Mở máy ảnh chụp
                </Button>
              </div>
            </div>
          ) : (
            /* Preview & Scanning Process */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Preview with Laser animation */}
              <div className="relative rounded-xl border border-slate-200 bg-black/5 overflow-hidden flex items-center justify-center min-h-[280px] max-h-[380px]">
                <img 
                  src={selectedImage} 
                  alt="Receipt Preview" 
                  className="w-full h-full object-contain max-h-[380px]" 
                />

                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center text-white">
                    {/* Laser Scanner Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce" />
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-2 drop-shadow" />
                    <span className="text-sm font-semibold tracking-wide drop-shadow">AI đang đọc hóa đơn...</span>
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={handleReset} 
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"
                  title="Chọn ảnh khác"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scanned Items Results Preview */}
              <div className="flex flex-col border rounded-xl bg-slate-50/50 p-4 max-h-[380px] overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                      {isScanning ? (
                        <>Đang nhận diện...</>
                      ) : scannedResult ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          {scannedResult.items.length} món tìm thấy
                        </>
                      ) : (
                        <>Chờ kết quả</>
                      )}
                    </h4>
                    {scannedResult?.merchant && (
                      <p className="text-xs text-slate-500 font-medium">🏪 {scannedResult.merchant}</p>
                    )}
                  </div>

                  {!isScanning && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleScanImage(selectedImage)}
                      className="text-xs text-slate-600 h-8"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Quét lại
                    </Button>
                  )}
                </div>

                {errorMessage && (
                  <div className="my-auto p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Lỗi nhận diện</p>
                      <p className="leading-relaxed">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {scannedResult && scannedResult.items.length > 0 && (
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-2 my-1 space-y-1">
                    {scannedResult.items.map((item, idx) => (
                      <div key={idx} className="pt-1.5 pb-1.5 flex items-center justify-between text-xs">
                        <div className="flex-1 pr-2 truncate">
                          <p className="font-medium text-slate-800 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="bg-slate-200/80 px-1.5 py-0.5 rounded font-medium text-slate-700">
                              SL: {item.stock}
                            </span>
                            {item.category_name && (
                              <span className="text-emerald-700 font-medium">{item.category_name}</span>
                            )}
                            {item.expiry_date && (
                              <span className="text-amber-700">HSD: {item.expiry_date}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-semibold text-slate-900">
                            {item.price ? `${item.price.toLocaleString('vi-VN')}đ` : '0đ'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isScanning && (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span>Đang bóc tách từng dòng sản phẩm...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex flex-row items-center justify-between">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-slate-600"
          >
            Đóng
          </Button>

          {scannedResult && scannedResult.items.length > 0 && (
            <Button 
              type="button" 
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Đổ vào danh sách nhập hàng ({scannedResult.items.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
