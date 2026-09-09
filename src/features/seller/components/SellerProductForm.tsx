'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Loader2, 
  Image as ImageIcon, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Category } from '@/types/category.type'
import { Product } from '@/types/product.type'
import { sellerProductSchema, SellerProductInput } from '@/schemas/seller-product.schema'
import { createSellerProductAction, updateSellerProductAction } from '@/actions/seller-product.actions'
import { uploadSellerProductImage } from '@/lib/storage/seller-image-upload'
import { generateProductImageAction } from '@/actions/admin/image.actions'
import { ImageCandidate, VisualVerificationStatus } from '@/lib/images/types'
import { SmartImage } from '@/components/ui/smart-image'
import { toast } from 'sonner'

interface SellerProductFormProps {
  categories: Category[]
  initialData?: Product | null
}

export function SellerProductForm({ categories, initialData }: SellerProductFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [priceMode, setPriceMode] = useState<'unit' | 'total'>('unit')

  // Candidates UI state (matching Admin ProductForm)
  const [candidateSessionId, setCandidateSessionId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ImageCandidate[]>([])
  const [verificationStatus, setVerificationStatus] = useState<VisualVerificationStatus | null>(null)

  // Race condition & session tracking
  const requestIdRef = useRef<number>(0)
  const formSessionIdRef = useRef<string>(crypto.randomUUID())

  const isEdit = Boolean(initialData)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(sellerProductSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      category_id: initialData?.category_id || '',
      price: initialData?.price || ('' as any),
      sale_price: initialData?.sale_price || null,
      stock: initialData?.stock ?? ('' as any),
      image_url: initialData?.image_url || '',
      images: initialData?.images || [],
      listing_status: (initialData?.listing_status as any) || 'active',
      variants: initialData?.variants?.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku || '',
        price: v.price || null,
        stock: v.stock,
        is_active: v.is_active,
      })) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  })

  const currentImageUrl = watch('image_url')
  const productName = watch('name')

  // Direct Supabase Storage File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const res = await uploadSellerProductImage(file)
      if (res.success && res.url) {
        setValue('image_url', res.url, { shouldValidate: true })
        setCandidates([])
        setCandidateSessionId(null)
        toast.success('Đã tải ảnh sản phẩm lên thành công!')
      } else {
        toast.error(res.error || 'Lỗi tải ảnh')
      }
    } finally {
      setUploadingImage(false)
    }
  }

  // Auto-generate image from name / fetch suggestions (debounced with requestId race-condition guard)
  useEffect(() => {
    if (productName && productName.trim().length >= 2) {
      const currentRequestId = ++requestIdRef.current

      const timer = setTimeout(async () => {
        setIsGeneratingImage(true)
        setImageError(null)
        try {
          const res = await generateProductImageAction(
            productName, 
            initialData?.id, 
            formSessionIdRef.current, 
            false
          )

          if (currentRequestId !== requestIdRef.current) return

          const list = (res.candidates && res.candidates.length > 0)
            ? res.candidates
            : (res.url ? [{ id: 'cand-auto', url: res.url, thumbnailUrl: res.url, metadataScore: 90, provider: 'auto' }] : [])

          if (res.status === 'auto_selected' && res.url) {
            if (!watch('image_url')) {
              setValue('image_url', res.url, { shouldValidate: true })
            }
            setCandidates(list)
            setCandidateSessionId(null)
          } else if (res.status === 'manual_selection_required') {
            setCandidateSessionId(res.candidateSessionId)
            setCandidates(list)
            setVerificationStatus(res.verificationStatus)
            setImageError(res.reason)

            if (list.length > 0 && !watch('image_url')) {
              setValue('image_url', list[0].url, { shouldValidate: true })
            }
          } else if (res.status === 'not_found') {
            setCandidates([])
            setCandidateSessionId(null)
            setVerificationStatus(res.verificationStatus)
            setImageError(res.reason)
          } else if (res.status === 'error') {
            setImageError(res.message)
          }
        } catch (e) {
          console.error(e)
        } finally {
          if (currentRequestId === requestIdRef.current) {
            setIsGeneratingImage(false)
          }
        }
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [productName, initialData, setValue, watch])

  const handleGenerateImage = async (bypassCache: boolean = false) => {
    if (!productName || productName.trim().length < 2) {
      toast.error('Vui lòng nhập tên sản phẩm trước (ít nhất 2 ký tự)')
      return
    }

    const currentRequestId = ++requestIdRef.current
    setIsGeneratingImage(true)
    setImageError(null)

    try {
      const currentUrl = watch('image_url')
      const excludeUrl = bypassCache && currentUrl ? currentUrl : undefined

      const res = await generateProductImageAction(
        productName,
        initialData?.id,
        formSessionIdRef.current,
        bypassCache,
        excludeUrl,
        candidateSessionId
      )

      if (currentRequestId !== requestIdRef.current) return

      const list = (res.candidates && res.candidates.length > 0)
        ? res.candidates
        : (res.url ? [{ id: 'cand-auto', url: res.url, thumbnailUrl: res.url, metadataScore: 90, provider: 'auto' }] : [])

      if (res.status === 'auto_selected' && res.url) {
        setValue('image_url', res.url, { shouldValidate: true })
        setCandidates(list)
        setCandidateSessionId(null)
        toast.success('Đã gợi ý hình ảnh phù hợp')
      } else if (res.status === 'manual_selection_required') {
        setCandidateSessionId(res.candidateSessionId)
        setCandidates(list)
        setVerificationStatus(res.verificationStatus)
        setImageError(res.reason)

        if (list.length > 0) {
          setValue('image_url', list[0].url, { shouldValidate: true })
          toast.success(`Đã tìm thấy ${list.length} gợi ý ảnh phù hợp`)
        } else {
          toast.info('Vui lòng chọn 1 trong các ảnh gợi ý bên dưới')
        }
      } else if (res.status === 'not_found') {
        setCandidates([])
        setCandidateSessionId(null)
        setVerificationStatus(res.verificationStatus)
        setImageError(res.reason)
        toast.error(res.reason)
      } else if (res.status === 'error') {
        setImageError(res.message)
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi khi tìm ảnh')
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsGeneratingImage(false)
      }
    }
  }

  const handleSelectCandidate = (candidate: ImageCandidate) => {
    setValue('image_url', candidate.url, { shouldValidate: true })
    toast.success('Đã chọn hình ảnh sản phẩm')
  }

  const handleRefreshPreview = () => {
    const current = watch('image_url')
    if (current) {
      setValue('image_url', '')
      setTimeout(() => setValue('image_url', current), 50)
    }
  }

  const onSubmit = async (data: SellerProductInput) => {
    setSubmitting(true)
    try {
      const submissionData = { ...data }
      if (priceMode === 'total' && submissionData.stock > 0) {
        submissionData.price = Math.round(submissionData.price / submissionData.stock)
        if (submissionData.sale_price) {
          submissionData.sale_price = Math.round(submissionData.sale_price / submissionData.stock)
        }
      }

      if (isEdit && initialData) {
        const res = await updateSellerProductAction(initialData.id, submissionData)
        if (res.success) {
          toast.success('Đã cập nhật sản phẩm thành công!')
          router.push('/tai-khoan/san-pham-cua-toi')
          router.refresh()
        } else {
          toast.error(res.error || 'Không thể cập nhật sản phẩm')
        }
      } else {
        const res = await createSellerProductAction(submissionData)
        if (res.success) {
          toast.success('Đã đăng bán sản phẩm thành công!')
          router.push('/tai-khoan/san-pham-cua-toi')
          router.refresh()
        } else {
          toast.error(res.error || 'Không thể đăng bán sản phẩm')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/tai-khoan/san-pham-cua-toi">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isEdit ? 'Chỉnh sửa sản phẩm đăng bán' : 'Đăng bán sản phẩm mới'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Sản phẩm của bạn sẽ xuất hiện công khai trên sàn ngay lập tức</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Thông tin cơ bản</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" className="font-semibold text-slate-700">Tên sản phẩm *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="VD: Cà chua sạch Đà Lạt 1kg"
                className="rounded-xl"
              />
              {errors.name?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.name.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id" className="font-semibold text-slate-700">Danh mục sản phẩm <span className="text-red-500">*</span></Label>
              <select
                id="category_id"
                {...register('category_id')}
                className={`w-full h-10 px-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${errors.category_id ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'}`}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.category_id.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing_status" className="font-semibold text-slate-700">Trạng thái đăng</Label>
              <select
                id="listing_status"
                {...register('listing_status')}
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="active">Đăng bán ngay (Công khai)</option>
                <option value="draft">Lưu bản nháp (Chưa bán)</option>
                <option value="paused">Tạm dừng bán</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold text-slate-700">Mô tả sản phẩm</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={4}
              placeholder="Mô tả nguồn gốc, chất lượng, cách bảo quản..."
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Giá bán & Tồn kho</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-3 mb-2 flex gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="priceMode" value="unit" checked={priceMode === 'unit'} onChange={() => setPriceMode('unit')} className="text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                <span className="font-semibold text-slate-700">Giá bán 1 sản phẩm (Giá gốc)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="priceMode" value="total" checked={priceMode === 'total'} onChange={() => setPriceMode('total')} className="text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                <span className="font-semibold text-slate-700">Tổng giá lô hàng (Giá chia)</span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="font-semibold text-slate-700">
                {priceMode === 'unit' ? 'Giá bán (VNĐ) *' : 'Tổng giá bán (VNĐ) *'}
              </Label>
              <Controller
                control={control}
                name="price"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <Input
                    id="price"
                    type="text"
                    placeholder="100.000"
                    className="rounded-xl"
                    value={value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '')
                      if (/^\d*$/.test(rawValue)) {
                        onChange(rawValue ? Number(rawValue) : undefined)
                      }
                    }}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
              {errors.price?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.price.message)}</p>}
              {priceMode === 'total' && Number(watch('price')) > 0 && Number(watch('stock')) > 0 && (
                <p className="text-xs text-blue-600 font-medium">
                  =&gt; Giá 1 SP: <span className="font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(watch('price')) / Number(watch('stock')))}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_price" className="font-semibold text-slate-700">
                {priceMode === 'unit' ? 'Giá khuyến mãi (Nếu có)' : 'Tổng KM (Nếu có)'}
              </Label>
              <Controller
                control={control}
                name="sale_price"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <Input
                    id="sale_price"
                    type="text"
                    placeholder="80.000"
                    className="rounded-xl"
                    value={value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '')
                      if (/^\d*$/.test(rawValue)) {
                        onChange(rawValue ? Number(rawValue) : null)
                      }
                    }}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
              {errors.sale_price?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.sale_price.message)}</p>}
              {priceMode === 'total' && watch('sale_price') > 0 && watch('stock') > 0 && (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  =&gt; KM 1 SP: <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(Math.round(watch('sale_price') / watch('stock')))}đ</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="font-semibold text-slate-700">Số lượng tồn kho *</Label>
              <Input
                id="stock"
                type="number"
                {...register('stock', { setValueAs: v => v === '' ? undefined : Number(v) })}
                placeholder="10"
                className="rounded-xl"
              />
              {errors.stock?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.stock.message)}</p>}
            </div>
          </div>
        </div>

        {/* Image Upload & Suggestion Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Hình ảnh sản phẩm</h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-36 h-36 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative shrink-0 flex items-center justify-center group">
              {isGeneratingImage ? (
                <div className="flex flex-col items-center gap-2 text-slate-400 p-2 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-[11px] font-medium">Đang tìm ảnh...</span>
                </div>
              ) : currentImageUrl ? (
                <div className="relative w-full h-full">
                  <SmartImage src={currentImageUrl} alt="Xem trước ảnh" fill className="object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-1.5 right-1.5 opacity-80 hover:opacity-100 h-6 px-1.5 text-[10px] rounded-lg shadow-sm"
                    onClick={handleRefreshPreview}
                    title="Làm mới ảnh xem trước"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Làm mới
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400 p-3 text-center">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <span className="text-[10px] text-slate-400 mt-1 block">Chưa có ảnh</span>
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={() => handleGenerateImage(true)} 
                    className="mt-1 h-auto p-0 text-xs text-emerald-600 font-semibold"
                  >
                    Tự động tìm ảnh
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1 w-full">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all">
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải ảnh...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" /> Tải ảnh từ thiết bị
                    </>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="hidden" disabled={uploadingImage} />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateImage(false)}
                  disabled={isGeneratingImage}
                  className="rounded-xl text-xs cursor-pointer border-slate-200 hover:bg-slate-50"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-600" /> Đang tìm ảnh...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-amber-500" /> Tự động gợi ý ảnh
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-slate-500">Chấp nhận ảnh JPG, PNG, WEBP tối đa 5MB hoặc chọn gợi ý ảnh tự động từ hệ thống.</p>
              
              <Input
                {...register('image_url')}
                placeholder="Hoặc dán URL đường dẫn ảnh trực tiếp..."
                className="rounded-xl text-xs"
                onChange={(e) => {
                  setValue('image_url', e.target.value)
                  setCandidates([])
                  setCandidateSessionId(null)
                }}
              />
            </div>
          </div>

          {/* Manual Selection Candidate Grid (Top 5 / Gợi ý ảnh) */}
          {candidates.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-800 text-sm">
                  Gợi ý hình ảnh (Top {candidates.length}):
                </Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleGenerateImage(true)}
                  disabled={isGeneratingImage}
                  className="text-xs text-slate-600 hover:text-emerald-600 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isGeneratingImage ? 'animate-spin' : ''}`} /> Thử tìm lại
                </Button>
              </div>

              {verificationStatus === 'not_available' && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Chưa cấu hình kiểm tra hình ảnh bằng AI. Vui lòng chọn ảnh thủ công bên dưới.</span>
                </div>
              )}

              {imageError && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{imageError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {candidates.map((cand) => {
                  const isSelected = watch('image_url') === cand.url
                  return (
                    <div
                      key={cand.id}
                      className={`border rounded-xl p-2.5 flex flex-col justify-between space-y-2 transition shadow-sm ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="relative h-32 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100">
                        <img
                          src={cand.thumbnailUrl || cand.url}
                          alt="Candidate"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.png'
                          }}
                        />
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                            ✓ Đang chọn
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Điểm metadata:</span>
                          <span className="font-semibold text-slate-800">{cand.metadataScore}/100</span>
                        </div>

                        {cand.visualScore !== undefined && (
                          <div className="flex justify-between text-blue-600">
                            <span>Độ phù hợp do AI đánh giá:</span>
                            <span className="font-semibold">{cand.visualScore}/100</span>
                          </div>
                        )}

                        {cand.sourcePageUrl && (
                          <a
                            href={cand.sourcePageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-slate-400 hover:text-emerald-600 hover:underline flex items-center gap-1 truncate max-w-full"
                          >
                            Nguồn: Pexels <ExternalLink className="w-2.5 h-2.5 inline" />
                          </a>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "outline" : "default"}
                        className={`w-full text-xs font-semibold rounded-lg cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                        onClick={() => handleSelectCandidate(cand)}
                        disabled={isSelected}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Đang sử dụng
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Chọn ảnh này
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Variants Card (Optional) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Phân loại sản phẩm (Tùy chọn)</h2>
              <p className="text-xs text-slate-500">Thêm biến thể như Size, Màu sắc, Dung lượng...</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', price: null, stock: 10, is_active: true })}
              className="rounded-xl text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm biến thể
            </Button>
          </div>

          {fields.length > 0 && (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex-1 min-w-[150px]">
                    <Input
                      {...register(`variants.${index}.name`)}
                      placeholder="VD: Màu Đen / Size L"
                      className="rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="w-28">
                    <Controller
                      control={control}
                      name={`variants.${index}.price`}
                      render={({ field: { onChange, onBlur, value, ref } }) => (
                        <Input
                          type="text"
                          placeholder="Giá riêng"
                          className="rounded-lg text-xs bg-white"
                          value={value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\./g, '')
                            if (/^\d*$/.test(rawValue)) {
                              onChange(rawValue ? Number(rawValue) : null)
                            }
                          }}
                          onBlur={onBlur}
                          ref={ref}
                        />
                      )}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      {...register(`variants.${index}.stock`, { setValueAs: v => v === '' ? 0 : Number(v) })}
                      placeholder="Tồn kho"
                      className="rounded-lg text-xs bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/tai-khoan/san-pham-cua-toi">
            <Button type="button" variant="outline" className="rounded-xl px-6 cursor-pointer" disabled={submitting}>
              Hủy
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-semibold shadow-sm cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...
              </>
            ) : isEdit ? (
              'Cập nhật sản phẩm'
            ) : (
              'Đăng bán ngay'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
